"""Leave requests and balances."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user,
    get_db,
    log_audit,
    paginate,
    pagination_params,
    require_role,
    scope_employee_id,
)
from app.models import Employee, LeaveBalance, LeaveRequest, Setting, User
from app.schemas import (
    LeaveBalanceOut,
    LeaveRejectRequest,
    LeaveRequestCreate,
    LeaveRequestOut,
)

router = APIRouter()

APPROVER_ROLES = ("super_admin", "hr_director", "hr_manager", "hr_officer", "dept_manager", "team_leader")


def _holidays(db: Session) -> set[str]:
    s = db.query(Setting).filter(Setting.key == "holidays").first()
    if not s:
        return set()
    return {h["date"] for h in s.value}


def working_days(start: date, end: date, holidays: set[str]) -> int:
    """Count Mon-Fri days excluding national holidays."""
    count = 0
    d = start
    while d <= end:
        if d.weekday() < 5 and d.isoformat() not in holidays:
            count += 1
        d += timedelta(days=1)
    return count


def _serialize_balance(b: LeaveBalance) -> dict:
    return {
        "id": b.id, "employee_id": b.employee_id, "leave_type": b.leave_type,
        "year": b.year, "total_days": b.total_days, "used_days": b.used_days,
        "remaining_days": b.total_days - b.used_days,
    }


@router.get("/leave-requests", response_model=dict)
def list_leave_requests(
    status_: str | None = Query(None, alias="status"),
    employee_id: str | None = None,
    paging: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(LeaveRequest).order_by(LeaveRequest.created_at.desc())
    scoped = scope_employee_id(user)
    if scoped:
        query = query.filter(LeaveRequest.employee_id == scoped)
    elif user.role in ("dept_manager", "team_leader") and user.employee_id:
        team_ids = [e.id for e in db.query(Employee).filter(Employee.reporting_to == user.employee_id).all()]
        query = query.filter(LeaveRequest.employee_id.in_(team_ids + [user.employee_id]))
    elif employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    if status_:
        query = query.filter(LeaveRequest.status == status_)
    return paginate(query, paging["page"], paging["per_page"],
                    lambda r: LeaveRequestOut.model_validate(r).model_dump())


@router.post("/leave-requests", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
def create_leave_request(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.employee_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Akun Anda belum terhubung ke data karyawan")
    if payload.end_date < payload.start_date:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Tanggal selesai harus setelah tanggal mulai")
    holidays = _holidays(db)
    days = working_days(payload.start_date, payload.end_date, holidays)
    if days <= 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Rentang tanggal tidak memuat hari kerja")
    # Overlap check
    overlap = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == user.employee_id,
            LeaveRequest.status.in_(["pending", "approved", "approved_first"]),
            LeaveRequest.start_date <= payload.end_date,
            LeaveRequest.end_date >= payload.start_date,
        )
        .first()
    )
    if overlap:
        raise HTTPException(status.HTTP_409_CONFLICT, "Pengajuan cuti bertabrakan dengan pengajuan lain")
    # Balance check (AL-type only uses quota; UL unlimited-ish but still tracked)
    bal = (
        db.query(LeaveBalance)
        .filter_by(employee_id=user.employee_id, leave_type=payload.leave_type, year=payload.start_date.year)
        .first()
    )
    if bal and bal.total_days - bal.used_days < days:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"Saldo cuti {payload.leave_type} tidak mencukupi (sisa {bal.total_days - bal.used_days} hari)")
    if payload.leave_type == "SL" and days > 2 and not payload.attachment_url:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Cuti sakit lebih dari 2 hari wajib melampirkan surat dokter")
    needs_director = days > 3
    req = LeaveRequest(
        employee_id=user.employee_id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_days=days,
        reason=payload.reason,
        attachment_url=payload.attachment_url,
        status="pending",
        current_approver_role="hr_director" if needs_director else "dept_manager",
        approvals=[],
    )
    db.add(req)
    db.flush()
    log_audit(db, "leave_request", req.id, "create", user.id, {"days": days})
    db.commit()
    db.refresh(req)
    return LeaveRequestOut.model_validate(req)


@router.get("/leave-requests/{req_id}", response_model=LeaveRequestOut)
def get_leave_request(req_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    req = db.query(LeaveRequest).filter(LeaveRequest.id == req_id).first()
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pengajuan cuti tidak ditemukan")
    scoped = scope_employee_id(user)
    if scoped and req.employee_id != scoped:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses ke data ini")
    return LeaveRequestOut.model_validate(req)


def _approve(req: LeaveRequest, user: User, db: Session) -> LeaveRequestOut:
    approvals = list(req.approvals or [])
    needs_director = req.total_days > 3
    if needs_director and not any(a.get("role") in ("hr_director", "super_admin") for a in approvals):
        # First approval by manager/hr, second must be director
        if user.role in ("hr_director", "super_admin"):
            approvals.append({"role": user.role, "action": "approved", "by": user.id})
            req.status = "approved"
            req.current_approver_role = None
        elif user.role in APPROVER_ROLES:
            approvals.append({"role": user.role, "action": "approved_first", "by": user.id})
            req.status = "pending"
            req.current_approver_role = "hr_director"
        else:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses untuk menyetujui")
    else:
        if user.role not in APPROVER_ROLES:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses untuk menyetujui")
        approvals.append({"role": user.role, "action": "approved", "by": user.id})
        req.status = "approved"
        req.current_approver_role = None
    req.approvals = approvals
    if req.status == "approved":
        bal = (
            db.query(LeaveBalance)
            .filter_by(employee_id=req.employee_id, leave_type=req.leave_type, year=req.start_date.year)
            .first()
        )
        if bal:
            bal.used_days += req.total_days
    log_audit(db, "leave_request", req.id, "approve", user.id, {"status": req.status})
    db.commit()
    db.refresh(req)
    return LeaveRequestOut.model_validate(req)


@router.put("/leave-requests/{req_id}/approve", response_model=LeaveRequestOut)
def approve_leave(req_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    req = db.query(LeaveRequest).filter(LeaveRequest.id == req_id).first()
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pengajuan cuti tidak ditemukan")
    if req.status not in ("pending",):
        raise HTTPException(status.HTTP_409_CONFLICT, "Pengajuan sudah diproses")
    return _approve(req, user, db)


@router.put("/leave-requests/{req_id}/reject", response_model=LeaveRequestOut)
def reject_leave(
    req_id: str,
    payload: LeaveRejectRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    req = db.query(LeaveRequest).filter(LeaveRequest.id == req_id).first()
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pengajuan cuti tidak ditemukan")
    if user.role not in APPROVER_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses untuk menolak")
    if req.status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "Pengajuan sudah diproses")
    req.status = "rejected"
    req.current_approver_role = None
    approvals = list(req.approvals or [])
    approvals.append({"role": user.role, "action": "rejected", "by": user.id, "reason": payload.reason})
    req.approvals = approvals
    log_audit(db, "leave_request", req.id, "reject", user.id, {"reason": payload.reason})
    db.commit()
    db.refresh(req)
    return LeaveRequestOut.model_validate(req)


@router.get("/leave-balances/me", response_model=list[LeaveBalanceOut])
def my_balances(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.employee_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Akun Anda belum terhubung ke data karyawan")
    balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == user.employee_id).all()
    return [_serialize_balance(b) for b in balances]


@router.get("/leave-balances/{employee_id}", response_model=list[LeaveBalanceOut])
def employee_balances(
    employee_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*APPROVER_ROLES, "finance_officer")),
):
    balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == employee_id).all()
    return [_serialize_balance(b) for b in balances]
