from pathlib import Path
from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.db.session import get_db
from app.models import User
from app.models.constants import COMPANY_ADMIN
from app.schemas.auth import CompanySummary
from app.schemas.domain import CompanyProfileUpdate
from app.services.activity import add_audit
from app.services.assets import replace_asset, save_image, upload_root

router = APIRouter(prefix='/company', tags=['Company Profile'])


@router.get('/profile', response_model=CompanySummary)
def get_profile(user: User = Depends(require_roles([COMPANY_ADMIN]))):
    return user.company


@router.put('/profile', response_model=CompanySummary)
def update_profile(
    payload: CompanyProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([COMPANY_ADMIN])),
):
    for key, value in payload.model_dump(mode='json').items():
        setattr(user.company, key, value)
    add_audit(db, 'COMPANY_PROFILE_UPDATED', 'company', user.company_id, user.id, user.company_id)
    db.commit()
    db.refresh(user.company)
    return user.company


@router.post('/logo', response_model=CompanySummary)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([COMPANY_ADMIN])),
):
    path = await save_image(file, upload_root() / f'company_{user.company_id}' / 'branding')
    user.company.logo_path = replace_asset(user.company.logo_path, path)
    add_audit(db, 'COMPANY_LOGO_UPDATED', 'company', user.company_id, user.id, user.company_id)
    db.commit()
    db.refresh(user.company)
    return user.company


@router.get('/logo')
def get_logo(user: User = Depends(require_roles([COMPANY_ADMIN]))):
    path = Path(user.company.logo_path or '')
    if not path.is_file():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail='Company logo not found')
    return FileResponse(path)
