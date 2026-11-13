"""Machine-learning analysis of an uploaded business-card design.

Given a finished card image (for example exported from Photoshop with sample
text such as "John Doe", "Marketing Manager", "+880 ..."), this module finds
where each piece of employee information lives so new cards can be generated
from the same design:

1. Text detection + recognition with a deep-learning OCR model (PP-OCR via
   RapidOCR / ONNX Runtime).
2. Grouping of OCR lines into fields (multi-line names, addresses).
3. Role classification (name, title, phone, email, website, address,
   company) from text patterns plus layout cues (size, position).
4. Style estimation per field: text colour, relative size, weight, alignment.
5. Photo-frame detection: a face detector (OpenCV YuNet, if its model file is
   installed) or a photo heuristic (round/square region with skin tones and
   texture).
6. Background cleaning: the sample text that will be replaced is removed with
   image inpainting, leaving a clean background to print on.

The result is a list of fields with boxes expressed as fractions of the card
size (0..1), so it is independent of the uploaded image resolution. A company
admin reviews and adjusts the result before it is saved; detection is good
but not perfect.
"""

from __future__ import annotations

import os

# Refuse absurd pixel counts before OpenCV decodes anything (decompression bombs).
os.environ.setdefault('CV_IO_MAX_IMAGE_PIXELS', str(40_000_000))

import re
from dataclasses import asdict, dataclass, field
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

# Fields that are filled with employee or company data. Anything else the OCR
# finds (slogans, labels) is left untouched as part of the design.
DYNAMIC_ROLES = ('name', 'title', 'department', 'phone', 'email', 'website', 'address', 'company')
CARD_RATIO = 3.5 / 2.0
WORKING_WIDTH = 1400  # px; images are normalised to this width before analysis

EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+(\.[\w-]+)+', re.I)
WEB_RE = re.compile(r'(https?://|www\.)|\b[\w-]+\.(com|net|org|io|co|bd|info|biz|dev|app|me|ltd)(\.[a-z]{2})?\b', re.I)
PHONE_CHARS_RE = re.compile(r'^[\s+()\-.\d/|:telTELmobMOBphonePHONE]+$')
ADDRESS_HINT_RE = re.compile(r'\b(st|street|road|rd|ave|avenue|lane|ln|house|floor|block|sector|city|dhaka|chittagong|suite|blvd|po|box|bangladesh|\d{4,5})\b', re.I)
COMPANY_HINT_RE = re.compile(r'\b(inc|ltd|limited|llc|corp|corporation|company|co\.|group|plc|gmbh|studio|agency|solutions|technologies|tech)\b', re.I)


@dataclass
class Field:
    role: str                 # name, title, phone, email, website, address, company, photo, qr, other
    x: float                  # left, fraction of card width
    y: float                  # top, fraction of card height
    w: float
    h: float
    text: str = ''            # sample text found on the design
    size: float = 0.0         # font size as a fraction of card height
    color: str = '#111111'
    align: str = 'left'       # left | center | right
    bold: bool = False
    shape: str = 'rect'       # for photo: circle | rect
    confidence: float = 0.0
    lines: int = 1
    # Exact area of the sample text (fractions), used only to erase it.
    ink: tuple[float, float, float, float] | None = None


@dataclass
class Analysis:
    width: int
    height: int
    fields: list[Field] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {'width': self.width, 'height': self.height, 'fields': [asdict(f) for f in self.fields], 'warnings': self.warnings}


# ---------------------------------------------------------------------------
# Models (loaded once)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _ocr_engine():
    from rapidocr_onnxruntime import RapidOCR
    return RapidOCR()


def _face_model_path() -> Path:
    return Path(__file__).resolve().parents[2] / 'models' / 'face_detection_yunet.onnx'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_image(path: Path) -> np.ndarray:
    data = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('The file is not a readable image')
    h, w = image.shape[:2]
    if w < 300 or h < 150:
        raise ValueError('The image is too small; export the card at least 1050 × 600 pixels')
    scale = WORKING_WIDTH / w
    return cv2.resize(image, (WORKING_WIDTH, round(h * scale)), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)


