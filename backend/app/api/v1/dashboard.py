"""Dashboard KPIs, charts and alerts."""
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_role
from app.models import AttendanceRecord, Department, Employee, LeaveRequest, PayrollRun

router = APIRouter()

DASH_ROLES = ("super_admin", "hr_director", "hr_manager", "hr_officer", "recruiter",
              "finance_officer", "dept_manager", "team_leader")


@router.get("/kpis")
def kpis(db: Session = Depends(get_db), user=Depends(require_role(*DASH_ROLES))):
    today = date.today()
    month_start = today.replace(day=1)
    headcount = db.query(Employee).filter(Employee.status == "active").count()
    new_hires = db.query(Employee).filter(Employee.join_date >= month_start).count()
    resigned = db.query(Employee).filter(Employee.status != "active").count()
    turnover = round(resigned / max(headcount + resigned, 1) * 100, 2)
    period = today.strftime("%Y-%m")
    run = db.query(PayrollRun).filter(PayrollRun.period == period).first()
    payroll_mtd = float(run.total_net) if run else 0.0
    records = db.query(AttendanceRecord).filter(AttendanceRecord.date == today).all()
    present = sum(1 for r in records if r.status in ("present", "late", "wfh"))
    attendance_rate = round(present / len(records) * 100, 2) if records else 0.0
    return {
        "headcount": headcount,
        "new_hires_mtd": new_hires,
        "turnover_mtd_pct": turnover,
        "payroll_mtd": payroll_mtd,
        "attendance_rate_today": attendance_rate,
    }


@router.get("/charts/headcount-trend")
def headcount_trend(months: int = Query(12, ge=1, le=36), db: Session = Depends(get_db),
                    user=Depends(require_role(*DASH_ROLES))):
    today = date.today()
    points = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year + (m - 1) // 12
        m = (m - 1) % 12 + 1
        cutoff = date(y, m, 1)
        count = db.query(Employee).filter(Employee.join_date < cutoff,
                                          Employee.status == "active").count()
        points.append({"month": cutoff.strftime("%Y-%m"), "headcount": count})
    return {"points": points}


@router.get("/charts/department-distribution")
def department_distribution(db: Session = Depends(get_db), user=Depends(require_role(*DASH_ROLES))):
    rows = (
        db.query(Department.name, func.count(Employee.id))
        .outerjoin(Employee, (Employee.department_id == Department.id) & (Employee.status == "active"))
        .group_by(Department.name)
        .all()
    )
    return {"distribution": [{"department": n, "count": c} for n, c in rows]}


@router.get("/charts/payroll-by-department")
def payroll_by_department(
    period: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    user=Depends(require_role(*DASH_ROLES)),
):
    from app.models import PayrollItem

    run = db.query(PayrollRun).filter(PayrollRun.period == period).first()
    if not run:
        return {"period": period, "departments": []}
    items = db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).all()
    dept_map = {d.id: d.name for d in db.query(Department).all()}
    emp_map = {e.id: e.department_id for e in db.query(Employee).all()}
    agg: dict[str, Decimal] = {}
    for i in items:
        name = dept_map.get(emp_map.get(i.employee_id) or "", "Tanpa departemen")
        agg[name] = agg.get(name, Decimal("0")) + i.net_pay
    return {"period": period, "departments": [{"department": k, "total_net": float(v)} for k, v in agg.items()]}


@router.get("/charts/leave-by-type")
def leave_by_type(year: int = Query(date.today().year), db: Session = Depends(get_db),
                  user=Depends(require_role(*DASH_ROLES))):
    rows = (
        db.query(LeaveRequest.leave_type, func.sum(LeaveRequest.total_days))
        .filter(LeaveRequest.status == "approved")
        .filter(LeaveRequest.start_date >= date(year, 1, 1),
                LeaveRequest.start_date < date(year + 1, 1, 1))
        .group_by(LeaveRequest.leave_type)
        .all()
    )
    return {"year": year, "by_type": [{"leave_type": lt, "days": int(s or 0)} for lt, s in rows]}


@router.get("/alerts")
def alerts(db: Session = Depends(get_db), user=Depends(require_role(*DASH_ROLES))):
    today = date.today()
    horizon = today + timedelta(days=30)
    contract_alerts = [
        {"employee": e.full_name, "type": "contract_end", "date": e.contract_end.isoformat()}
        for e in db.query(Employee).filter(
            Employee.status == "active",
            Employee.contract_end.isnot(None),
            Employee.contract_end <= horizon,
        ).all()
    ]
    probation_alerts = [
        {"employee": e.full_name, "type": "probation_end", "date": e.probation_end.isoformat()}
        for e in db.query(Employee).filter(
            Employee.status == "active",
            Employee.probation_end.isnot(None),
            Employee.probation_end <= horizon,
        ).all()
    ]
    birthdays = [
        {"employee": e.full_name, "type": "birthday", "date": e.date_of_birth.isoformat()}
        for e in db.query(Employee).filter(
            Employee.status == "active", Employee.date_of_birth.isnot(None)).all()
        if e.date_of_birth.month == today.month
    ]
    return {
        "contract_ending_soon": contract_alerts,
        "probation_ending_soon": probation_alerts,
        "birthdays_this_month": birthdays,
    }
