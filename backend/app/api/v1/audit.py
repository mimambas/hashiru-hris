"""Audit log read access."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, paginate, pagination_params, require_role
from app.models import AuditLog

router = APIRouter()


@router.get("", response_model=dict)
def list_audit_logs(
    entity_type: str | None = None,
    entity_id: str | None = None,
    paging: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    user=Depends(require_role("super_admin", "hr_director", "hr_manager")),
):
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    return paginate(query, paging["page"], paging["per_page"], lambda l: {
        "id": l.id, "entity_type": l.entity_type, "entity_id": l.entity_id,
        "action": l.action, "actor_id": l.actor_id, "changes": l.changes,
        "created_at": l.created_at,
    })