def _hex(bgr) -> str:
    b, g, r = (int(v) for v in bgr)
    return f'#{r:02x}{g:02x}{b:02x}'


def _text_style(image: np.ndarray, box: tuple[int, int, int, int], text: str = '') -> tuple[str, bool]:
    """Estimate text colour and weight inside a box.

    Pixels are split into ink and paper with k-means; weight comes from the
    stroke thickness (distance transform of the ink mask) relative to the
    line height, which works for dark-on-light and light-on-dark text alike.
    """
    x, y, w, h = box
    region = image[max(0, y):y + h, max(0, x):x + w]
    patch = region.reshape(-1, 3).astype(np.float32)
    if len(patch) < 20:
        return '#111111', False
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(patch, 2, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.ravel(), minlength=2)
    ink = int(np.argmin(counts))           # the smaller cluster is the text
    mask = (labels.reshape(region.shape[:2]) == ink).astype(np.uint8)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 3)
    stroke = 2 * float(np.percentile(dist[mask > 0], 50)) if mask.any() else 0.0
    # OCR boxes are tighter for lines without descenders (digits, capitals),
    # so estimate the real font size before comparing stroke to it.
    em = h if any(c in 'gjpqy,;' for c in text) else h / 0.75
    return _hex(centers[ink]), bool(stroke / max(1.0, em) > 0.062)


def _align_of(group: list[tuple[int, int, int, int]], card_w: int) -> str:
    if len(group) >= 2:
        lefts = np.array([b[0] for b in group]); rights = np.array([b[0] + b[2] for b in group])
        centers = (lefts + rights) / 2
        spread = {'left': lefts.std(), 'right': rights.std(), 'center': centers.std()}
        best = min(spread, key=spread.get)
        if spread[best] < 0.02 * card_w:
            return best
    x, _, w, _ = group[0]
    mid = x + w / 2
    if abs(mid - card_w / 2) < 0.04 * card_w:
        return 'center'
    return 'right' if x > card_w * 0.55 else 'left'


def _lab(hex_color: str) -> np.ndarray:
    r, g, b = int(hex_color[1:3], 16), int(hex_color[3:5], 16), int(hex_color[5:7], 16)
    return cv2.cvtColor(np.uint8([[[b, g, r]]]), cv2.COLOR_BGR2LAB)[0, 0].astype(float)


def _color_distance(a: str, b: str) -> float:
    return float(np.linalg.norm(_lab(a) - _lab(b)))


def _is_phone(text: str) -> bool:
    digits = sum(c.isdigit() for c in text)
    return digits >= 7 and digits / max(1, len(text.replace(' ', ''))) > 0.55


# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------

def _ocr_lines(image: np.ndarray) -> list[dict]:
    result, _ = _ocr_engine()(image)
    lines = []
    for points, text, score in result or []:
        pts = np.array(points, dtype=np.float32)
        x, y = pts.min(axis=0); x2, y2 = pts.max(axis=0)
        text = str(text).strip()
        if not text or float(score) < 0.5:
            continue
        lines.append({'text': text, 'box': (int(x), int(y), int(x2 - x), int(y2 - y)), 'score': float(score)})
    return sorted(lines, key=lambda l: (l['box'][1], l['box'][0]))


