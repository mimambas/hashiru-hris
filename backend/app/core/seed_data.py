"""Seed data for PT Hashiru Teknologi (dev/demo database)."""
from __future__ import annotations

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    Applicant,
    AttendanceRecord,
    Department,
    Document,
    Employee,
    ExpenseClaim,
    Interview,
    JobPosting,
    LeaveBalance,
    LeaveRequest,
    OnboardingTask,
    PayrollRun,
    Position,
    Setting,
    User,
)

PASSWORD = "Password123!"

DEPARTMENTS = [
    ("Engineering", "ENG", "CC-100"),
    ("Design", "DSN", "CC-200"),
    ("Marketing", "MKT", "CC-300"),
    ("Sales", "SLS", "CC-400"),
    ("Finance", "FIN", "CC-500"),
    ("Human Resources", "HRD", "CC-600"),
]

POSITIONS = [
    # title, code, level, grade, dept_code, min, max
    ("Engineering Manager", "ENG-MGR", "Manager", "M3", "ENG", 25_000_000, 40_000_000),
    ("Senior Backend Engineer", "ENG-BE-SR", "Senior", "S3", "ENG", 16_000_000, 25_000_000),
    ("Frontend Engineer", "ENG-FE", "Staff", "S2", "ENG", 10_000_000, 16_000_000),
    ("QA Engineer", "ENG-QA", "Staff", "S2", "ENG", 9_000_000, 14_000_000),
    ("UI/UX Designer", "DSN-UX", "Staff", "S2", "DSN", 10_000_000, 16_000_000),
    ("Design Lead", "DSN-LEAD", "Lead", "M2", "DSN", 18_000_000, 28_000_000),
    ("Digital Marketer", "MKT-DM", "Staff", "S2", "MKT", 8_000_000, 13_000_000),
    ("Sales Executive", "SLS-EXE", "Staff", "S2", "SLS", 7_000_000, 12_000_000),
    ("Sales Manager", "SLS-MGR", "Manager", "M3", "SLS", 22_000_000, 35_000_000),
    ("Finance Staff", "FIN-STAFF", "Staff", "S2", "FIN", 9_000_000, 14_000_000),
    ("HR Manager", "HRD-MGR", "Manager", "M3", "HRD", 22_000_000, 35_000_000),
    ("Recruiter", "HRD-REC", "Staff", "S2", "HRD", 9_000_000, 15_000_000),
]

