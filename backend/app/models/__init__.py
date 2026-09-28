"""SQLAlchemy ORM models for the HRIS backend.

Conventions: UUID primary keys stored as String(36) (compatible with SQLite
and Postgres), money as Numeric(18,2), generic JSON type (works on both).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="employee")
    employee_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    head_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    cost_center: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    min_salary: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    max_salary: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    nik: Mapped[str | None] = mapped_column(String(16), unique=True, nullable=True)
    npwp: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    place_of_birth: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(5), nullable=True)
    religion: Mapped[str | None] = mapped_column(String(30), nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    address_ktp: Mapped[str | None] = mapped_column(Text, nullable=True)
    address_domisili: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    emergency_contact_relation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    join_date = mapped_column(Date, nullable=False)
    contract_start = mapped_column(Date, nullable=True)
    contract_end = mapped_column(Date, nullable=True)
    probation_end = mapped_column(Date, nullable=True)
    employment_status: Mapped[str | None] = mapped_column(String(30), nullable=True)  # contract/permanent/outsourcing
    employment_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    position_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("positions.id"), nullable=True)
    reporting_to: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(100), nullable=True)
    base_salary = mapped_column(Numeric(18, 2), nullable=False, default=0)
    fixed_allowance = mapped_column(Numeric(18, 2), nullable=False, default=0)
    bank_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_account: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_account_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    bpjs_kesehatan_no: Mapped[str | None] = mapped_column(String(30), nullable=True)
    bpjs_ketenagakerjaan_no: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ptkp_status: Mapped[str] = mapped_column(String(10), nullable=False, default="TK/0")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", index=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (UniqueConstraint("employee_id", "date", name="uq_attendance_employee_date"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    date = mapped_column(Date, nullable=False, index=True)
    check_in: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    check_out: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="present")
    late_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    overtime_hours = mapped_column(Numeric(6, 2), default=0, nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="self", nullable=False)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    leave_type: Mapped[str] = mapped_column(String(10), nullable=False)
    start_date = mapped_column(Date, nullable=False)
    end_date = mapped_column(Date, nullable=False)
    total_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)
    current_approver_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    approvals = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    __table_args__ = (UniqueConstraint("employee_id", "leave_type", "year", name="uq_leave_balance"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    leave_type: Mapped[str] = mapped_column(String(10), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    total_days: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    used_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    period: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # YYYY-MM
    run_type: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)  # monthly/thr
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)  # draft/calculated/approved/paid/rejected
    total_employees: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_gross = mapped_column(Numeric(18, 2), default=0, nullable=False)
    total_net = mapped_column(Numeric(18, 2), default=0, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    rejection_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class PayrollItem(Base):
    __tablename__ = "payroll_items"
    __table_args__ = (UniqueConstraint("payroll_run_id", "employee_id", name="uq_payroll_item"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    payroll_run_id: Mapped[str] = mapped_column(String(36), ForeignKey("payroll_runs.id"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    base_salary = mapped_column(Numeric(18, 2), default=0, nullable=False)
    fixed_allowances = mapped_column(Numeric(18, 2), default=0, nullable=False)
    overtime_pay = mapped_column(Numeric(18, 2), default=0, nullable=False)
    bonus = mapped_column(Numeric(18, 2), default=0, nullable=False)
    commission = mapped_column(Numeric(18, 2), default=0, nullable=False)
    total_earnings = mapped_column(Numeric(18, 2), default=0, nullable=False)
    bpjs_kes_emp = mapped_column(Numeric(18, 2), default=0, nullable=False)
    bpjs_kes_co = mapped_column(Numeric(18, 2), default=0, nullable=False)
    bpjs_jht_emp = mapped_column(Numeric(18, 2), default=0, nullable=False)
    bpjs_jht_co = mapped_column(Numeric(18, 2), default=0, nullable=False)
    bpjs_jp_emp = mapped_column(Numeric(18, 2), default=0, nullable=False)
    bpjs_jp_co = mapped_column(Numeric(18, 2), default=0, nullable=False)
    pph21 = mapped_column(Numeric(18, 2), default=0, nullable=False)
    other_deductions = mapped_column(Numeric(18, 2), default=0, nullable=False)
    total_deductions = mapped_column(Numeric(18, 2), default=0, nullable=False)
    net_pay = mapped_column(Numeric(18, 2), default=0, nullable=False)
    details = mapped_column(JSON, default=dict, nullable=False)


class ExpenseClaim(Base):
    __tablename__ = "expense_claims"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    claim_date = mapped_column(Date, nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    amount = mapped_column(Numeric(18, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    receipt_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    approvals = mapped_column(JSON, default=list, nullable=False)
    needs_director: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class JobPosting(Base):
    __tablename__ = "job_postings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    department_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_min = mapped_column(Numeric(18, 2), nullable=True)
    salary_max = mapped_column(Numeric(18, 2), nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Applicant(Base):
    __tablename__ = "applicants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("job_postings.id"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    current_stage: Mapped[str] = mapped_column(String(30), default="screening", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    applicant_id: Mapped[str] = mapped_column(String(36), ForeignKey("applicants.id"), nullable=False, index=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    interviewers = mapped_column(JSON, default=list, nullable=False)
    type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    result: Mapped[str | None] = mapped_column(String(30), nullable=True)


class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    assignee: Mapped[str | None] = mapped_column(String(150), nullable=True)
    due_date = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Offboarding(Base):
    __tablename__ = "offboarding"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, unique=True)
    last_date = mapped_column(Date, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # resign/terminate
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    tasks = mapped_column(JSON, default=list, nullable=False)  # clearance checklist
    settlement = mapped_column(JSON, default=dict, nullable=False)  # final settlement calc
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    uploaded_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    changes = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