def _group_lines(lines: list[dict], image: np.ndarray) -> list[dict]:
    """Merge stacked lines of the same style (e.g. a name over two lines)."""
    for line in lines:
        line['color'], line['bold'] = _text_style(image, line['box'], line['text'])
    groups: list[dict] = []
    for line in lines:
        x, y, w, h = line['box']
        merged = False
        for g in groups:
            gx, gy, gw, gh = g['box']
            last = g['items'][-1]['box']
            same_size = abs(last[3] - h) <= 0.18 * max(h, last[3])
            same_color = _color_distance(line['color'], g['color']) < 30
            close_below = 0 <= y - (last[1] + last[3]) <= 0.7 * h
            aligned = abs(x - last[0]) < 0.6 * h or abs((x + w) - (last[0] + last[2])) < 0.6 * h or abs((x + w / 2) - (last[0] + last[2] / 2)) < 0.6 * h
            # Contact rows (phone/email/web) stay separate even when stacked.
            either_contact = any(EMAIL_RE.search(t) or WEB_RE.search(t) or _is_phone(t) for t in (line['text'], last_text(g)))
            if same_size and same_color and close_below and aligned and not either_contact:
                g['items'].append(line)
                nx, ny = min(gx, x), gy
                g['box'] = (nx, ny, max(gx + gw, x + w) - nx, (y + h) - ny)
                g['text'] = f"{g['text']} {line['text']}"
                merged = True
                break
        if not merged:
            groups.append({'items': [line], 'box': line['box'], 'text': line['text'], 'color': line['color'], 'bold': line['bold']})
    return groups


def last_text(group: dict) -> str:
    return group['items'][-1]['text']


def _classify(groups: list[dict], card_w: int, card_h: int) -> None:
    for g in groups:
        t = g['text']
        if EMAIL_RE.search(t):
            g['role'] = 'email'
        elif _is_phone(t):
            g['role'] = 'phone'
        elif WEB_RE.search(t) and ' ' not in t.strip():
            g['role'] = 'website'
        elif ADDRESS_HINT_RE.search(t) and (',' in t or any(c.isdigit() for c in t)):
            g['role'] = 'address'
        elif COMPANY_HINT_RE.search(t):
            g['role'] = 'company'
        else:
            g['role'] = None

    # Name: the largest remaining text that looks like words (not a slogan sentence).
    candidates = [g for g in groups if g['role'] is None and 1 <= len(g['text'].split()) <= 5 and not any(c.isdigit() for c in g['text'])]
    if candidates:
        name = max(candidates, key=lambda g: g['items'][0]['box'][3])
        name['role'] = 'name'
        nx, ny, nw, nh = name['box']
        line_h = name['items'][0]['box'][3]
        # Title: nearest smaller text directly above or below the name.
        def gap(g):
            gx, gy, gw, gh = g['box']
            return min(abs(gy - (ny + nh)), abs(ny - (gy + gh)))
        near = [g for g in groups if g['role'] is None and g is not name and g['items'][0]['box'][3] < line_h * 0.95 and gap(g) < line_h * 1.6
                and (abs(g['box'][0] - nx) < 0.15 * card_w or abs((g['box'][0] + g['box'][2]) - (nx + nw)) < 0.15 * card_w)]
        if near:
            min(near, key=gap)['role'] = 'title'