# (full_name, dept_code, position_code, base_salary, fixed_allowance, ptkp, join_date, gender)
EMPLOYEES = [
    ("Rina Wulandari", "HRD", "HRD-MGR", 28_000_000, 3_000_000, "K/1", date(2021, 3, 1), "F"),
    ("Budi Santoso", "ENG", "ENG-MGR", 32_000_000, 4_000_000, "K/2", date(2020, 7, 15), "M"),
    ("Andi Pratama", "FIN", "FIN-STAFF", 12_000_000, 1_500_000, "TK/0", date(2022, 1, 10), "M"),
    ("Dewi Lestari", "HRD", "HRD-REC", 11_000_000, 1_000_000, "TK/0", date(2022, 6, 1), "F"),
    ("Sari Dewi", "DSN", "DSN-UX", 13_000_000, 1_500_000, "TK/0", date(2023, 2, 6), "F"),
    ("Agus Setiawan", "ENG", "ENG-BE-SR", 20_000_000, 2_500_000, "K/0", date(2021, 9, 20), "M"),
    ("Maya Putri", "ENG", "ENG-FE", 14_000_000, 1_500_000, "TK/1", date(2022, 4, 11), "F"),
    ("Rizky Ramadhan", "ENG", "ENG-FE", 13_500_000, 1_500_000, "TK/0", date(2023, 5, 8), "M"),
    ("Dian Puspita", "ENG", "ENG-QA", 11_500_000, 1_000_000, "TK/0", date(2023, 1, 16), "F"),
    ("Fajar Nugroho", "ENG", "ENG-BE-SR", 19_000_000, 2_000_000, "K/1", date(2022, 8, 22), "M"),
    ("Lina Marlina", "DSN", "DSN-LEAD", 22_000_000, 2_500_000, "K/0", date(2021, 11, 1), "F"),
    ("Hendra Gunawan", "DSN", "DSN-UX", 12_500_000, 1_200_000, "TK/0", date(2023, 7, 3), "M"),
    ("Ratna Sari", "MKT", "MKT-DM", 10_500_000, 1_000_000, "TK/0", date(2022, 9, 5), "F"),
    ("Tono Prasetyo", "MKT", "MKT-DM", 10_000_000, 1_000_000, "K/0", date(2023, 3, 13), "M"),
    ("Yoga Saputra", "SLS", "SLS-MGR", 26_000_000, 3_500_000, "K/1", date(2021, 5, 17), "M"),
    ("Nina Kurnia", "SLS", "SLS-EXE", 9_000_000, 1_000_000, "TK/0", date(2022, 11, 7), "F"),
    ("Dedi Kurniawan", "SLS", "SLS-EXE", 9_500_000, 1_000_000, "TK/1", date(2023, 4, 3), "M"),
    ("Eka Fitriani", "FIN", "FIN-STAFF", 11_000_000, 1_200_000, "TK/0", date(2022, 2, 14), "F"),
    ("Joko Susilo", "FIN", "FIN-STAFF", 12_500_000, 1_500_000, "K/0", date(2021, 8, 30), "M"),
    ("Ayu Rahmawati", "HRD", "HRD-REC", 10_500_000, 1_000_000, "TK/0", date(2023, 6, 12), "F"),
    ("Bambang Sutrisno", "ENG", "ENG-BE-SR", 21_000_000, 2_500_000, "K/3", date(2020, 12, 1), "M"),
    ("Sinta Maharani", "ENG", "ENG-FE", 13_000_000, 1_500_000, "TK/0", date(2023, 8, 21), "F"),
    ("Wahyu Hidayat", "ENG", "ENG-QA", 11_000_000, 1_000_000, "TK/0", date(2024, 1, 15), "M"),
    ("Putri Ayu Lestari", "DSN", "DSN-UX", 12_000_000, 1_200_000, "TK/0", date(2024, 2, 5), "F"),
    ("Rudi Hartono", "MKT", "MKT-DM", 10_800_000, 1_000_000, "K/0", date(2022, 7, 18), "M"),
    ("Intan Permata", "SLS", "SLS-EXE", 8_500_000, 1_000_000, "TK/0", date(2024, 3, 4), "F"),
    ("Galih Prakoso", "SLS", "SLS-EXE", 9_200_000, 1_000_000, "TK/0", date(2023, 10, 2), "M"),
    ("Nadia Safitri", "FIN", "FIN-STAFF", 10_000_000, 1_000_000, "TK/0", date(2024, 5, 6), "F"),
]

USERS = [
    # email, role, employee full_name (None = no linked employee)
    ("admin@hashiru.id", "super_admin", None),
    ("rina@hashiru.id", "hr_manager", "Rina Wulandari"),
    ("budi@hashiru.id", "dept_manager", "Budi Santoso"),
    ("sari@hashiru.id", "employee", "Sari Dewi"),
    ("andi@hashiru.id", "finance_officer", "Andi Pratama"),
    ("dewi@hashiru.id", "recruiter", "Dewi Lestari"),
]

LEAVE_TYPES = ["AL", "SL", "PL", "ML", "PT", "BL", "MR", "HJ", "UL", "CB"]

HOLIDAYS_2026 = [
    ("2026-01-01", "Tahun Baru Masehi"),
    ("2026-03-20", "Hari Raya Idul Fitri"),
    ("2026-03-21", "Hari Raya Idul Fitri"),
    ("2026-04-03", "Wafat Isa Almasih"),
    ("2026-05-01", "Hari Buruh"),
    ("2026-05-14", "Kenaikan Isa Almasih"),
    ("2026-05-27", "Hari Raya Idul Adha"),
    ("2026-06-16", "Tahun Baru Islam"),
    ("2026-08-17", "Hari Kemerdekaan RI"),
    ("2026-08-25", "Maulid Nabi Muhammad SAW"),
    ("2026-12-25", "Hari Raya Natal"),
]


def _slug_email(full_name: str, n: int) -> str:
    first = full_name.split()[0].lower()
    return f"{first}{n}@hashiru.id"


