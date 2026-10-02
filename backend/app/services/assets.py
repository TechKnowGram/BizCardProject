from pathlib import Path
from uuid import uuid4
from fastapi import HTTPException, UploadFile
from app.core.config import settings

ALLOWED_IMAGES = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}
MAX_IMAGE_BYTES = 2_000_000


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
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f'{uuid4().hex}{extension}'
    path.write_bytes(content)
    return path.resolve()


def replace_asset(old_path: str | None, new_path: Path) -> str:
    if old_path:
        Path(old_path).unlink(missing_ok=True)
    return str(new_path)
