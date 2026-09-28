"""Accuracy tests for the payroll engine: PPh 21, BPJS, overtime, THR."""
from datetime import date
from decimal import Decimal

from app.services import payroll as pe


# ---------- PPh 21 ----------
def test_pph21_8jt_tk0_is_zero():
    # PKP = 96jt - 54jt = 42jt -> within the 0% bracket
    assert pe.calculate_pph21_monthly(Decimal("8000000"), "TK/0") == Decimal("0")


def test_pph21_20jt_k1():
    # PKP = 240jt - 63jt = 177jt
    # tax = (177jt - 60jt) * 5% = 5.850.000 / yr -> 487.500 / mo
    assert pe.calculate_pph21_monthly(Decimal("20000000"), "K/1") == Decimal("487500")


def test_pph21_60jt_k3():
    # PKP = 720jt - 72jt = 648jt
    # tax = 190jt*5% + 250jt*10% + 148jt*15% = 56.700.000 / yr -> 4.725.000 / mo
    assert pe.calculate_pph21_monthly(Decimal("60000000"), "K/3") == Decimal("4725000")


def test_pph21_zero_when_below_ptkp():
    assert pe.calculate_pph21_monthly(Decimal("4000000"), "TK/0") == Decimal("0")


def test_pph21_top_bracket():
    # bruto 1M / mo -> PKP = 12M - 54jt... use 1_000_000_000/mo -> PKP ~ 11.9M jt
    tax = pe.calculate_pph21_monthly(Decimal("1000000000"), "TK/0")
    assert tax > Decimal("0")
    # sanity: effective monthly rate below 25%
    assert tax < Decimal("1000000000") * Decimal("0.25")


# ---------- BPJS ----------
def test_bpjs_below_caps():
    r = pe.calculate_bpjs(Decimal("10000000"))
    assert r["kes_employee"] == Decimal("100000")
    assert r["kes_company"] == Decimal("400000")
    assert r["jht_employee"] == Decimal("200000")
    assert r["jht_company"] == Decimal("370000")
    assert r["jp_employee"] == Decimal("100000")
    assert r["jp_company"] == Decimal("200000")


def test_bpjs_caps_applied():
    r = pe.calculate_bpjs(Decimal("15000000"))
    # Kesehatan capped at 12jt
    assert r["kes_employee"] == Decimal("120000")
    assert r["kes_company"] == Decimal("480000")
    # JHT/JP capped at 10.547.400
    assert r["jht_employee"] == Decimal("210948")
    assert r["jht_company"] == Decimal("390254")
    assert r["jp_employee"] == Decimal("105474")
    assert r["jp_company"] == Decimal("210948")


# ---------- Overtime ----------
def test_overtime_normal_day():
    # 2h @ 50k/h -> 1.5x first hour + 2x second = 175.000
    assert pe.calculate_overtime(2, 50000) == Decimal("175000")


def test_overtime_holiday():
    # 2h @ 50k/h holiday -> 2x first + 3x rest = 250.000
    assert pe.calculate_overtime(2, 50000, is_holiday=True) == Decimal("250000")


def test_overtime_zero_hours():
    assert pe.calculate_overtime(0, 50000) == Decimal("0")


# ---------- THR ----------
def test_thr_full_year():
    thr = pe.calculate_thr(Decimal("10000000"), Decimal("2000000"),
                           date(2024, 1, 15), date(2026, 3, 20))
    assert thr == Decimal("12000000")


def test_thr_pro_rata():
    # join 2025-10-01 -> 5 full months by 2026-03-20
    thr = pe.calculate_thr(Decimal("10000000"), Decimal("2000000"),
                           date(2025, 10, 1), date(2026, 3, 20))
    assert thr == Decimal("5000000")


def test_thr_less_than_one_month_is_zero():
    thr = pe.calculate_thr(Decimal("10000000"), Decimal("0"),
                           date(2026, 3, 15), date(2026, 3, 20))
    assert thr == Decimal("0")


# ---------- Full employee calc ----------
def test_full_payroll_calc_consistency():
    c = pe.calculate_employee_pay(base_salary=Decimal("8000000"), ptkp_status="TK/0")
    assert c["total_earnings"] == c["base_salary"] + c["fixed_allowances"] + c["overtime_pay"]
    assert c["net_pay"] == c["total_earnings"] - c["total_deductions"]
    assert c["pph21"] == Decimal("0")
    # 8jt wage: kes 1% = 80k, jht 2% = 160k, jp 1% = 80k
    assert c["bpjs_kes_emp"] == Decimal("80000")
    assert c["bpjs_jht_emp"] == Decimal("160000")
    assert c["bpjs_jp_emp"] == Decimal("80000")
