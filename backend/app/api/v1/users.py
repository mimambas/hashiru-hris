"""User management (admin)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, log_audit, paginate, pagination_params, require_role
from app.core.security import hash_password
from app.models import User
from app.schemas import UserCreate, UserOut

router = APIRouter()

ADMIN_ROLES = ("super_admin", "hr_director", "hr_manager")


@router.get("", response_model=dict)
def list_users(
    paging: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    user=Depends(require_role(*ADMIN_ROLES)),
):
    return paginate(db.query(User).order_by(User.email), paging["page"], paging["per_page"],
                    lambda u: UserOut.model_validate(u).model_dump())


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role("super_admin")),
):
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email sudah terdaftar")
    new_user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        employee_id=payload.employee_id,
    )
    db.add(new_user)
    db.flush()
    log_audit(db, "user", new_user.id, "create", user.id, {"email": new_user.email})
    db.commit()
    db.refresh(new_user)
    return UserOut.model_validate(new_user)


@router.put("/{user_id}/toggle")
def toggle_user(
    user_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("super_admin")),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pengguna tidak ditemukan")
    target.is_active = not target.is_active
    log_audit(db, "user", target.id, "toggle_active", user.id, {"is_active": target.is_active})
    db.commit()
    return {"ok": True, "is_active": target.is_active}


VALID_ROLES = (
    "super_admin", "hr_director", "hr_manager", "hr_officer", "recruiter",
    "finance_officer", "dept_manager", "team_leader", "employee",
)


@router.put("/{user_id}/role", response_model=UserOut)
def change_user_role(
    user_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user=Depends(require_role("super_admin", "hr_director", "hr_manager")),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pengguna tidak ditemukan")
    new_role = (payload.get("role") or "").strip()
    if new_role not in VALID_ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Peran tidak valid")
    old_role = target.role
    target.role = new_role
    log_audit(db, "user", target.id, "change_role", user.id,
              {"old": old_role, "new": new_role})
    db.commit()
    db.refresh(target)
    return UserOut.model_validate(target)
