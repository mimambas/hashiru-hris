"""Offboarding: clearance checklist and final settlement."""
import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, log_audit, require_role
from app.models import Employee, LeaveBalance, Offboarding, User
from app.schemas import OffboardingCreate, OffboardingOut

router = APIRouter()

HR_ROLES = ("super_admin", "hr_director", "hr_manager", "hr_officer")

CLEARANCE_TEMPLATE = [
    "Pengembalian laptop & aset IT",
    "Pengembalian ID card & akses gedung",
    "Serah terima pekerjaan ke pengganti",
    "Pelunasan kas bon / pinjaman",
    "Exit interview dengan HR",
]


def _settlement(db: Session, emp: Employee, last_date: date) -> dict:
    """Final settlement: pro-rata salary + unused leave compensation."""
    days_in_month = 30  # simplified divisor per common practice
    worked_days = min(last_date.day, days_in_month)
    monthly = Decimal(str(emp.base_salary)) + Decimal(str(emp.fixed_allowance or 0))
    pro_rata = (monthly / days_in_month * worked_days).quantize(Decimal("1"))
    bal = (
        db.query(LeaveBalance)
        .filter_by(employee_id=emp.id, leave_type="AL", year=last_date.year)
        .first()
    )
    remaining = (bal.total_days - bal.used_days) if bal else 0
    leave_comp = (monthly / days_in_month * remaining).quantize(Decimal("1")) if remaining > 0 else Decimal("0")
    total = pro_rata + leave_comp
    return {
        "pro_rata_salary": float(pro_rata),
        "worked_days": worked_days,
        "unused_leave_days": remaining,
        "leave_compensation": float(leave_comp),
        "total_settlement": float(total),
    }


@router.post("", response_model=OffboardingOut, status_code=status.HTTP_201_CREATED)
def start_offboarding(
    payload: OffboardingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*HR_ROLES)),
):
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Karyawan tidak ditemukan")
    if db.query(Offboarding).filter(Offboarding.employee_id == payload.employee_id).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Proses offboarding sudah berjalan")
    tasks = [{"id": str(uuid.uuid4()), "title": t, "status": "pending"} for t in CLEARANCE_TEMPLATE]
    off = Offboarding(
        employee_id=payload.employee_id,
        last_date=payload.last_date,
        type=payload.type,
        reason=payload.reason,
        status="in_progress",
        tasks=tasks,
        settlement=_settlement(db, emp, payload.last_date),
    )
    db.add(off)
    db.flush()
    log_audit(db, "offboarding", off.id, "create", user.id, {"employee_id": emp.id})
    db.commit()
    db.refresh(off)
    return OffboardingOut.model_validate(off)


@router.get("/{employee_id}", response_model=OffboardingOut)
def get_offboarding(
    employee_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*HR_ROLES)),
):
    off = db.query(Offboarding).filter(Offboarding.employee_id == employee_id).first()
    if not off:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Data offboarding tidak ditemukan")
    # Recompute settlement live so it reflects current balances
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if emp:
        off.settlement = _settlement(db, emp, off.last_date)
    return OffboardingOut.model_validate(off)


@router.put("/tasks/{task_id}/complete")
def complete_offboarding_task(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*HR_ROLES)),
):
    off = db.query(Offboarding).all()
    target = None
    for o in off:
        for t in o.tasks or []:
            if t.get("id") == task_id:
                target = (o, t)
                break
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tugas tidak ditemukan")
    o, t = target
    tasks = list(o.tasks or [])
    for item in tasks:
        if item.get("id") == task_id:
            item["status"] = "done"
    o.tasks = tasks
    if all(i.get("status") == "done" for i in tasks):
        o.status = "completed"
    log_audit(db, "offboarding", o.id, "task_complete", user.id, {"task_id": task_id})
    db.commit()
    return {"ok": True, "offboarding_status": o.status}
