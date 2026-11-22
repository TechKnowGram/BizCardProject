"""Fit a person's photo into a card's photo frame with their face in the right place.

A plain centre crop often cuts off the top of the head or leaves the face off-centre,
especially with wide photos. Here a face detector finds the face first:
- OpenCV YuNet (a small neural network) when backend/models/face_detection_yunet.onnx exists,
- otherwise OpenCV's built-in Haar-cascade face detector, which ships with opencv-python.
The crop is then centred on the face, with room above the head and the shoulders below.
The PDF renderer and the browser preview use this same function, so they match.
"""

from __future__ import annotations

import io
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageOps

# How tall the face is, as a share of the frame height, and where its centre sits (from the top).
FACE_SHARE = 0.46
FACE_CENTRE_Y = 0.48


def _model_path() -> Path:
    return Path(__file__).resolve().parents[2] / 'models' / 'face_detection_yunet.onnx'


@lru_cache(maxsize=256)
def _face_box(path: str, mtime: float) -> tuple[float, float, float, float] | None:  # noqa: ARG001 (mtime keys the cache)
    """The largest face as (x, y, w, h) fractions of the upright image, or None."""
    try:
        import cv2
        import numpy as np
    except Exception:
        return None
    try:
        with Image.open(path) as source:
            image = ImageOps.exif_transpose(source).convert('RGB')
    except Exception:
        return None
    # Detection does not need full resolution; 640 px on the long side is plenty and fast.
    scale = min(1.0, 640 / max(image.size))
    small = image.resize((max(1, int(image.width * scale)), max(1, int(image.height * scale))))
    bgr = cv2.cvtColor(np.asarray(small), cv2.COLOR_RGB2BGR)
    h, w = bgr.shape[:2]
    faces: list[tuple[float, float, float, float]] = []
    model = _model_path()
    if model.is_file() and hasattr(cv2, 'FaceDetectorYN'):
        try:
            detector = cv2.FaceDetectorYN.create(str(model), '', (w, h), 0.7)
            _, found = detector.detect(bgr)
            if found is not None:
                faces = [tuple(map(float, f[:4])) for f in found]
        except Exception:
            faces = []
    if not faces and hasattr(cv2, 'CascadeClassifier') and hasattr(cv2, 'data'):  # removed in OpenCV 5
        try:
            cascade = cv2.CascadeClassifier(str(Path(cv2.data.haarcascades) / 'haarcascade_frontalface_default.xml'))
            gray = cv2.equalizeHist(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY))
            minimum = max(24, int(min(w, h) * 0.08))
            found = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(minimum, minimum))
            faces = [tuple(map(float, f)) for f in found]
        except Exception:
            faces = []
    if not faces:
        skin = _skin_face(bgr)
        if skin:
            faces = [skin]
    if not faces:
        return None
    x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    return x / w, y / h, fw / w, fh / h


def _skin_face(bgr) -> tuple[float, float, float, float] | None:
    """Fallback when no face model is installed: the largest skin-coloured area in the upper part of a portrait.

    Skin falls in a narrow band of the YCrCb colour space for all skin tones. The face is taken as the
    upper part of that area (below it are usually the neck and shoulders, which are not skin-coloured
    when dressed). Returns None unless the area is a plausible face size, so plain backgrounds are ignored.
    """
    import cv2
    import numpy as np

    h, w = bgr.shape[:2]
    ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
    mask = cv2.inRange(ycrcb, np.array((0, 135, 85), np.uint8), np.array((255, 173, 127), np.uint8))
    mask[int(h * 0.8):, :] = 0
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    count, _, stats, _ = cv2.connectedComponentsWithStats(mask)
    if count <= 1:
        return None
    best = max(range(1, count), key=lambda i: stats[i, cv2.CC_STAT_AREA])
    x, y, bw, bh, area = (float(v) for v in stats[best])
    share = area / (w * h)
    # A face is neither a speck nor the whole picture (a skin-toned background would be).
    if share < 0.01 or share > 0.6 or bw > w * 0.9:
        return None
    bh = min(bh, bw * 1.15)  # skin starts at the forehead: keep the head, drop the neck below it
    return x, y, bw, bh


def face_box(path: str | None) -> tuple[float, float, float, float] | None:
    if not path or not Path(path).is_file():
        return None
    return _face_box(str(path), Path(path).stat().st_mtime)


def crop_to_frame(photo: Image.Image, ratio: float, face: tuple[float, float, float, float] | None) -> Image.Image:
    """Crop `photo` (already upright) to width/height `ratio`, centred on `face` when there is one."""
    w, h = photo.size
    if face is None:
        # No face found: keep the old behaviour (centre horizontally, upper part vertically).
        if w / h > ratio:
            new_w = int(h * ratio); left = (w - new_w) // 2
            return photo.crop((left, 0, left + new_w, h))
        new_h = int(w / ratio); top = int((h - new_h) * 0.25)
        return photo.crop((0, top, w, top + new_h))
    fx, fy, fw, fh = face[0] * w, face[1] * h, face[2] * w, face[3] * h
    centre_x, centre_y = fx + fw / 2, fy + fh / 2
    # Frame height so the face takes FACE_SHARE of it, never larger than the photo allows.
    crop_h = fh / FACE_SHARE
    crop_w = crop_h * ratio
    fit = min(1.0, w / crop_w, h / crop_h)
    crop_w, crop_h = crop_w * fit, crop_h * fit
    left = min(max(0.0, centre_x - crop_w / 2), w - crop_w)
    top = min(max(0.0, centre_y - crop_h * FACE_CENTRE_Y), h - crop_h)
    return photo.crop((int(left), int(top), int(left + crop_w), int(top + crop_h)))


def framed_photo(path: str, ratio: float, max_px: int = 900) -> Image.Image:
    """The photo at `path`, upright and cropped to the frame's shape around the face."""
    with Image.open(path) as source:
        photo = ImageOps.exif_transpose(source).convert('RGB')
    cropped = crop_to_frame(photo, ratio, face_box(path))
    if max(cropped.size) > max_px:
        cropped.thumbnail((max_px, max_px), Image.LANCZOS)
    return cropped


def parse_frame(frame: str | None) -> float | None:
    """'3:4' or '0.75' -> 0.75 (width / height). Anything odd -> None."""
    if not frame:
        return None
    try:
        if ':' in frame:
            a, b = frame.split(':', 1)
            value = float(a) / float(b)
        else:
            value = float(frame)
    except (ValueError, ZeroDivisionError):
        return None
    return value if 0.2 <= value <= 5 else None


def framed_photo_jpeg(path: str, ratio: float) -> bytes:
    buffer = io.BytesIO()
    framed_photo(path, ratio).save(buffer, format='JPEG', quality=90)
    return buffer.getvalue()


def photo_response(path: str | None, frame: str | None, missing: str = 'Photo not found'):
    """A FileResponse for the photo, or, with ?frame=W:H, the face-centred crop the card prints."""
    from fastapi import HTTPException
    from fastapi.responses import FileResponse, Response

    if not path or not Path(path).is_file():
        raise HTTPException(status_code=404, detail=missing)
    ratio = parse_frame(frame)
    if ratio is None:
        return FileResponse(path, headers={'Cache-Control': 'private, max-age=3600'})
    try:
        data = framed_photo_jpeg(path, ratio)
    except Exception:
        return FileResponse(path, headers={'Cache-Control': 'private, max-age=3600'})
    return Response(data, media_type='image/jpeg', headers={'Cache-Control': 'private, max-age=3600'})
