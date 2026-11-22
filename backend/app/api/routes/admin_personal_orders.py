"""System admin review of employees' personal card orders.

Personal cards are printed on a design the employee uploaded (read by machine learning). Like company
card requests, an order is approved by a system admin first; the cards are generated then, the employee
pays, and only after payment can the PDFs be downloaded.
"""

from __future__ import annotations

import io
import tempfile
from pathlib import Path
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_system_admin
from app.api.routes.employee_portal import render_personal_order
from app.db.session import get_db
from app.models import CardOrder, User
from app.services.activity import add_audit, add_notification
from app.services.image_template_render import render_image_template, user_owner

router = APIRouter(prefix='/admin/personal-orders', tags=['Admin: personal orders'])


class PersonalOrderDecision(BaseModel):
    decision: str = Field(pattern='^(APPROVED|REJECTED)$')
    reason: str | None = Field(default=None, max_length=500)


def _row(order: CardOrder, user: User | None) -> dict:
    details = order.details or {}
    return {
        'id': order.id, 'status': order.status, 'quantity': order.quantity, 'total_amount': order.total_amount,
        'created_at': order.created_at, 'user_name': user.username if user else '', 'user_email': user.email if user else '',
        'name': details.get('name', ''), 'designation': details.get('designation', ''), 'phone': details.get('phone', ''),
        'design_name': details.get('design_name', ''), 'rejection_reason': details.get('rejection_reason'),
    }


def _personal_order(db: Session, order_id: int) -> CardOrder:
    order = db.get(CardOrder, order_id)
    if order is None or order.company_id is not None or order.request_id is not None:
        raise HTTPException(404, 'Personal order not found')
    return order


@router.get('')
def list_personal_orders(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    orders = db.scalars(select(CardOrder).where(CardOrder.company_id.is_(None), CardOrder.request_id.is_(None))
                        .order_by(CardOrder.id.desc())).all()
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_({o.user_id for o in orders}))).all()} if orders else {}
    return [_row(order, users.get(order.user_id)) for order in orders]


@router.get('/{order_id}/preview')
def preview_personal_order(order_id: int, db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    """The card exactly as it will print, so the admin can check it before approving. No card is created."""
    order = _personal_order(db, order_id)
    details = order.details or {}
    design = details.get('design')
    if not design:
        raise HTTPException(404, 'This order has no design to preview')
    user = db.get(User, order.user_id)
    company = SimpleNamespace(name='', logo_path=None, website=None, address=None)
    employee = SimpleNamespace(name=details.get('name') or user.username, designation=details.get('designation') or '',
                               department=details.get('department') or '', email=user.email, phone=details.get('phone') or '',
                               photo_path=getattr(user, 'avatar_path', None))
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / 'preview.pdf'
        render_image_template(path, company, employee, 'preview-not-valid', design, user_owner(user.id))
        data = path.read_bytes()
    return StreamingResponse(io.BytesIO(data), media_type='application/pdf',
                             headers={'Content-Disposition': f'inline; filename="order-{order.id}-preview.pdf"'})


@router.patch('/{order_id}/decision')
def decide_personal_order(order_id: int, body: PersonalOrderDecision, db: Session = Depends(get_db),
                          admin: User = Depends(require_system_admin)):
    order = _personal_order(db, order_id)
    if order.status != 'PENDING_APPROVAL':
        raise HTTPException(409, f'This order is already {order.status.replace("_", " ").lower()}')
    if body.decision == 'REJECTED':
        reason = (body.reason or '').strip()
        if not reason:
            raise HTTPException(422, 'A rejection reason is required')
        order.status = 'REJECTED'
        order.details = {**(order.details or {}), 'rejection_reason': reason}
        add_notification(db, order.user_id, 'ORDER_REJECTED', f'Order #{order.id} was rejected. Reason: {reason}')
        add_audit(db, 'PERSONAL_ORDER_REJECTED', 'card_order', str(order.id), admin.id, None, reason)
        db.commit()
        return _row(order, db.get(User, order.user_id))
    try:
        render_personal_order(db, order)
    except Exception:
        db.rollback()
        raise HTTPException(500, 'The cards could not be generated') from None
    order.status = 'PENDING_PAYMENT'
    add_notification(db, order.user_id, 'ORDER_APPROVED', f'Order #{order.id} was approved. Pay ৳{order.total_amount} to download your cards.')
    add_audit(db, 'PERSONAL_ORDER_APPROVED', 'card_order', str(order.id), admin.id, None, f'{order.quantity} card(s) generated; awaiting payment')
    db.commit()
    return _row(order, db.get(User, order.user_id))
