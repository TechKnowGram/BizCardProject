"""Listing what an Illustrator artboard is made of: its layers, and in them the images, text and shapes.

The PDF copy inside an .ai file keeps every object separate and tags it with the Illustrator layer
it was on. This reads them back two ways:

* a tree like Illustrator's Layers panel: layer > group (a placed form) > clip group (objects drawn
  through the same clipping shape, such as a photo in a circle) > objects, topmost first
* flat lists by kind: text (the words, size, colour, weight), images (pixel size and a thumbnail)
  and shapes (rectangle, ellipse, line, path, gradient, with fill and stroke colours)

Names follow Illustrator's own: <Image>, <Rectangle>, <Ellipse>, <Path>, <Group>, <Clip Group>, and
text is named by its words. The PDF does not keep guides, plain groups or names a designer typed
into the Layers panel, so those cannot be shown.

Positions are fractions of the artboard (0..1, from the top-left), so the browser can outline an
object on the preview at any size.
"""

from __future__ import annotations

import ctypes
import io
import math
from dataclasses import dataclass, field

from app.services import illustrator
from app.services.illustrator_vector import _join_lines, _text_of, looks_garbled, ocr_text_boxes

MAX_THUMBNAILS = 24
THUMBNAIL_LONG_SIDE = 220
MAX_OBJECTS = 1500
DEFAULT_LAYER = 'Layer 1'
# A clip that covers (nearly) the whole artboard only trims to the artboard; it is not a design object.
ARTBOARD_CLIP = 0.97

# pdfium path segment types
SEGMENT_LINE, SEGMENT_BEZIER, SEGMENT_MOVE = 0, 1, 2

SHAPE_NAMES = {'rectangle': '<Rectangle>', 'polygon': '<Polygon>', 'ellipse': '<Ellipse>', 'curve': '<Path>',
               'line': '<Line>', 'path': '<Path>', 'gradient': '<Gradient>', 'shape': '<Path>'}


@dataclass
class LayerReport:
    artboard: dict
    layers: list[dict] = field(default_factory=list)
    images: list[dict] = field(default_factory=list)
    texts: list[dict] = field(default_factory=list)
    shapes: list[dict] = field(default_factory=list)
    tree: list[dict] = field(default_factory=list)
    truncated: bool = False


def _hex(red: int, green: int, blue: int) -> str:
    return f'#{red:02x}{green:02x}{blue:02x}'


def _mark_layer_name(raw, obj) -> str | None:
    """The Illustrator layer an object belongs to, from its optional-content mark."""
    for i in range(raw.FPDFPageObj_CountMarks(obj.raw)):
        mark = raw.FPDFPageObj_GetMark(obj.raw, i)
        name_buffer = (ctypes.c_ushort * 32)()
        name_length = ctypes.c_ulong()
        raw.FPDFPageObjMark_GetName(mark, name_buffer, 32, name_length)
        if bytes(name_buffer)[:max(0, name_length.value - 2)].decode('utf-16-le', errors='ignore') != 'OC':
            continue
        value_buffer = (ctypes.c_ushort * 128)()
        value_length = ctypes.c_ulong()
        if raw.FPDFPageObjMark_GetParamStringValue(mark, b'Name', value_buffer, 128, value_length):
            text = bytes(value_buffer)[:max(0, value_length.value - 2)].decode('utf-16-le', errors='ignore').strip()
            if text:
                return text
    return None


def _box(obj, page_w: float, page_h: float) -> tuple[float, float, float, float] | None:
    """The part of the object that lies on the artboard, as fractions from the top-left."""
    left, bottom, right, top = obj.get_bounds()
    left, bottom, right, top = max(0.0, left), max(0.0, bottom), min(page_w, right), min(page_h, top)
    if right <= left or top <= bottom:
        return None
    return (round(left / page_w, 4), round((page_h - top) / page_h, 4),
            round((right - left) / page_w, 4), round((top - bottom) / page_h, 4))


