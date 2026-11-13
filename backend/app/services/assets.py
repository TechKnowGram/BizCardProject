from io import BytesIO
from pathlib import Path
from uuid import uuid4

from PIL import Image
from fastapi import HTTPException, UploadFile
from app.core.config import settings

ALLOWED_IMAGES = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}
MAX_IMAGE_BYTES = 2_000_000
MAX_IMAGE_PIXELS = 40_000_000  # ~ 8000 x 5000; far above any card or photo
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


def check_pixels(content: bytes) -> None:
    """Read only the image header and refuse huge or unreadable images before anything decodes them."""
    try:
        with Image.open(BytesIO(content)) as image:
            width, height = image.size
            image.verify()
    except Exception:
        raise HTTPException(status_code=422, detail='The image could not be read') from None
    if width * height > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=413, detail='The image has too many pixels; export it smaller')


def upload_root() -> Path:
    configured = Path(settings.upload_storage)
    if configured.is_absolute():
        return configured
    return Path(__file__).resolve().parents[2] / configured


async def save_image(file: UploadFile, folder: Path) -> Path:
    extension = ALLOWED_IMAGES.get(file.content_type or '')
    if extension is None:
        raise HTTPException(status_code=415, detail='Use a JPG, PNG, or WebP image')
    content = await file.read(MAX_IMAGE_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail='Image file is empty')
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail='Image must be 2 MB or smaller')
    signatures = {
        '.jpg': (b'\xff\xd8\xff',),
        '.png': (b'\x89PNG\r\n\x1a\n',),
        '.webp': (b'RIFF',),
    }
    if not any(content.startswith(value) for value in signatures[extension]):
        raise HTTPException(status_code=422, detail='Image content does not match its file type')
    if extension == '.webp' and content[8:12] != b'WEBP':
        raise HTTPException(status_code=422, detail='Invalid WebP image')
    check_pixels(content)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f'{uuid4().hex}{extension}'
    path.write_bytes(content)
    return path.resolve()


def replace_asset(old_path: str | None, new_path: Path) -> str:
    if old_path:
        Path(old_path).unlink(missing_ok=True)
    return str(new_path)