def seed_all(db: Session) -> dict:
    """Seed the whole demo dataset. Idempotent-ish: skips if users exist."""
    if db.query(User).first():
        return {"seeded": False, "reason": "users already exist"}
    rng = random.Random(42)
    hashed = hash_password(PASSWORD)

    # --- Settings ---
    def set_setting(key: str, value) -> None:
        db.merge(Setting(key=key, value=value))

    set_setting("company", {
        "name": "PT Hashiru Teknologi",
        "address": "Jl. Sudirman Kav. 52-53, Jakarta Selatan 12190",
        "phone": "+62-21-555-0123",
        "email": "info@hashiru.id",
        "npwp": "01.234.567.8-012.000",
    })
    set_setting("attendance", {
        "grace_period_minutes": 15,
        "work_start": "09:00",
        "work_end": "18:00",
        "overtime_min_minutes": 30,
        "max_overtime_hours": 3,
    })
    set_setting("leave_types", {
        "AL": {"name": "Cuti Tahunan", "days": 12},
        "SL": {"name": "Cuti Sakit", "days": 12},
        "PL": {"name": "Cuti Melahirkan (Paternal)", "days": 2},
        "ML": {"name": "Cuti Melahirkan (Maternal)", "days": 90},
        "PT": {"name": "Cuti Penting", "days": 3},
        "BL": {"name": "Cuti Menikah", "days": 3},
        "MR": {"name": "Cuti Menikah (Anak)", "days": 2},
        "HJ": {"name": "Cuti Haji", "days": 40},
        "UL": {"name": "Cuti Tanpa Gaji", "days": 12},
        "CB": {"name": "Cuti Bersama", "days": 8},
    })
    set_setting("holidays", [{"date": d, "name": n} for d, n in HOLIDAYS_2026])

    # --- Departments & positions ---
    dept_by_code: dict[str, Department] = {}
    for name, code, cc in DEPARTMENTS:
        d = Department(name=name, code=code, cost_center=cc)
        db.add(d)
        dept_by_code[code] = d
    db.flush()
    pos_by_code: dict[str, Position] = {}
    for title, code, level, grade, dcode, mn, mx in POSITIONS:
        p = Position(title=title, code=code, level=level, grade=grade,
                     department_id=dept_by_code[dcode].id, min_salary=mn, max_salary=mx)
        db.add(p)
        pos_by_code[code] = p
    db.flush()

    # --- Employees ---
    emp_by_name: dict[str, Employee] = {}
    nik_base = 3174050101000000
    for i, (name, dcode, pcode, base, fixed, ptkp, join, gender) in enumerate(EMPLOYEES):
        emp_id = f"EMP-{join.strftime('%Y%m%d')}-{i + 1:03d}"
        emp = Employee(
            employee_id=emp_id,
            full_name=name,
            nik=str(nik_base + i),
            npwp=f"09.{100 + i:03d}.{200 + i:03d}.{(i % 9) + 1}-000.000",
            place_of_birth="Jakarta",
            date_of_birth=date(1990 + (i % 12), (i % 12) + 1, (i % 27) + 1),
            gender=gender,
            blood_type=["O", "A", "B", "AB"][i % 4],
            religion=["Islam", "Kristen", "Katolik", "Hindu"][i % 4],
            marital_status="Kawin" if ptkp.startswith("K") else "Belum Kawin",
            phone=f"0812{10000000 + i * 137:08d}",
            email=_slug_email(name, i),
            address_ktp=f"Jl. Merdeka No. {i + 1}, Jakarta",
            address_domisili=f"Jl. Merdeka No. {i + 1}, Jakarta",
            emergency_contact_name=f"Kontak {name.split()[0]}",
            emergency_contact_phone=f"0813{20000000 + i * 91:08d}",
            emergency_contact_relation="Saudara",
            join_date=join,
            contract_start=join,
            employment_status="permanent" if join < date(2023, 1, 1) else "contract",
            employment_type="full_time",
            department_id=dept_by_code[dcode].id,
            position_id=pos_by_code[pcode].id,
            branch="Jakarta",
            base_salary=Decimal(base),
            fixed_allowance=Decimal(fixed),
            bank_name=["BCA", "Mandiri", "BRI", "BNI"][i % 4],
            bank_account=f"{1000000000 + i * 7919}",
            bank_account_name=name,
            bpjs_kesehatan_no=f"000{i:010d}",
            bpjs_ketenagakerjaan_no=f"110{i:010d}",
            ptkp_status=ptkp,
            status="active",
        )
        db.add(emp)
        emp_by_name[name] = emp
    db.flush()

    # reporting lines: managers head their departments
    eng_mgr = emp_by_name["Budi Santoso"]
    for name, emp in emp_by_name.items():
        if emp.department_id == dept_by_code["ENG"].id and name != "Budi Santoso":
            emp.reporting_to = eng_mgr.id
    dept_by_code["ENG"].head_id = eng_mgr.id
    dept_by_code["HRD"].head_id = emp_by_name["Rina Wulandari"].id
    dept_by_code["SLS"].head_id = emp_by_name["Yoga Saputra"].id

    # --- Users ---
    for email, role, emp_name in USERS:
        db.add(User(
            email=email,
            hashed_password=hashed,
            role=role,
            employee_id=emp_by_name[emp_name].id if emp_name else None,
            is_active=True,
        ))
    db.flush()

    # --- Attendance: last 30 days (weekdays only) ---
    today = date.today()
    grace = 15
    employees = list(emp_by_name.values())
    for emp in employees:
        for back in range(30):
            d = today - timedelta(days=back)
            if d.weekday() >= 5:
                continue
            roll = rng.random()
            ci = datetime.combine(d, time(8, 30)) + timedelta(minutes=rng.randint(0, 70))
            late = max(0, int((ci - datetime.combine(d, time(9, 0))).total_seconds() // 60) - grace)
            if roll < 0.84:
                status, co = ("present", datetime.combine(d, time(18, 0)))
                if late > 0:
                    status = "late"
                ot = Decimal(rng.choice([0, 0, 0, 1, 1.5, 2, 3])) if rng.random() < 0.25 else Decimal(0)
                if ot:
                    co += timedelta(hours=float(ot))
                db.add(AttendanceRecord(
                    employee_id=emp.id, date=d, check_in=ci, check_out=co,
                    status=status, late_minutes=late, overtime_hours=ot, source="self",
                ))
            elif roll < 0.90:
                db.add(AttendanceRecord(
                    employee_id=emp.id, date=d, check_in=ci, check_out=None,
                    status="late" if late > 0 else "present", late_minutes=late,
                    overtime_hours=0, source="self",
                ))
            elif roll < 0.94:
                db.add(AttendanceRecord(employee_id=emp.id, date=d, status="absent", source="system"))
            else:
                db.add(AttendanceRecord(
                    employee_id=emp.id, date=d,
                    check_in=datetime.combine(d, time(9, 0)),
                    check_out=datetime.combine(d, time(17, 0)),
                    status="wfh", source="self",
                ))
    db.flush()

    # --- Leave balances 2026 ---
    for emp in employees:
        used_al = rng.randint(0, 4)
        db.add(LeaveBalance(employee_id=emp.id, leave_type="AL", year=2026, total_days=12, used_days=used_al))
        db.add(LeaveBalance(employee_id=emp.id, leave_type="SL", year=2026, total_days=12, used_days=rng.randint(0, 2)))
        for lt in ["PL", "PT", "BL", "UL"]:
            days = {"PL": 2, "PT": 3, "BL": 3, "UL": 12}[lt]
            db.add(LeaveBalance(employee_id=emp.id, leave_type=lt, year=2026, total_days=days, used_days=0))
    db.flush()

    # --- Leave requests ---
    sari = emp_by_name["Sari Dewi"]
    maya = emp_by_name["Maya Putri"]
    lr1 = LeaveRequest(employee_id=sari.id, leave_type="AL",
                       start_date=today + timedelta(days=7), end_date=today + timedelta(days=9),
                       total_days=3, reason="Liburan keluarga", status="approved",
                       current_approver_role=None,
                       approvals=[{"role": "dept_manager", "action": "approved", "at": str(today)}])
    lr2 = LeaveRequest(employee_id=maya.id, leave_type="AL",
                       start_date=today + timedelta(days=14), end_date=today + timedelta(days=20),
                       total_days=5, reason="Mudik", status="pending", current_approver_role="hr_director",
                       approvals=[{"role": "dept_manager", "action": "approved", "at": str(today)}])
    lr3 = LeaveRequest(employee_id=emp_by_name["Nina Kurnia"].id, leave_type="SL",
                       start_date=today - timedelta(days=3), end_date=today - timedelta(days=2),
                       total_days=2, reason="Demam", status="approved", current_approver_role=None,
                       approvals=[{"role": "dept_manager", "action": "approved", "at": str(today)}])
    db.add_all([lr1, lr2, lr3])
    db.flush()
    for lr in [lr1, lr2]:
        if lr.status == "approved":
            bal = db.query(LeaveBalance).filter_by(employee_id=lr.employee_id, leave_type=lr.leave_type, year=2026).first()
            if bal:
                bal.used_days += lr.total_days

    # --- Expense claims ---
    exp1 = ExpenseClaim(employee_id=sari.id, claim_date=today - timedelta(days=5), type="transport",
                        amount=Decimal("350000"), description="Taksi ke klien", status="approved",
                        approvals=[{"role": "dept_manager", "action": "approved"}])
    exp2 = ExpenseClaim(employee_id=maya.id, claim_date=today - timedelta(days=2), type="training",
                        amount=Decimal("6500000"), description="Workshop React Advanced", status="pending",
                        needs_director=True, approvals=[{"role": "dept_manager", "action": "approved"}])
    exp3 = ExpenseClaim(employee_id=emp_by_name["Dedi Kurniawan"].id, claim_date=today - timedelta(days=10),
                        type="meal", amount=Decimal("275000"), description="Makan dengan prospek",
                        status="rejected", rejection_reason="Struk tidak jelas")
    db.add_all([exp1, exp2, exp3])

    # --- Payroll runs: July & August 2026 (paid) ---
    from app.services.payroll import run_payroll

    admin = db.query(User).filter_by(email="admin@hashiru.id").first()
    for period in ("2026-07", "2026-08"):
        run = PayrollRun(period=period, run_type="monthly", status="draft", created_by=admin.id)
        db.add(run)
        db.flush()
        run_payroll(db, period)
        run = db.query(PayrollRun).filter_by(period=period).first()
        run.status = "paid"
        run.approved_by = admin.id
        run.approved_at = datetime.utcnow()
    db.flush()

    # --- Recruitment ---
    jobs_data = [
        ("Senior Backend Engineer", "ENG", "Jakarta", "published"),
        ("UI/UX Designer", "DSN", "Jakarta", "published"),
        ("Sales Executive", "SLS", "Jakarta", "published"),
    ]
    stages = ["screening", "assessment", "interview_hr", "interview_tech", "interview_final", "offer", "hired"]
    candidates = [
        "Ahmad Hidayat", "Bella Anggraini", "Candra Wijaya", "Dinda Pratiwi",
        "Eko Saputra", "Fitri Handayani", "Gilang Ramadhan", "Hesti Puspita",
        "Ilham Maulana", "Joko Prasetyo", "Kartika Sari", "Lukman Hakim",
    ]
    for ji, (title, dcode, loc, status) in enumerate(jobs_data):
        job = JobPosting(title=title, department_id=dept_by_code[dcode].id, location=loc,
                         description=f"Kami mencari {title} untuk bergabung dengan tim {title}.",
                         requirements="Pengalaman minimal 2 tahun di bidang terkait.",
                         salary_min=Decimal("10000000"), salary_max=Decimal("20000000"),
                         employment_type="full_time", status=status)
        db.add(job)
        db.flush()
        for ci in range(4):
            cand = candidates[ji * 4 + ci]
            stage = stages[min(ci, len(stages) - 1)]
            app = Applicant(job_id=job.id, full_name=cand,
                            email=f"{cand.split()[0].lower()}.{cand.split()[1].lower()}@mail.com",
                            phone=f"0819{30000000 + ji * 100 + ci:08d}",
                            source=["LinkedIn", "JobStreet", "Referral", "Glints"][ci % 4],
                            current_stage=stage, status="active",
                            score=60 + ((ji * 4 + ci) * 7) % 35)
            db.add(app)
            db.flush()
            if stage in ("interview_hr", "interview_tech", "interview_final"):
                db.add(Interview(applicant_id=app.id,
                                 scheduled_at=datetime.utcnow() + timedelta(days=ci + 1),
                                 interviewers=["Rina Wulandari"],
                                 type="online", notes="Tahap wawancara"))

    # --- Onboarding tasks for a recent joiner ---
    nadia = emp_by_name["Nadia Safitri"]
    for i, title in enumerate([
        "Lengkapi dokumen personal", "Setup laptop & akun email",
        "Orientasi budaya perusahaan", "Bertemu tim Finance", "Training sistem HRIS",
    ]):
        db.add(OnboardingTask(employee_id=nadia.id, title=title, assignee="Dewi Lestari",
                              due_date=today + timedelta(days=i * 2), status="done" if i < 2 else "pending",
                              sort_order=i))

    # --- Sample documents (placeholder files) ---
    import os

    upload_dir = "./uploads"
    os.makedirs(upload_dir, exist_ok=True)
    for emp_name in ["Sari Dewi", "Maya Putri"]:
        emp = emp_by_name[emp_name]
        fname = f"{emp.employee_id}_ktp.txt"
        fpath = os.path.join(upload_dir, fname)
        with open(fpath, "w") as fh:
            fh.write(f"Dokumen contoh KTP - {emp.full_name}\n")
        db.add(Document(employee_id=emp.id, category="personal", name="KTP",
                        file_path=fpath, file_type="txt", file_size=os.path.getsize(fpath),
                        verified=True, verified_by=admin.id, uploaded_by=admin.id))

    db.commit()
    return {
        "seeded": True,
        "employees": len(employees),
        "users": len(USERS),
        "payroll_runs": 2,
    }