def _clip_signature(raw, obj, page_w: float, page_h: float) -> tuple:
    """The clipping shapes an object is drawn through, as comparable tuples (box in points, segment count).

    Clips that only trim to the artboard are left out.
    """
    clip = raw.FPDFPageObj_GetClipPath(obj.raw)
    if not clip:
        return ()
    shapes = []
    for i in range(raw.FPDFClipPath_CountPaths(clip)):
        count = raw.FPDFClipPath_CountPathSegments(clip, i)
        xs, ys = [], []
        for j in range(count):
            segment = raw.FPDFClipPath_GetPathSegment(clip, i, j)
            x, y = ctypes.c_float(), ctypes.c_float()
            raw.FPDFPathSegment_GetPoint(segment, x, y)
            xs.append(x.value)
            ys.append(y.value)
        if not xs:
            continue
        left, right, bottom, top = min(xs), max(xs), min(ys), max(ys)
        if (right - left) >= ARTBOARD_CLIP * page_w and (top - bottom) >= ARTBOARD_CLIP * page_h:
            continue
        shapes.append((round(left, 1), round(bottom, 1), round(right, 1), round(top, 1), count))
    return tuple(shapes)


def _shape_kind(raw, obj, width: float, height: float) -> str:
    count = raw.FPDFPath_CountSegments(obj.raw)
    lines = beziers = 0
    points: list[tuple[float, float]] = []
    for i in range(count):
        segment = raw.FPDFPath_GetPathSegment(obj.raw, i)
        kind = raw.FPDFPathSegment_GetType(segment)
        x, y = ctypes.c_float(), ctypes.c_float()
        raw.FPDFPathSegment_GetPoint(segment, x, y)
        if kind == SEGMENT_LINE:
            lines += 1
            points.append((x.value, y.value))
        elif kind == SEGMENT_BEZIER:
            beziers += 1
        elif kind == SEGMENT_MOVE:
            points.append((x.value, y.value))
    thin = min(width, height) < 0.35
    if thin and beziers == 0 and lines <= 2:
        return 'line'
    if beziers == 0 and 3 <= lines <= 5 and len(points) >= 4:
        axis_aligned = all(abs(a[0] - b[0]) < 0.01 or abs(a[1] - b[1]) < 0.01 for a, b in zip(points, points[1:] + points[:1]))
        return 'rectangle' if axis_aligned else 'polygon'
    # Four curves and nothing else is how Illustrator stores a circle or an ellipse.
    if 4 <= beziers <= 8 and lines <= 1:
        return 'ellipse' if abs(math.log(max(width, 1e-6) / max(height, 1e-6))) < 1.2 and beziers <= 5 else 'curve'
    return 'path' if count > 0 else 'shape'


def _clip_node(signature: tuple, page_w: float, page_h: float, counter: list[int]) -> dict:
    left, bottom, right, top, segments = signature
    kind = 'ellipse' if segments >= 8 else 'rectangle' if segments <= 5 else 'path'
    counter[0] += 1
    return {'id': counter[0], 'kind': 'shape', 'name': SHAPE_NAMES[kind], 'shape_kind': kind, 'clip_shape': True,
            'x': round(left / page_w, 4), 'y': round((page_h - top) / page_h, 4),
            'w': round((right - left) / page_w, 4), 'h': round((top - bottom) / page_h, 4), 'children': []}


def _union(nodes: list[dict]) -> tuple[float, float, float, float] | None:
    boxes = [(n['x'], n['y'], n['x'] + n['w'], n['y'] + n['h']) for n in nodes if n.get('w') is not None]
    if not boxes:
        return None
    left, top = min(b[0] for b in boxes), min(b[1] for b in boxes)
    right, bottom = max(b[2] for b in boxes), max(b[3] for b in boxes)
    return round(left, 4), round(top, 4), round(right - left, 4), round(bottom - top, 4)


