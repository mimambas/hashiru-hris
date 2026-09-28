"""Aggregate reports (JSON, with xlsx export for headcount & payroll)."""
import io
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_role
from app.models import (
    AttendanceRecord,
    Department,
    Employee,
    ExpenseClaim,
    LeaveRequest,
    PayrollItem,
    PayrollRun,
)

router = APIRouter()

REPORT_ROLES = ("super_admin", "hr_director", "hr_manager", "hr_officer", "finance_officer")


def _xlsx(title: str, headers: list[str], rows: list[list]) -> StreamingResponse:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={title}.xlsx"},
    )


def _dept_name(db: Session, dept_id: str | None) -> str | None:
    if not dept_id:
        return None
    d = db.query(Department).filter(Department.id == dept_id).first()
    return d.name if d else None


@router.get("/headcount")
def headcount(
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None, alias="to"),
    format: str = Query("json"),
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    q = db.query(Employee)
    if to:
        q = q.filter(Employee.join_date <= to)
    employees = q.order_by(Employee.full_name).all()
    rows = [
        [e.full_name, e.employee_id, _dept_name(db, e.department_id), e.status, e.join_date.isoformat()]
        for e in employees
    ]
    if format == "xlsx":
        return _xlsx("headcount", ["Nama", "ID Karyawan", "Departemen", "Status", "Tanggal Bergabung"], rows)
    by_dept: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for e in employees:
        by_dept[_dept_name(db, e.department_id) or "Tanpa departemen"] = \
            by_dept.get(_dept_name(db, e.department_id) or "Tanpa departemen", 0) + 1
        by_status[e.status] = by_status.get(e.status, 0) + 1
    return {"total": len(employees), "by_department": by_dept, "by_status": by_status, "employees": rows}


