"""Expense / reimbursement endpoints."""
from decimal import Decimal

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
from app.models import Employee, ExpenseClaim, User
from app.schemas import ExpenseCreate, ExpenseOut, LeaveRejectRequest

router = APIRouter()

DIRECTOR_THRESHOLD = Decimal("5000000")


@router.get("", response_model=dict)
def list_expenses(
    status_: str | None = Query(None, alias="status"),
    paging: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(ExpenseClaim).order_by(ExpenseClaim.created_at.desc())
    scoped = scope_employee_id(user)
    if scoped:
        query = query.filter(ExpenseClaim.employee_id == scoped)
    elif user.role in ("dept_manager", "team_leader") and user.employee_id:
        team_ids = [e.id for e in db.query(Employee).filter(Employee.reporting_to == user.employee_id).all()]
        query = query.filter(ExpenseClaim.employee_id.in_(team_ids + [user.employee_id]))
    if status_:
        query = query.filter(ExpenseClaim.status == status_)
    return paginate(query, paging["page"], paging["per_page"],
                    lambda c: ExpenseOut.model_validate(c).model_dump())


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.employee_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Akun Anda belum terhubung ke data karyawan")
    if payload.amount >= 100000 and not payload.receipt_url:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "Klaim di atas Rp 100.000 wajib melampirkan struk")
    claim = ExpenseClaim(
        employee_id=user.employee_id,
        claim_date=payload.claim_date,
        type=payload.type,
        amount=payload.amount,
        description=payload.description,
        receipt_url=payload.receipt_url,
        status="pending",
        needs_director=payload.amount > DIRECTOR_THRESHOLD,
        approvals=[],
    )
    db.add(claim)
    db.flush()
    log_audit(db, "expense", claim.id, "create", user.id, {"amount": str(payload.amount)})
    db.commit()
    db.refresh(claim)
    return ExpenseOut.model_validate(claim)


def _get_claim(claim_id: str, db: Session) -> ExpenseClaim:
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Klaim tidak ditemukan")
    return claim


@router.put("/{claim_id}/approve", response_model=ExpenseOut)
def approve_expense(
    claim_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    claim = _get_claim(claim_id, db)
    if claim.status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "Klaim sudah diproses")
    allowed = {"super_admin", "hr_director", "dept_manager", "team_leader",
               "finance_officer", "hr_manager"}
    if user.role not in allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses untuk menyetujui")
    approvals = list(claim.approvals or [])
    if claim.needs_director and user.role not in ("hr_director", "super_admin"):
        approvals.append({"role": user.role, "action": "approved_first", "by": user.id})
        claim.approvals = approvals
        claim.status = "pending"
        log_audit(db, "expense", claim.id, "approve_first", user.id, {})
        db.commit()
        db.refresh(claim)
        return ExpenseOut.model_validate(claim)
    approvals.append({"role": user.role, "action": "approved", "by": user.id})
    claim.approvals = approvals
    claim.status = "approved"
    log_audit(db, "expense", claim.id, "approve", user.id, {})
    db.commit()
    db.refresh(claim)
    return ExpenseOut.model_validate(claim)


@router.put("/{claim_id}/reject", response_model=ExpenseOut)
def reject_expense(
    claim_id: str,
    payload: LeaveRejectRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    claim = _get_claim(claim_id, db)
    allowed = {"super_admin", "hr_director", "dept_manager", "team_leader",
               "finance_officer", "hr_manager"}
    if user.role not in allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses untuk menolak")
    if claim.status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "Klaim sudah diproses")
    claim.status = "rejected"
    claim.rejection_reason = payload.reason
    approvals = list(claim.approvals or [])
    approvals.append({"role": user.role, "action": "rejected", "by": user.id, "reason": payload.reason})
    claim.approvals = approvals
    log_audit(db, "expense", claim.id, "reject", user.id, {"reason": payload.reason})
    db.commit()
    db.refresh(claim)
    return ExpenseOut.model_validate(claim)
