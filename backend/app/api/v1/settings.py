"""Settings: company, attendance rules, leave types, holidays (key-value JSON)."""
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, log_audit, require_role
from app.models import Setting, User
from app.schemas import AttendanceSettings

router = APIRouter()

READ_ROLES = ("super_admin", "hr_director", "hr_manager", "hr_officer", "finance_officer",
              "dept_manager", "team_leader", "employee")
WRITE_ROLES = ("super_admin", "hr_director", "hr_manager")


def _get(db: Session, key: str, default):
    s = db.query(Setting).filter(Setting.key == key).first()
    return s.value if s else default


def _put(db: Session, key: str, value, user: User):
    s = db.query(Setting).filter(Setting.key == key).first()
    if s:
        s.value = value
    else:
        db.add(Setting(key=key, value=value))
    log_audit(db, "setting", key, "update", user.id, {"key": key})
    db.commit()
    return value


@router.get("/company")
def get_company(db: Session = Depends(get_db), user=Depends(require_role(*READ_ROLES))):
    return _get(db, "company", {})


@router.put("/company")
def put_company(payload: dict = Body(...), db: Session = Depends(get_db),
                user=Depends(require_role(*WRITE_ROLES))):
    return _put(db, "company", payload, user)


@router.get("/attendance", response_model=AttendanceSettings)
def get_attendance_settings(db: Session = Depends(get_db), user=Depends(require_role(*READ_ROLES))):
    return AttendanceSettings(**_get(db, "attendance", {}))


@router.put("/attendance", response_model=AttendanceSettings)
def put_attendance_settings(payload: AttendanceSettings, db: Session = Depends(get_db),
                            user=Depends(require_role(*WRITE_ROLES))):
    return AttendanceSettings(**_put(db, "attendance", payload.model_dump(), user))


@router.get("/leave-types")
def get_leave_types(db: Session = Depends(get_db), user=Depends(require_role(*READ_ROLES))):
    return _get(db, "leave_types", {})


@router.put("/leave-types")
def put_leave_types(payload: dict = Body(...), db: Session = Depends(get_db),
                    user=Depends(require_role(*WRITE_ROLES))):
    return _put(db, "leave_types", payload, user)


@router.get("/holidays")
def get_holidays(db: Session = Depends(get_db), user=Depends(require_role(*READ_ROLES))):
    return _get(db, "holidays", [])


@router.put("/holidays")
def put_holidays(payload: list = Body(...), db: Session = Depends(get_db),
                 user=Depends(require_role(*WRITE_ROLES))):
    return _put(db, "holidays", payload, user)
