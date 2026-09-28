"""Pydantic v2 request/response schemas for the HRIS API."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeEmployee(OrmModel):
    id: str
    employee_id: str
    full_name: str
    photo_url: str | None = None


class MeResponse(OrmModel):
    id: str
    email: str
    role: str
    employee: MeEmployee | None = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: str = "employee"
    employee_id: str | None = None


class UserOut(OrmModel):
    id: str
    email: str
    role: str
    employee_id: str | None = None
    is_active: bool


# ---------- Org ----------
class DepartmentCreate(BaseModel):
    name: str
    code: str
    parent_id: str | None = None
    head_id: str | None = None
    cost_center: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    parent_id: str | None = None
    head_id: str | None = None
    cost_center: str | None = None


class DepartmentOut(OrmModel):
    id: str
    name: str
    code: str
    parent_id: str | None = None
    head_id: str | None = None
    cost_center: str | None = None


class PositionCreate(BaseModel):
    title: str
    code: str
    level: str | None = None
    grade: str | None = None
    department_id: str | None = None
    min_salary: Decimal | None = None
    max_salary: Decimal | None = None


class PositionOut(OrmModel):
    id: str
    title: str
    code: str
    level: str | None = None
    grade: str | None = None
    department_id: str | None = None
    min_salary: Decimal | None = None
    max_salary: Decimal | None = None


# ---------- Employee ----------
SELF_EDITABLE_FIELDS = {
    "phone", "email", "address_domisili", "address_ktp",
    "emergency_contact_name", "emergency_contact_phone",
    "emergency_contact_relation", "photo_url",
}


class EmployeeCreate(BaseModel):
    full_name: str
    nik: str | None = None
    npwp: str | None = None
    place_of_birth: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    blood_type: str | None = None
    religion: str | None = None
    marital_status: str | None = None
    phone: str | None = None
    email: EmailStr
    address_ktp: str | None = None
    address_domisili: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None
    join_date: date
    contract_start: date | None = None
    contract_end: date | None = None
    probation_end: date | None = None
    employment_status: str | None = None
    employment_type: str | None = None
    department_id: str | None = None
    position_id: str | None = None
    reporting_to: str | None = None
    branch: str | None = None
    base_salary: Decimal = Decimal("0")
    fixed_allowance: Decimal = Decimal("0")
    bank_name: str | None = None
    bank_account: str | None = None
    bank_account_name: str | None = None
    bpjs_kesehatan_no: str | None = None
    bpjs_ketenagakerjaan_no: str | None = None
    ptkp_status: str = "TK/0"
    status: str = "active"


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    nik: str | None = None
    npwp: str | None = None
    place_of_birth: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    blood_type: str | None = None
    religion: str | None = None
    marital_status: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address_ktp: str | None = None
    address_domisili: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None
    join_date: date | None = None
    contract_start: date | None = None
    contract_end: date | None = None
    probation_end: date | None = None
    employment_status: str | None = None
    employment_type: str | None = None
    department_id: str | None = None
    position_id: str | None = None
    reporting_to: str | None = None
    branch: str | None = None
    base_salary: Decimal | None = None
    fixed_allowance: Decimal | None = None
    bank_name: str | None = None
    bank_account: str | None = None
    bank_account_name: str | None = None
    bpjs_kesehatan_no: str | None = None
    bpjs_ketenagakerjaan_no: str | None = None
    ptkp_status: str | None = None
    status: str | None = None
    photo_url: str | None = None


class EmployeeListItem(OrmModel):
    id: str
    employee_id: str
    full_name: str
    email: str
    phone: str | None = None
    department: DepartmentOut | None = None
    position: PositionOut | None = None
    status: str
    join_date: date
    photo_url: str | None = None


class EmployeeDetail(EmployeeListItem):
    nik: str | None = None
    npwp: str | None = None
    place_of_birth: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    blood_type: str | None = None
    religion: str | None = None
    marital_status: str | None = None
    address_ktp: str | None = None
    address_domisili: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None
    contract_start: date | None = None
    contract_end: date | None = None
    probation_end: date | None = None
    employment_status: str | None = None
    employment_type: str | None = None
    reporting_to: str | None = None
    branch: str | None = None
    base_salary: Decimal
    fixed_allowance: Decimal
    bank_name: str | None = None
    bank_account: str | None = None
    bank_account_name: str | None = None
    bpjs_kesehatan_no: str | None = None
    bpjs_ketenagakerjaan_no: str | None = None
    ptkp_status: str


# ---------- Attendance ----------
class CheckInRequest(BaseModel):
    latitude: float | None = None
    longitude: float | None = None


class ManualAttendanceRequest(BaseModel):
    employee_id: str
    date: date
    check_in: datetime | None = None
    check_out: datetime | None = None
    reason: str


class AttendanceOut(OrmModel):
    id: str
    employee_id: str
    date: date
    check_in: datetime | None = None
    check_out: datetime | None = None
    status: str
    late_minutes: int
    overtime_hours: Decimal
    source: str
    is_manual: bool


class AttendanceSettings(BaseModel):
    grace_period_minutes: int = 15
    work_start: str = "09:00"
    work_end: str = "18:00"
    overtime_min_minutes: int = 30
    max_overtime_hours: int = 3


# ---------- Leave ----------
class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: str | None = None
    attachment_url: str | None = None


class LeaveRejectRequest(BaseModel):
    reason: str


class LeaveRequestOut(OrmModel):
    id: str
    employee_id: str
    leave_type: str
    start_date: date
    end_date: date
    total_days: int
    reason: str | None = None
    attachment_url: str | None = None
    status: str
    current_approver_role: str | None = None
    approvals: list = []


class LeaveBalanceOut(OrmModel):
    id: str
    employee_id: str
    leave_type: str
    year: int
    total_days: int
    used_days: int
    remaining_days: int = 0


# ---------- Payroll ----------
class PayrollRunCreate(BaseModel):
    period: str = Field(pattern=r"^\d{4}-\d{2}$")


class PayrollRunOut(OrmModel):
    id: str
    period: str
    run_type: str
    status: str
    total_employees: int
    total_gross: Decimal
    total_net: Decimal
    created_by: str | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    rejection_comment: str | None = None


class PayrollItemOut(OrmModel):
    id: str
    payroll_run_id: str
    employee_id: str
    base_salary: Decimal
    fixed_allowances: Decimal
    overtime_pay: Decimal
    bonus: Decimal
    commission: Decimal
    total_earnings: Decimal
    bpjs_kes_emp: Decimal
    bpjs_kes_co: Decimal
    bpjs_jht_emp: Decimal
    bpjs_jht_co: Decimal
    bpjs_jp_emp: Decimal
    bpjs_jp_co: Decimal
    pph21: Decimal
    other_deductions: Decimal
    total_deductions: Decimal
    net_pay: Decimal
    details: dict = {}


class PayrollApproveRequest(BaseModel):
    approve: bool
    comment: str | None = None


class THRRunRequest(BaseModel):
    period: str = Field(pattern=r"^\d{4}-\d{2}$")
    hijri_event_date: date


# ---------- Expenses ----------
class ExpenseCreate(BaseModel):
    claim_date: date
    type: str
    amount: Decimal = Field(gt=0)
    description: str | None = None
    receipt_url: str | None = None


class ExpenseOut(OrmModel):
    id: str
    employee_id: str
    claim_date: date
    type: str
    amount: Decimal
    description: str | None = None
    receipt_url: str | None = None
    status: str
    rejection_reason: str | None = None
    approvals: list = []
    needs_director: bool


# ---------- Recruitment ----------
class JobCreate(BaseModel):
    title: str
    department_id: str | None = None
    location: str | None = None
    description: str | None = None
    requirements: str | None = None
    salary_min: Decimal | None = None
    salary_max: Decimal | None = None
    employment_type: str | None = None
    status: str = "draft"


class JobOut(OrmModel):
    id: str
    title: str
    department_id: str | None = None
    location: str | None = None
    description: str | None = None
    requirements: str | None = None
    salary_min: Decimal | None = None
    salary_max: Decimal | None = None
    employment_type: str | None = None
    status: str


class ApplicantCreate(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    resume_url: str | None = None
    cover_letter: str | None = None
    source: str | None = None


class ApplicantUpdate(BaseModel):
    current_stage: str | None = None
    status: str | None = None
    notes: str | None = None
    score: int | None = None


class ApplicantOut(OrmModel):
    id: str
    job_id: str
    full_name: str
    email: str | None = None
    phone: str | None = None
    resume_url: str | None = None
    cover_letter: str | None = None
    source: str | None = None
    current_stage: str
    status: str
    score: int | None = None
    notes: str | None = None


class ApplicantStageUpdate(BaseModel):
    stage: str


class InterviewCreate(BaseModel):
    applicant_id: str
    scheduled_at: datetime
    interviewers: list[str] = []
    type: str | None = None
    notes: str | None = None


class InterviewOut(OrmModel):
    id: str
    applicant_id: str
    scheduled_at: datetime
    interviewers: list = []
    type: str | None = None
    notes: str | None = None
    result: str | None = None


# ---------- Onboarding / Offboarding ----------
class OnboardingTaskOut(OrmModel):
    id: str
    employee_id: str
    title: str
    assignee: str | None = None
    due_date: date | None = None
    status: str
    sort_order: int


class OnboardingGenerateRequest(BaseModel):
    template: str | None = None


class OffboardingCreate(BaseModel):
    employee_id: str
    last_date: date
    type: str = Field(pattern="^(resign|terminate)$")
    reason: str | None = None


class OffboardingOut(OrmModel):
    id: str
    employee_id: str
    last_date: date
    type: str
    reason: str | None = None
    status: str
    tasks: list = []
    settlement: dict = {}


# ---------- Documents ----------
class DocumentOut(OrmModel):
    id: str
    employee_id: str
    category: str
    name: str
    file_path: str
    file_type: str | None = None
    file_size: int | None = None
    verified: bool
    created_at: datetime


# ---------- Settings / misc ----------
class OkResponse(BaseModel):
    ok: bool = True
