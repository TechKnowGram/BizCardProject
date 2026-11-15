"""One Illustrator path drawn as a small SVG, so shapes stay vector (sharp at any zoom) instead of becoming a picture.

Reads the path straight from the file through pdfium: its segments, fill, stroke and clipping shape. Anything this
cannot express (patterns, gradients, soft masks) returns None and the caller draws that object as a picture instead.
"""

from __future__ import annotations

import ctypes
import math

SEGMENT_LINE, SEGMENT_BEZIER, SEGMENT_MOVE = 0, 1, 2
ARTBOARD_CLIP = 0.97


def _n(value: float) -> str:
    text = f'{value:.3f}'.rstrip('0').rstrip('.')
    return text if text not in ('', '-0') else '0'


def _color(raw, getter, obj) -> tuple[str, float] | None:
    red, green, blue, alpha = (ctypes.c_uint() for _ in range(4))
    if not getter(obj, red, green, blue, alpha):
        return None
    return f'rgb({red.value},{green.value},{blue.value})', alpha.value / 255


def _segments(raw, count: int, segment_at, transform) -> str:
    """Path data from pdfium segments; `transform(x, y)` maps a point into the SVG's own coordinates."""
    data: list[str] = []
    curve: list[tuple[float, float]] = []
    for i in range(count):
        segment = segment_at(i)
        kind = raw.FPDFPathSegment_GetType(segment)
        x, y = ctypes.c_float(), ctypes.c_float()
        raw.FPDFPathSegment_GetPoint(segment, x, y)
        px, py = transform(x.value, y.value)
        if kind == SEGMENT_MOVE:
            data.append(f'M{_n(px)} {_n(py)}')
        elif kind == SEGMENT_LINE:
            data.append(f'L{_n(px)} {_n(py)}')
        elif kind == SEGMENT_BEZIER:
            curve.append((px, py))
            if len(curve) == 3:
                data.append('C' + ' '.join(f'{_n(a)} {_n(b)}' for a, b in curve))
                curve = []
        if raw.FPDFPathSegment_GetClose(segment):
            data.append('Z')
    return ''.join(data)


def _clips(raw, obj, page_w: float, page_h: float, transform) -> list[str]:
    """The shapes the object is drawn through (not counting a clip that only trims to the artboard), as path data."""
    clip = raw.FPDFPageObj_GetClipPath(obj.raw)
    if not clip:
        return []
    out = []
    for i in range(raw.FPDFClipPath_CountPaths(clip)):
        count = raw.FPDFClipPath_CountPathSegments(clip, i)
        if not count:
            continue
        xs, ys = [], []
        for j in range(count):
            x, y = ctypes.c_float(), ctypes.c_float()
            raw.FPDFPathSegment_GetPoint(raw.FPDFClipPath_GetPathSegment(clip, i, j), x, y)
            xs.append(x.value)
            ys.append(y.value)
        if (max(xs) - min(xs)) >= ARTBOARD_CLIP * page_w and (max(ys) - min(ys)) >= ARTBOARD_CLIP * page_h:
            continue
        out.append(_segments(raw, count, lambda j, i=i: raw.FPDFClipPath_GetPathSegment(clip, i, j), transform))
    return out


def path_to_svg(raw, obj, page_w: float, page_h: float) -> tuple[str, tuple[float, float, float, float]] | None:
    """Returns (svg text, (left, bottom, right, top) of the part on the artboard, in points), or None."""
    path = obj.raw
    count = raw.FPDFPath_CountSegments(path)
    if count < 2:
        return None
    left, bottom, right, top = obj.get_bounds()
    left, bottom, right, top = max(0.0, left), max(0.0, bottom), min(page_w, right), min(page_h, top)
    if right <= left or top <= bottom:
        return None

    fill_mode, stroke_on = ctypes.c_int(), ctypes.c_int()
    raw.FPDFPath_GetDrawMode(path, fill_mode, stroke_on)
    fill = _color(raw, raw.FPDFPageObj_GetFillColor, obj.raw) if fill_mode.value else None
    stroke = _color(raw, raw.FPDFPageObj_GetStrokeColor, obj.raw) if stroke_on.value else None
    if fill is None and stroke is None:
        return None

    matrix = obj.get_matrix()
    scale = math.sqrt(abs(matrix.a * matrix.d - matrix.b * matrix.c)) or 1.0

    def to_svg(x: float, y: float) -> tuple[float, float]:
        page_x = matrix.a * x + matrix.c * y + matrix.e
        page_y = matrix.b * x + matrix.d * y + matrix.f
        return page_x - left, top - page_y

    def page_to_svg(x: float, y: float) -> tuple[float, float]:
        return x - left, top - y

    data = _segments(raw, count, lambda i: raw.FPDFPath_GetPathSegment(path, i), to_svg)
    if not data:
        return None

    attributes = [f'd="{data}"']
    if fill:
        attributes.append(f'fill="{fill[0]}"')
        if fill[1] < 1:
            attributes.append(f'fill-opacity="{_n(fill[1])}"')
        if fill_mode.value == 1:
            attributes.append('fill-rule="evenodd"')
    else:
        attributes.append('fill="none"')
    if stroke:
        width = ctypes.c_float()
        raw.FPDFPageObj_GetStrokeWidth(path, width)
        attributes.append(f'stroke="{stroke[0]}" stroke-width="{_n(width.value * scale)}"')
        if stroke[1] < 1:
            attributes.append(f'stroke-opacity="{_n(stroke[1])}"')
        attributes.append('stroke-linecap="' + {0: 'butt', 1: 'round', 2: 'square'}.get(raw.FPDFPageObj_GetLineCap(path), 'butt') + '"')
        attributes.append('stroke-linejoin="' + {0: 'miter', 1: 'round', 2: 'bevel'}.get(raw.FPDFPageObj_GetLineJoin(path), 'miter') + '"')
        dashes = raw.FPDFPageObj_GetDashCount(path)
        if dashes > 0:
            array = (ctypes.c_float * dashes)()
            raw.FPDFPageObj_GetDashArray(path, array, dashes)
            attributes.append('stroke-dasharray="' + ' '.join(_n(v * scale) for v in array) + '"')

    body = f'<path {" ".join(attributes)}/>'
    definitions = ''
    for number, clip in enumerate(_clips(raw, obj, page_w, page_h, page_to_svg)):
        # A clip of several shapes means the intersection of them: one nested group per shape.
        definitions += f'<clipPath id="c{number}"><path d="{clip}" clip-rule="nonzero"/></clipPath>'
        body = f'<g clip-path="url(#c{number})">{body}</g>'

    width, height = right - left, top - bottom
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_n(width)} {_n(height)}" '
           f'width="{_n(width)}" height="{_n(height)}">' + (f'<defs>{definitions}</defs>' if definitions else '') + body + '</svg>')
    return svg, (left, bottom, right, top)
