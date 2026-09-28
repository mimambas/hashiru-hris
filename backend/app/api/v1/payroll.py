"""Payroll run management, payslips, bank files, THR runs."""
import csv
import io
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, log_audit, require_role
from app.models import Employee, PayrollItem, PayrollRun, User
from app.schemas import (
    PayrollApproveRequest,
    PayrollItemOut,
    PayrollRunCreate,
    PayrollRunOut,
    THRRunRequest,
)
from app.services.payroll import calculate_thr, run_payroll

router = APIRouter()

HR_PAYROLL = ("super_admin", "hr_director", "hr_manager", "hr_officer")
PAYROLL_READ = ("super_admin", "hr_director", "hr_manager", "hr_officer", "finance_officer")


@router.get("/runs", response_model=list[PayrollRunOut])
def list_runs(
    year: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*PAYROLL_READ)),
):
    q = db.query(PayrollRun).order_by(PayrollRun.period.desc())
    if year:
        q = q.filter(PayrollRun.period.like(f"{year}-%"))
    return q.all()


@router.post("/runs", response_model=PayrollRunOut, status_code=status.HTTP_201_CREATED)
def create_run(
    payload: PayrollRunCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*HR_PAYROLL)),
):
    existing = db.query(PayrollRun).filter(
        PayrollRun.period == payload.period, PayrollRun.run_type == "monthly").first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Payroll untuk periode tersebut sudah ada")
    run = PayrollRun(period=payload.period, run_type="monthly", status="draft", created_by=user.id)
    db.add(run)
    db.flush()
    log_audit(db, "payroll_run", run.id, "create", user.id, {"period": payload.period})
    db.commit()
    db.refresh(run)
    return run


@router.post("/runs/{run_id}/calculate")
def calculate_run(
    run_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*HR_PAYROLL)),
):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payroll run tidak ditemukan")
    try:
        summary = run_payroll(db, run.period)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    log_audit(db, "payroll_run", run.id, "calculate", user.id, summary)
    return summary


@router.get("/runs/{run_id}")
def get_run(
    run_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*PAYROLL_READ)),
):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payroll run tidak ditemukan")
    items = db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).all()
    emp_map = {e.id: e.full_name for e in db.query(Employee).all()}
    return {
        **PayrollRunOut.model_validate(run).model_dump(),
        "items": [
            {**PayrollItemOut.model_validate(i).model_dump(), "employee_name": emp_map.get(i.employee_id)}
            for i in items
        ],
    }


@router.put("/runs/{run_id}/approve")
def approve_run(
    run_id: str,
    payload: PayrollApproveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("super_admin", "hr_director", "hr_manager")),
):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payroll run tidak ditemukan")
    if run.status not in ("calculated", "draft"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Hanya run yang sudah dihitung yang dapat disetujui")
    if payload.approve:
        run.status = "paid"
        run.approved_by = user.id
        run.approved_at = datetime.utcnow()
        run.rejection_comment = None
    else:
        if not payload.comment:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Alasan penolakan wajib diisi")
        run.status = "rejected"
        run.rejection_comment = payload.comment
    log_audit(db, "payroll_run", run.id, "approve" if payload.approve else "reject",
              user.id, {"status": run.status})
    db.commit()
    return {"ok": True, "status": run.status}


@router.get("/payslip")
def payslip(
    period: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.employee_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Akun Anda belum terhubung ke data karyawan")
    run = (
        db.query(PayrollRun)
        .filter(PayrollRun.period == period, PayrollRun.status.in_(["approved", "paid"]))
        .first()
    )
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Slip gaji belum tersedia untuk periode tersebut")
    item = (
        db.query(PayrollItem)
        .filter(PayrollItem.payroll_run_id == run.id, PayrollItem.employee_id == user.employee_id)
        .first()
    )
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Data slip gaji tidak ditemukan")
    emp = db.query(Employee).filter(Employee.id == user.employee_id).first()
    return {
        "period": period,
        "employee": {"full_name": emp.full_name, "employee_id": emp.employee_id,
                     "ptkp_status": emp.ptkp_status},
        **PayrollItemOut.model_validate(item).model_dump(),
    }


@router.get("/runs/{run_id}/bank-file")
def bank_file(
    run_id: str,
    bank: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*PAYROLL_READ)),
):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payroll run tidak ditemukan")
    if run.status not in ("approved", "paid"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Bank file hanya tersedia setelah payroll disetujui")
    items = db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).all()
    emp_map = {e.id: e for e in db.query(Employee).all()}
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["nama", "nomor_rekening", "nama_rekening", "nominal", "referensi"])
    missing = []
    total = Decimal("0")
    for item in items:
        emp = emp_map.get(item.employee_id)
        if not emp:
            continue
        if bank and (emp.bank_name or "").lower() != bank.lower():
            continue
        if not emp.bank_account:
            missing.append(emp.full_name)
            continue
        writer.writerow([emp.full_name, emp.bank_account, emp.bank_account_name or emp.full_name,
                         int(item.net_pay), f"GAJI-{run.period}-{emp.employee_id}"])
        total += item.net_pay
    log_audit(db, "payroll_run", run.id, "bank_file", user.id, {"bank": bank, "total": str(total)})
    headers = {"Content-Disposition": f"attachment; filename=bank-file-{run.period}.csv"}
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={**headers, "X-Missing-Accounts": ",".join(missing)})