@router.get("/turnover")
def turnover(
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    from_ = from_ or date(date.today().year, 1, 1)
    to = to or date.today()
    # Exits approximated by employees whose status left active in period: use inactive + audit
    exits = db.query(Employee).filter(Employee.status != "active").count()
    avg_headcount = max(db.query(Employee).count(), 1)
    return {
        "from": from_.isoformat(), "to": to.isoformat(),
        "exits": exits, "avg_headcount": avg_headcount,
        "turnover_rate_pct": round(exits / avg_headcount * 100, 2),
    }


@router.get("/attendance")
def attendance_report(
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None, alias="to"),
    department_id: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    from_ = from_ or date.today().replace(day=1)
    to = to or date.today()
    q = db.query(AttendanceRecord).filter(AttendanceRecord.date >= from_, AttendanceRecord.date <= to)
    if department_id:
        emp_ids = [e.id for e in db.query(Employee).filter(Employee.department_id == department_id).all()]
        q = q.filter(AttendanceRecord.employee_id.in_(emp_ids))
    rows = q.all()
    by_status: dict[str, int] = {}
    late_total = 0
    for r in rows:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        late_total += r.late_minutes or 0
    present = by_status.get("present", 0) + by_status.get("late", 0) + by_status.get("wfh", 0)
    total = sum(by_status.values())
    return {
        "from": from_.isoformat(), "to": to.isoformat(),
        "by_status": by_status, "total_late_minutes": late_total,
        "attendance_rate_pct": round(present / total * 100, 2) if total else 0,
    }


@router.get("/leave")
def leave_report(
    year: int = Query(date.today().year),
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    rows = (
        db.query(LeaveRequest.leave_type, func.count(LeaveRequest.id), func.sum(LeaveRequest.total_days))
        .filter(LeaveRequest.status == "approved")
        .filter(LeaveRequest.start_date >= date(year, 1, 1),
                LeaveRequest.start_date < date(year + 1, 1, 1))
        .group_by(LeaveRequest.leave_type)
        .all()
    )
    return {
        "year": year,
        "by_type": [{"leave_type": lt, "requests": c, "total_days": int(s or 0)} for lt, c, s in rows],
    }


@router.get("/overtime")
def overtime_report(
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    from_ = from_ or date.today().replace(day=1)
    to = to or date.today()
    rows = (
        db.query(AttendanceRecord.employee_id, func.sum(AttendanceRecord.overtime_hours))
        .filter(AttendanceRecord.date >= from_, AttendanceRecord.date <= to)
        .group_by(AttendanceRecord.employee_id)
        .all()
    )
    emp_map = {e.id: e.full_name for e in db.query(Employee).all()}
    items = [{"employee": emp_map.get(eid, eid), "overtime_hours": float(h or 0)} for eid, h in rows if h]
    return {"from": from_.isoformat(), "to": to.isoformat(),
            "total_hours": round(sum(i["overtime_hours"] for i in items), 2), "items": items}


def _run_or_404(db: Session, period: str) -> PayrollRun:
    from fastapi import HTTPException, status as http_status
    run = db.query(PayrollRun).filter(PayrollRun.period == period).first()
    if not run:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Payroll run tidak ditemukan")
    return run


@router.get("/payroll")
def payroll_report(
    period: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    run = _run_or_404(db, period)
    items = db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).all()
    emp_map = {e.id: e for e in db.query(Employee).all()}
    by_dept: dict[str, dict] = {}
    for i in items:
        emp = emp_map.get(i.employee_id)
        dept = _dept_name(db, emp.department_id) if emp else "Tanpa departemen"
        d = by_dept.setdefault(dept, {"employees": 0, "gross": 0.0, "net": 0.0})
        d["employees"] += 1
        d["gross"] += float(i.total_earnings)
        d["net"] += float(i.net_pay)
    return {
        "period": period, "status": run.status,
        "total_employees": run.total_employees,
        "total_gross": float(run.total_gross), "total_net": float(run.total_net),
        "by_department": by_dept,
    }


@router.get("/pph21")
def pph21_report(
    period: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    run = _run_or_404(db, period)
    items = db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).all()
    emp_map = {e.id: e.full_name for e in db.query(Employee).all()}
    rows = [{"employee": emp_map.get(i.employee_id), "ptkp": (i.details or {}).get("ptkp_status"),
             "bruto": float(i.total_earnings), "pph21": float(i.pph21)} for i in items]
    return {"period": period, "total_pph21": sum(r["pph21"] for r in rows), "items": rows}


@router.get("/bpjs")
def bpjs_report(
    period: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    run = _run_or_404(db, period)
    items = db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).all()
    totals = {"kes_emp": Decimal("0"), "kes_co": Decimal("0"), "jht_emp": Decimal("0"),
              "jht_co": Decimal("0"), "jp_emp": Decimal("0"), "jp_co": Decimal("0")}
    for i in items:
        totals["kes_emp"] += i.bpjs_kes_emp
        totals["kes_co"] += i.bpjs_kes_co
        totals["jht_emp"] += i.bpjs_jht_emp
        totals["jht_co"] += i.bpjs_jht_co
        totals["jp_emp"] += i.bpjs_jp_emp
        totals["jp_co"] += i.bpjs_jp_co
    return {"period": period, **{k: float(v) for k, v in totals.items()}}


@router.get("/new-hires")
def new_hires(
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    from_ = from_ or date.today().replace(day=1)
    to = to or date.today()
    hires = (
        db.query(Employee)
        .filter(Employee.join_date >= from_, Employee.join_date <= to)
        .order_by(Employee.join_date)
        .all()
    )
    return {"from": from_.isoformat(), "to": to.isoformat(), "count": len(hires),
            "hires": [{"name": e.full_name, "join_date": e.join_date.isoformat(),
                       "department": _dept_name(db, e.department_id)} for e in hires]}


@router.get("/exits")
def exits(
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    user=Depends(require_role(*REPORT_ROLES)),
):
    from_ = from_ or date.today().replace(day=1)
    to = to or date.today()
    departed = db.query(Employee).filter(Employee.status != "active").order_by(Employee.full_name).all()
    return {"from": from_.isoformat(), "to": to.isoformat(), "count": len(departed),
            "exits": [{"name": e.full_name, "status": e.status,
                       "department": _dept_name(db, e.department_id)} for e in departed]}