def _detect_photo(image: np.ndarray, text_boxes: list[tuple[int, int, int, int]]) -> Field | None:
    h, w = image.shape[:2]
    # 1) Face detector, when its model is installed.
    model = _face_model_path()
    if model.exists() and hasattr(cv2, 'FaceDetectorYN'):
        detector = cv2.FaceDetectorYN.create(str(model), '', (w, h), 0.7)
        _, faces = detector.detect(image)
        if faces is not None and len(faces):
            fx, fy, fw, fh = (int(v) for v in max(faces, key=lambda f: f[2] * f[3])[:4])
            cx, cy = fx + fw / 2, fy + fh * 0.55
            r = max(fw, fh) * 1.05
            return Field('photo', max(0, cx - r) / w, max(0, cy - r) / h, min(2 * r, w) / w, min(2 * r, h) / h, shape='circle', confidence=0.9)

    # 2) Heuristic: circles / squares full of photo-like detail and skin tones.
    gray = cv2.medianBlur(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), 5)
    ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
    skin = cv2.inRange(ycrcb, (0, 135, 85), (255, 180, 135))
    candidates: list[tuple[float, Field]] = []

    def overlaps_text(x, y, bw, bh):
        for tx, ty, tw, th in text_boxes:
            ix = max(0, min(x + bw, tx + tw) - max(x, tx)); iy = max(0, min(y + bh, ty + th) - max(y, ty))
            if ix * iy > 0.25 * tw * th:
                return True
        return False

    def score_region(mask: np.ndarray) -> float:
        area = cv2.countNonZero(mask)
        if area == 0:
            return 0.0
        skin_ratio = cv2.countNonZero(cv2.bitwise_and(skin, mask)) / area
        texture = float(cv2.meanStdDev(cv2.Laplacian(gray, cv2.CV_64F), mask=mask)[1][0][0])
        return skin_ratio * 2 + min(texture / 40, 1.0)

    circles = cv2.HoughCircles(gray, cv2.HOUGH_GRADIENT, dp=1.2, minDist=h / 4, param1=120, param2=40, minRadius=int(h * 0.14), maxRadius=int(h * 0.48))
    if circles is not None:
        for cx, cy, r in circles[0][:8]:
            x, y, d = int(cx - r), int(cy - r), int(2 * r)
            if x < 0 or y < 0 or x + d > w or y + d > h or overlaps_text(x, y, d, d):
                continue
            mask = np.zeros((h, w), np.uint8); cv2.circle(mask, (int(cx), int(cy)), int(r * 0.85), 255, -1)
            candidates.append((score_region(mask), Field('photo', x / w, y / h, d / w, d / h, shape='circle')))

    edges = cv2.Canny(gray, 60, 160)
    contours, _ = cv2.findContours(cv2.dilate(edges, None), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        if bh < h * 0.3 or bh > h * 0.95 or not (0.6 < bw / bh < 1.4) or overlaps_text(x, y, bw, bh):
            continue
        mask = np.zeros((h, w), np.uint8); cv2.rectangle(mask, (x, y), (x + bw, y + bh), 255, -1)
        candidates.append((score_region(mask) - 0.2, Field('photo', x / w, y / h, bw / w, bh / h, shape='rect')))

    if not candidates:
        return None
    best_score, best = max(candidates, key=lambda c: c[0])
    if best_score < 0.55:
        return None
    best.confidence = round(min(best_score / 2, 0.95), 2)
    return best


def clean_background(image: np.ndarray, fields: list[Field]) -> np.ndarray:
    """Erase the sample text of dynamic fields with inpainting."""
    h, w = image.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    for f in fields:
        if f.role in DYNAMIC_ROLES:
            fx, fy, fw, fh = f.ink or (f.x, f.y, f.w, f.h)
            pad = max(3, int(fh * h * 0.15 / max(1, f.lines)))
            x0, y0 = int(fx * w) - pad, int(fy * h) - pad
            x1, y1 = int((fx + fw) * w) + pad, int((fy + fh) * h) + pad
            cv2.rectangle(mask, (max(0, x0), max(0, y0)), (min(w, x1), min(h, y1)), 255, -1)
    if not cv2.countNonZero(mask):
        return image
    return cv2.inpaint(image, mask, 7, cv2.INPAINT_TELEA)


def analyze(image: np.ndarray) -> Analysis:
    h, w = image.shape[:2]
    result = Analysis(width=w, height=h)
    ratio = w / h
    if abs(ratio - CARD_RATIO) > 0.25:
        result.warnings.append(f'The image is {ratio:.2f}:1; a 3.5 × 2 in card is 1.75:1, so the design may be stretched.')

    lines = _ocr_lines(image)
    groups = _group_lines(lines, image)
    _classify(groups, w, h)

    for g in groups:
        gx, gy, gw, gh = g['box']
        line_h = g['items'][0]['box'][3]
        role = g['role'] or 'other'
        boxes = [i['box'] for i in g['items']]
        # Give single-line fields room to grow so longer names still fit.
        grow = 0.0 if role == 'other' else 0.12
        align = _align_of(boxes, w)
        x = gx - (gw * grow if align == 'right' else gw * grow / 2 if align == 'center' else 0)
        result.fields.append(Field(
            role=role, x=max(0.0, x / w), y=gy / h, w=min(1.0, gw * (1 + grow) / w), h=gh / h,
            text=g['text'], size=round(line_h * 0.82 / h, 4), color=g['color'], align=align,
            bold=g['bold'], confidence=round(float(np.mean([i['score'] for i in g['items']])), 2), lines=len(g['items']),
            ink=(gx / w, gy / h, gw / w, gh / h),
        ))

    _align_columns(result.fields, w)

    photo = _detect_photo(image, [l['box'] for l in lines])
    if photo:
        result.fields.append(photo)
    else:
        result.warnings.append('No photo frame was found. Add one in the editor if the design has a photo.')

    found = {f.role for f in result.fields}
    if 'name' not in found:
        result.warnings.append('No name field was found. Mark the name in the editor.')
    # A verification QR is part of every BizCard card: suggest the emptiest corner.
    result.fields.append(_suggest_qr(image, result.fields))
    return result


def _align_columns(fields: list[Field], card_w: int) -> None:
    """Fields stacked in one column share an alignment; decide it from their edges."""
    dynamic = [f for f in fields if f.role in DYNAMIC_ROLES and f.ink]
    used: set[int] = set()
    for i, f in enumerate(dynamic):
        if i in used:
            continue
        column = [f]
        for j, g in enumerate(dynamic):
            if j != i and j not in used:
                fx0, fx1 = f.ink[0], f.ink[0] + f.ink[2]
                gx0, gx1 = g.ink[0], g.ink[0] + g.ink[2]
                if min(fx1, gx1) - max(fx0, gx0) > 0.3 * min(fx1 - fx0, gx1 - gx0):
                    column.append(g); used.add(j)
        used.add(i)
        if len(column) < 2:
            continue
        lefts = np.array([c.ink[0] for c in column]); rights = np.array([c.ink[0] + c.ink[2] for c in column])
        spread = {'left': lefts.std(), 'right': rights.std(), 'center': ((lefts + rights) / 2).std()}
        align = min(spread, key=spread.get)
        for c in column:
            c.align = align
            # re-anchor the growth room on the correct side
            ix, iy, iw, ih = c.ink
            room = iw * 0.12
            c.x = max(0.0, ix - (room if align == 'right' else room / 2 if align == 'center' else 0))
            c.w = min(1.0 - c.x, iw + room)


def _suggest_qr(image: np.ndarray, fields: list[Field]) -> Field:
    """Find the emptiest, calmest spot on the card for the verification QR code."""
    h, w = image.shape[:2]
    size_w = 0.115                      # about 1 cm on a 3.5 in card
    size_h = size_w * w / h
    margin = 0.04
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 60, 160)
    best, best_cost = (1 - margin - size_w, 1 - margin - size_h), float('inf')
    for y in np.arange(margin, 1 - margin - size_h + 1e-6, 0.02):
        for x in np.arange(margin, 1 - margin - size_w + 1e-6, 0.02):
            overlap = 0.0
            for f in fields:
                pad = 0.015
                ix = max(0.0, min(x + size_w, f.x + f.w + pad) - max(x, f.x - pad))
                iy = max(0.0, min(y + size_h, f.y + f.h + pad) - max(y, f.y - pad))
                overlap += ix * iy
            patch = edges[int(y * h):int((y + size_h) * h), int(x * w):int((x + size_w) * w)]
            busy = float(patch.mean()) / 255 if patch.size else 1.0
            # Prefer corners/edges slightly, like most printed cards.
            edge_pull = min(x, 1 - x - size_w, y, 1 - y - size_h) * 0.4
            cost = overlap * 400 + busy * 3 + edge_pull
            if cost < best_cost:
                best, best_cost = (float(x), float(y)), cost
    return Field('qr', round(best[0], 4), round(best[1], 4), size_w, round(size_h, 4), confidence=0.0)