@router.post("/thr")
def create_thr_run(
    payload: THRRunRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("super_admin", "hr_director", "hr_manager")),
):
    existing = db.query(PayrollRun).filter(
        PayrollRun.period == payload.period, PayrollRun.run_type == "thr").first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Run THR untuk periode tersebut sudah ada")
    run = PayrollRun(period=payload.period, run_type="thr", status="draft", created_by=user.id,
                     notes=f"THR ref {payload.hijri_event_date.isoformat()}")
    db.add(run)
    db.flush()
    employees = db.query(Employee).filter(Employee.status == "active").all()
    total_gross = Decimal("0")
    for emp in employees:
        thr = calculate_thr(emp.base_salary, emp.fixed_allowance or 0, emp.join_date,
                            payload.hijri_event_date)
        if thr <= 0:
            continue
        item = PayrollItem(
            payroll_run_id=run.id, employee_id=emp.id,
            base_salary=emp.base_salary, fixed_allowances=emp.fixed_allowance or 0,
            bonus=thr, total_earnings=thr, net_pay=thr,
            details={"thr": True, "hijri_event_date": payload.hijri_event_date.isoformat()},
        )
        db.add(item)
        total_gross += thr
    run.total_employees = db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).count()
    run.total_gross = total_gross
    run.total_net = total_gross
    run.status = "calculated"
    log_audit(db, "payroll_run", run.id, "thr_calculate", user.id, {"period": payload.period})
    db.commit()
    return {"ok": True, "run_id": run.id, "total_employees": run.total_employees,
            "total_thr": float(total_gross)}


@router.get("/runs/{run_id}/export")
def export_run(
    run_id: str,
    format: str = Query("xlsx"),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*PAYROLL_READ)),
):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payroll run tidak ditemukan")
    items = db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).all()
    emp_map = {e.id: e for e in db.query(Employee).all()}
    if format == "xlsx":
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.title = f"Payroll {run.period}"
        ws.append(["Nama", "NIK Karyawan", "Gaji Pokok", "Tunjangan Tetap", "Lembur",
                   "Bonus", "Total Bruto", "BPJS Kes (1%)", "JHT (2%)", "JP (1%)",
                   "PPh 21", "Total Potongan", "Gaji Bersih"])
        for item in items:
            emp = emp_map.get(item.employee_id)
            ws.append([
                emp.full_name if emp else item.employee_id,
                emp.employee_id if emp else "",
                float(item.base_salary), float(item.fixed_allowances), float(item.overtime_pay),
                float(item.bonus), float(item.total_earnings),
                float(item.bpjs_kes_emp), float(item.bpjs_jht_emp), float(item.bpjs_jp_emp),
                float(item.pph21), float(item.total_deductions), float(item.net_pay),
            ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=payroll-{run.period}.xlsx"},
        )
    return {
        "run": PayrollRunOut.model_validate(run).model_dump(),
        "items": [PayrollItemOut.model_validate(i).model_dump() for i in items],
    }
