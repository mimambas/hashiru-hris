"""Payroll calculation engine (Indonesian PPh 21, BPJS, overtime, THR).

All money is handled with Decimal for precision. Rates follow Indonesian
regulations (UU HPP for PPh 21, BPJS caps per current rules).
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

# Annual PTKP (Penghasilan Tidak Kena Pajak) by status
PTKP: dict[str, Decimal] = {
    "TK/0": Decimal("54000000"),
    "TK/1": Decimal("58500000"),
    "TK/2": Decimal("63000000"),
    "TK/3": Decimal("67500000"),
    "K/0": Decimal("58500000"),
    "K/1": Decimal("63000000"),
    "K/2": Decimal("67500000"),
    "K/3": Decimal("72000000"),
}

# Annual progressive brackets: (upper_bound, rate)
PROGRESSIVE_BRACKETS: list[tuple[Decimal, Decimal]] = [
    (Decimal("60000000"), Decimal("0.00")),
    (Decimal("250000000"), Decimal("0.05")),
    (Decimal("500000000"), Decimal("0.10")),
    (Decimal("5000000000"), Decimal("0.15")),
    (Decimal("10000000000"), Decimal("0.20")),
    (Decimal("Infinity"), Decimal("0.25")),
]

# Configurable caps (overrideable via settings / env in the future)
BPJS_KES_CAP: Decimal = Decimal("12000000")  # per month
JHT_CAP: Decimal = Decimal("10547400")  # per month
JP_CAP: Decimal = Decimal("10547400")  # per month
OVERTIME_DIVISOR = Decimal("173")  # monthly hours divisor

TWOPLACES = Decimal("1")


def _q(value: Decimal) -> Decimal:
    """Quantize to whole rupiah (half up)."""
    return value.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def calculate_pph21_monthly(bruto_monthly: Decimal | float | int, ptkp_status: str) -> Decimal:
    """Monthly PPh 21 using the annualizing method.

    PKP = (bruto_monthly x 12) - PTKP; annual tax via progressive brackets;
    monthly tax = annual / 12.
    """
    bruto = Decimal(str(bruto_monthly))
    ptkp = PTKP.get(ptkp_status, PTKP["TK/0"])
    pkp = bruto * 12 - ptkp
    if pkp <= 0:
        return Decimal("0")
    annual_tax = Decimal("0")
    prev = Decimal("0")
    for upper, rate in PROGRESSIVE_BRACKETS:
        if pkp <= prev:
            break
        taxable = min(pkp, upper) - prev
        annual_tax += taxable * rate
        prev = upper
    return _q(annual_tax / 12)


def calculate_bpjs(wage: Decimal | float | int) -> dict[str, Decimal]:
    """BPJS contributions split employee/company, honoring monthly caps."""
    wage_d = Decimal(str(wage))
    kes_base = min(wage_d, BPJS_KES_CAP)
    jht_base = min(wage_d, JHT_CAP)
    jp_base = min(wage_d, JP_CAP)
    return {
        "kes_employee": _q(kes_base * Decimal("0.01")),
        "kes_company": _q(kes_base * Decimal("0.04")),
        "jht_employee": _q(jht_base * Decimal("0.02")),
        "jht_company": _q(jht_base * Decimal("0.037")),
        "jp_employee": _q(jp_base * Decimal("0.01")),
        "jp_company": _q(jp_base * Decimal("0.02")),
    }


def calculate_overtime(
    hours: Decimal | float | int, hourly_rate: Decimal | float | int, is_holiday: bool = False
) -> Decimal:
    """Overtime pay: first hour 1.5x, subsequent 2x (2x/3x on holidays)."""
    hours_d = Decimal(str(hours))
    rate = Decimal(str(hourly_rate))
    if hours_d <= 0:
        return Decimal("0")
    first = min(hours_d, Decimal("1"))
    rest = hours_d - first
    if is_holiday:
        total = first * rate * 2 + rest * rate * 3
    else:
        total = first * rate * Decimal("1.5") + rest * rate * 2
    return _q(total)


def calculate_thr(
    base_salary: Decimal | float | int,
    fixed_allowance: Decimal | float | int,
    join_date: date,
    ref_date: date,
) -> Decimal:
    """THR = (base + fixed allowance) x (months worked in last 12 / 12).

    Employees with less than 1 month tenure get no THR (PP 78/2015).
    """
    months = (ref_date.year - join_date.year) * 12 + (ref_date.month - join_date.month)
    if ref_date.day < join_date.day:
        months -= 1
    months_worked = max(0, min(12, months))
    if months_worked < 1:
        return Decimal("0")
    base = Decimal(str(base_salary)) + Decimal(str(fixed_allowance))
    return _q(base * Decimal(months_worked) / Decimal("12"))


def calculate_employee_pay(
    base_salary: Decimal | float | int,
    fixed_allowance: Decimal | float | int = 0,
    overtime_hours: Decimal | float | int = 0,
    overtime_is_holiday: bool = False,
    bonus: Decimal | float | int = 0,
    commission: Decimal | float | int = 0,
    other_deductions: Decimal | float | int = 0,
    ptkp_status: str = "TK/0",
) -> dict[str, Decimal]:
    """Full per-employee payroll computation returning every line item."""
    base = Decimal(str(base_salary))
    fixed = Decimal(str(fixed_allowance))
    hourly_rate = base / OVERTIME_DIVISOR if base > 0 else Decimal("0")
    overtime_pay = calculate_overtime(overtime_hours, hourly_rate, overtime_is_holiday)
    bonus_d = Decimal(str(bonus))
    commission_d = Decimal(str(commission))
    total_earnings = base + fixed + overtime_pay + bonus_d + commission_d

    bpjs = calculate_bpjs(base + fixed)
    pph21 = calculate_pph21_monthly(total_earnings, ptkp_status)
    other_d = Decimal(str(other_deductions))
    total_deductions = (
        bpjs["kes_employee"]
        + bpjs["jht_employee"]
        + bpjs["jp_employee"]
        + pph21
        + other_d
    )
    net_pay = total_earnings - total_deductions
    return {
        "base_salary": _q(base),
        "fixed_allowances": _q(fixed),
        "overtime_pay": overtime_pay,
        "bonus": _q(bonus_d),
        "commission": _q(commission_d),
        "total_earnings": _q(total_earnings),
        "bpjs_kes_emp": bpjs["kes_employee"],
        "bpjs_kes_co": bpjs["kes_company"],
        "bpjs_jht_emp": bpjs["jht_employee"],
        "bpjs_jht_co": bpjs["jht_company"],
        "bpjs_jp_emp": bpjs["jp_employee"],
        "bpjs_jp_co": bpjs["jp_company"],
        "pph21": pph21,
        "other_deductions": _q(other_d),
        "total_deductions": _q(total_deductions),
        "net_pay": _q(net_pay),
    }


def run_payroll(db, period: str) -> dict:
    """Calculate payroll items for all active employees for a YYYY-MM period.

    Returns the refreshed run summary. Safe to call repeatedly on a draft run
    (existing items are replaced).
    """
    from sqlalchemy import func
    from datetime import date as date_cls

    from app.models import AttendanceRecord, Employee, PayrollItem, PayrollRun

    year, month = int(period[:4]), int(period[5:7])
    run = db.query(PayrollRun).filter(PayrollRun.period == period).first()
    if run is None:
        raise ValueError("Periode payroll tidak ditemukan")
    if run.status not in ("draft", "calculated"):
        raise ValueError("Hanya run berstatus draft yang dapat dihitung ulang")

    # Remove previous items (recalculation of a draft)
    db.query(PayrollItem).filter(PayrollItem.payroll_run_id == run.id).delete()

    employees = db.query(Employee).filter(Employee.status == "active").order_by(Employee.full_name).all()
    period_start = date_cls(year, month, 1)
    period_end = date_cls(year + 1, 1, 1) if month == 12 else date_cls(year, month + 1, 1)
    ot_rows = (
        db.query(AttendanceRecord.employee_id, func.sum(AttendanceRecord.overtime_hours))
        .filter(AttendanceRecord.date >= period_start, AttendanceRecord.date < period_end)
        .group_by(AttendanceRecord.employee_id)
        .all()
    )
    ot_map = {emp_id: (total or 0) for emp_id, total in ot_rows}

    total_gross = Decimal("0")
    total_net = Decimal("0")
    for emp in employees:
        calc = calculate_employee_pay(
            base_salary=emp.base_salary,
            fixed_allowance=emp.fixed_allowance or 0,
            overtime_hours=ot_map.get(emp.id, 0),
            ptkp_status=emp.ptkp_status or "TK/0",
        )
        item = PayrollItem(
            payroll_run_id=run.id,
            employee_id=emp.id,
            base_salary=calc["base_salary"],
            fixed_allowances=calc["fixed_allowances"],
            overtime_pay=calc["overtime_pay"],
            bonus=calc["bonus"],
            commission=calc["commission"],
            total_earnings=calc["total_earnings"],
            bpjs_kes_emp=calc["bpjs_kes_emp"],
            bpjs_kes_co=calc["bpjs_kes_co"],
            bpjs_jht_emp=calc["bpjs_jht_emp"],
            bpjs_jht_co=calc["bpjs_jht_co"],
            bpjs_jp_emp=calc["bpjs_jp_emp"],
            bpjs_jp_co=calc["bpjs_jp_co"],
            pph21=calc["pph21"],
            other_deductions=calc["other_deductions"],
            total_deductions=calc["total_deductions"],
            net_pay=calc["net_pay"],
            details={
                "ptkp_status": emp.ptkp_status or "TK/0",
                "overtime_hours": float(ot_map.get(emp.id, 0) or 0),
            },
        )
        db.add(item)
        total_gross += calc["total_earnings"]
        total_net += calc["net_pay"]

    run.total_employees = len(employees)
    run.total_gross = total_gross
    run.total_net = total_net
    run.status = "calculated"
    db.commit()
    db.refresh(run)
    return {
        "id": run.id,
        "period": run.period,
        "status": run.status,
        "total_employees": run.total_employees,
        "total_gross": float(run.total_gross),
        "total_net": float(run.total_net),
    }