def _merge_text_runs(children: list[dict], page_w: float, page_h: float, counter: list[int]) -> list[dict]:
    """Illustrator keeps a line as one object per word; join runs of neighbouring text into whole lines."""
    out: list[dict] = []
    run: list[dict] = []

    def flush() -> None:
        if not run:
            return
        for line in _join_lines([node['_piece'] for node in run]):
            counter[0] += 1
            left, bottom = max(0.0, line['l']), max(0.0, line['b'])
            right, top = min(page_w, line['r']), min(page_h, line['t'])
            out.append({'id': counter[0], 'kind': 'text', 'name': line['text'], 'text': line['text'], 'size_pt': round(line['size'], 1),
                        'color': line['color'], 'bold': line['bold'],
                        'x': round(left / page_w, 4), 'y': round((page_h - top) / page_h, 4),
                        'w': round(max(0.0, right - left) / page_w, 4), 'h': round(max(0.0, top - bottom) / page_h, 4),
                        'clip': run[0].get('clip', ()), 'children': []})
        run.clear()

    for node in children:
        if node['kind'] == 'text' and '_piece' in node:
            run.append(node)
        else:
            flush()
            out.append(node)
    flush()
    return out


def _group_clips(children: list[dict], depth: int, page_w: float, page_h: float, counter: list[int]) -> list[dict]:
    """Objects drawn through the same clipping shape become a Clip Group, as in Illustrator."""
    out: list[dict] = []
    i = 0
    while i < len(children):
        node = children[i]
        clip = node.get('clip', ())
        if len(clip) <= depth:
            out.append(node)
            i += 1
            continue
        j = i
        while j < len(children) and len(children[j].get('clip', ())) > depth and children[j]['clip'][depth] == clip[depth]:
            j += 1
        inner = _group_clips(children[i:j], depth + 1, page_w, page_h, counter)
        shape = _clip_node(clip[depth], page_w, page_h, counter)
        counter[0] += 1
        out.append({'id': counter[0], 'kind': 'clip', 'name': '<Clip Group>', 'children': [shape, *inner],
                    'x': shape['x'], 'y': shape['y'], 'w': shape['w'], 'h': shape['h'], 'clip': clip[:depth]})
        i = j
    return out


def _finish(nodes: list[dict], page_w: float, page_h: float, counter: list[int]) -> list[dict]:
    """Merge neighbouring text into lines and group objects that share a clipping shape."""
    for node in nodes:
        if node['children']:
            node['children'] = _finish(node['children'], page_w, page_h, counter)
    merged = _merge_text_runs(nodes, page_w, page_h, counter)
    grouped = _group_clips(merged, 0, page_w, page_h, counter)
    for node in grouped:
        if node['kind'] == 'group' and node['children']:
            box = _union(node['children'])
            if box:
                node['x'], node['y'], node['w'], node['h'] = box
    return grouped


def _polish(nodes: list[dict]) -> list[dict]:
    """List topmost first (the way Illustrator's panel does) and drop the working fields."""
    out = []
    for node in reversed(nodes):
        node.pop('_piece', None)
        node.pop('clip', None)
        children = node['children']
        if node['kind'] == 'clip' and children:
            # the clipping shape stays first, the clipped objects follow topmost first
            node['children'] = [children[0], *_polish(children[1:])]
        else:
            node['children'] = _polish(children)
        out.append(node)
    return out


def _count_leaves(node: dict) -> int:
    if not node['children']:
        return 0 if node['kind'] in ('group', 'clip', 'layer') else 1
    return sum(_count_leaves(child) for child in node['children'])


def _text_nodes(nodes: list[dict]):
    for node in nodes:
        if node['kind'] == 'text':
            yield node
        yield from _text_nodes(node['children'])


def _read_garbled_words(page, page_w: float, page_h: float, report: LayerReport) -> None:
    """Text stored in a custom font encoding comes out as control characters; read those boxes by OCR."""
    targets = [item for item in [*report.texts, *_text_nodes(report.tree)] if looks_garbled(item['text'])]
    if not targets:
        return
    unique: dict[tuple, tuple] = {}
    for item in targets:
        key = (item['x'], item['y'], item['w'], item['h'])
        left, right = item['x'] * page_w, (item['x'] + item['w']) * page_w
        top, bottom = page_h - item['y'] * page_h, page_h - (item['y'] + item['h']) * page_h
        unique[key] = (left, bottom, right, top)
    keys = list(unique)
    words = dict(zip(keys, ocr_text_boxes(page, [unique[k] for k in keys])))
    for item in targets:
        text = words.get((item['x'], item['y'], item['w'], item['h'])) or '(text)'
        item['text'] = text
        if 'name' in item:
            item['name'] = text


def read_layers(content: bytes, index: int, save_thumbnail) -> LayerReport:
    """`save_thumbnail(jpeg_bytes, n)` stores an image's thumbnail and returns the name it can be fetched by."""
    import pypdfium2.raw as raw

    document = illustrator._open(content)
    try:
        if not 0 <= index < len(document):
            raise illustrator.IllustratorError('That artboard does not exist')
        page = document[index]
        page_w, page_h = page.get_size()
        report = LayerReport(artboard={'index': index, 'width_mm': round(page_w * 25.4 / 72, 1), 'height_mm': round(page_h * 25.4 / 72, 1)})
        textpage = page.get_textpage()

        counts: dict[str, dict[str, int]] = {}
        order: list[str] = []
        layer_at_depth: dict[int, str] = {}
        pieces: dict[str, list[dict]] = {}
        thumbs = 0
        layer_nodes: dict[str, dict] = {}
        containers: dict[int, list[dict]] = {}
        counter = [0]

        def node_base(kind: str, name: str, box, clip) -> dict:
            counter[0] += 1
            x, y, w, h = box
            return {'id': counter[0], 'kind': kind, 'name': name, 'x': x, 'y': y, 'w': w, 'h': h, 'clip': clip, 'children': []}

        for number, obj in enumerate(page.get_objects(max_depth=8)):
            if number >= MAX_OBJECTS:
                report.truncated = True
                break
            depth = getattr(obj, 'level', 0)
            layer = _mark_layer_name(raw, obj) or layer_at_depth.get(depth - 1) or DEFAULT_LAYER
            layer_at_depth[depth] = layer
            if layer not in layer_nodes:
                layer_nodes[layer] = {'id': -(len(layer_nodes) + 1), 'kind': 'layer', 'name': layer, 'children': [], 'x': None, 'y': None, 'w': None, 'h': None}
                counts[layer] = {'text': 0, 'image': 0, 'shape': 0}
                order.append(layer)
            if depth == 0:
                containers = {0: layer_nodes[layer]['children']}
            parent = containers.get(depth, layer_nodes[layer]['children'])

            box = _box(obj, page_w, page_h)
            if box is None:
                continue
            clip = _clip_signature(raw, obj, page_w, page_h)
            x, y, w, h = box
            base = {'id': number, 'layer': layer, 'x': x, 'y': y, 'w': w, 'h': h}

            if obj.type == raw.FPDF_PAGEOBJ_FORM:
                group = node_base('group', '<Group>', box, clip)
                parent.append(group)
                containers[depth + 1] = group['children']
                continue

            if obj.type == raw.FPDF_PAGEOBJ_TEXT:
                text = _text_of(raw, obj.raw, textpage.raw)
                if not text.strip():
                    continue
                left, bottom, right, top = obj.get_bounds()
                size_in = ctypes.c_float()
                raw.FPDFTextObj_GetFontSize(obj.raw, size_in)
                matrix = obj.get_matrix()
                red, green, blue, _ = (ctypes.c_uint() for _ in range(4))
                raw.FPDFPageObj_GetFillColor(obj.raw, red, green, blue, ctypes.c_uint())
                font = raw.FPDFTextObj_GetFont(obj.raw)
                piece = {
                    'obj': obj, 'text': text, 'l': left, 'b': bottom, 'r': right, 't': top,
                    'size': (size_in.value or 1.0) * math.hypot(matrix.a, matrix.b),
                    'color': _hex(red.value, green.value, blue.value), 'bold': raw.FPDFFont_GetWeight(font) >= 600}
                pieces.setdefault(layer, []).append(piece)
                leaf = node_base('text', text.strip(), box, clip)
                leaf['_piece'] = piece
                parent.append(leaf)

            elif obj.type == raw.FPDF_PAGEOBJ_IMAGE:
                item = {**base, 'width_px': None, 'height_px': None, 'thumbnail': None}
                try:
                    width_px, height_px = obj.get_px_size()
                    item['width_px'], item['height_px'] = int(width_px), int(height_px)
                except Exception:
                    pass
                if thumbs < MAX_THUMBNAILS:
                    try:
                        picture = obj.get_bitmap(render=False).to_pil()
                        if picture.mode in ('RGBA', 'LA', 'P'):
                            flat = picture.convert('RGBA')
                            backdrop = type(picture).new('RGB', flat.size, (255, 255, 255))
                            backdrop.paste(flat, mask=flat.split()[-1])
                            picture = backdrop
                        picture = picture.convert('RGB')
                        picture.thumbnail((THUMBNAIL_LONG_SIDE, THUMBNAIL_LONG_SIDE))
                        buffer = io.BytesIO()
                        picture.save(buffer, 'JPEG', quality=82)
                        item['thumbnail'] = save_thumbnail(buffer.getvalue(), thumbs)
                        thumbs += 1
                    except Exception:
                        pass
                report.images.append(item)
                counts[layer]['image'] += 1
                leaf = node_base('image', '<Image>', box, clip)
                leaf.update({'width_px': item['width_px'], 'height_px': item['height_px'], 'thumbnail': item['thumbnail']})
                parent.append(leaf)

            else:  # path or shading
                if obj.type == raw.FPDF_PAGEOBJ_SHADING:
                    kind, fill, stroke, stroke_width = 'gradient', None, None, 0.0
                else:
                    left, bottom, right, top = obj.get_bounds()
                    kind = _shape_kind(raw, obj, right - left, top - bottom)
                    fill_mode, stroke_on = ctypes.c_int(), ctypes.c_int()
                    raw.FPDFPath_GetDrawMode(obj.raw, fill_mode, stroke_on)
                    fill = stroke = None
                    red, green, blue, alpha = (ctypes.c_uint() for _ in range(4))
                    if fill_mode.value and raw.FPDFPageObj_GetFillColor(obj.raw, red, green, blue, alpha):
                        fill = _hex(red.value, green.value, blue.value)
                    width_pt = ctypes.c_float()
                    if stroke_on.value and raw.FPDFPageObj_GetStrokeColor(obj.raw, red, green, blue, alpha):
                        stroke = _hex(red.value, green.value, blue.value)
                        raw.FPDFPageObj_GetStrokeWidth(obj.raw, width_pt)
                    stroke_width = round(width_pt.value, 2)
                    if fill is None and stroke is None:
                        continue  # clipping paths and other invisible helpers
                report.shapes.append({**base, 'kind': kind, 'fill': fill, 'stroke': stroke, 'stroke_width': stroke_width})
                counts[layer]['shape'] += 1
                leaf = node_base('shape', SHAPE_NAMES.get(kind, '<Path>'), box, clip)
                leaf.update({'shape_kind': kind, 'fill': fill, 'stroke': stroke, 'stroke_width': stroke_width})
                parent.append(leaf)

        # Illustrator stores a line as one object per word or kerning run; give back whole lines.
        for layer, items in pieces.items():
            for line in _join_lines(items):
                left, bottom = max(0.0, line['l']), max(0.0, line['b'])
                right, top = min(page_w, line['r']), min(page_h, line['t'])
                if right <= left or top <= bottom:
                    continue
                report.texts.append({
                    'id': len(report.texts), 'layer': layer, 'text': line['text'], 'size_pt': round(line['size'], 1),
                    'color': line['color'], 'bold': line['bold'], 'x': round(left / page_w, 4), 'y': round((page_h - top) / page_h, 4),
                    'w': round((right - left) / page_w, 4), 'h': round((top - bottom) / page_h, 4)})
                counts[layer]['text'] += 1
        report.texts.sort(key=lambda t: (t['y'], t['x']))
        report.layers = [{'name': name, **counts[name]} for name in order]

        # The tree: each layer holds its objects, topmost first.
        for name in order:
            layer_node = layer_nodes[name]
            layer_node['children'] = _polish(_finish(layer_node['children'], page_w, page_h, counter))
            box = _union(layer_node['children'])
            if box:
                layer_node['x'], layer_node['y'], layer_node['w'], layer_node['h'] = box
            layer_node['count'] = sum(_count_leaves(child) for child in layer_node['children'])
            report.tree.append(layer_node)
        _read_garbled_words(page, page_w, page_h, report)
        return report
    finally:
        document.close()
