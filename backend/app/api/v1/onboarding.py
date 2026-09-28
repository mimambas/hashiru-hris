"""Onboarding task management."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, log_audit, require_role
from app.models import Department, Employee, OnboardingTask, User
from app.schemas import OnboardingGenerateRequest, OnboardingTaskOut

router = APIRouter()

HR_ROLES = ("super_admin", "hr_director", "hr_manager", "hr_officer", "recruiter")

BASE_TEMPLATE = [
    "Lengkapi dokumen personal (KTP, NPWP, KK)",
    "Setup laptop & akun email perusahaan",
    "Orientasi budaya & nilai perusahaan",
    "Bertemu dengan tim & atasan langsung",
    "Training sistem HRIS",
]

DEPT_TEMPLATES = {
    "ENG": ["Setup akses repository & CI/CD", "Codebase walkthrough dengan mentor"],
    "DSN": ["Akses Figma & design system", "Review portofolio proyek berjalan"],
    "SLS": ["Training produk & pricing", "Shadowing kunjungan klien"],
    "MKT": ["Akses akun iklan & analytics", "Brief kampanye berjalan"],
    "FIN": ["Akses sistem akuntansi", "Brief SOP keuangan"],
    "HRD": ["Akses modul HRIS admin", "Brief kebijakan SDM"],
}


@router.get("/{employee_id}")
def get_onboarding(employee_id: str, db: Session = Depends(get_db),
                   user=Depends(require_role(*HR_ROLES, "dept_manager", "team_leader"))):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Karyawan tidak ditemukan")
    tasks = (
        db.query(OnboardingTask)
        .filter(OnboardingTask.employee_id == employee_id)
        .order_by(OnboardingTask.sort_order)
        .all()
    )
    done = sum(1 for t in tasks if t.status == "done")
    progress = round(done / len(tasks) * 100, 1) if tasks else 0.0
    return {
        "employee_id": employee_id,
        "tasks": [OnboardingTaskOut.model_validate(t).model_dump() for t in tasks],
        "progress_pct": progress,
    }


@router.post("/{employee_id}/generate", status_code=status.HTTP_201_CREATED)
def generate_onboarding(
    employee_id: str,
    payload: OnboardingGenerateRequest,
    db: Session = Depends(get_db),
    user=Depends(require_role(*HR_ROLES)),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Karyawan tidak ditemukan")
    existing = db.query(OnboardingTask).filter(OnboardingTask.employee_id == employee_id).count()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Checklist onboarding sudah dibuat")
    dept_code = None
    if emp.department_id:
        dept = db.query(Department).filter(Department.id == emp.department_id).first()
        dept_code = dept.code if dept else None
    titles = list(BASE_TEMPLATE) + DEPT_TEMPLATES.get(dept_code or "", [])
    today = date.today()
    created = []
    for i, title in enumerate(titles):
        task = OnboardingTask(
            employee_id=employee_id, title=title,
            assignee="HR" if i < 3 else "Atasan langsung",
            due_date=today + timedelta(days=7 + i), status="pending", sort_order=i,
        )
        db.add(task)
        created.append(task)
    db.flush()
    log_audit(db, "onboarding", employee_id, "generate", user.id, {"tasks": len(created)})
    db.commit()
    return {"ok": True, "tasks_created": len(created)}


@router.put("/tasks/{task_id}/complete")
def complete_task(task_id: str, db: Session = Depends(get_db),
                  user: User = Depends(require_role(*HR_ROLES, "dept_manager", "team_leader"))):
    task = db.query(OnboardingTask).filter(OnboardingTask.id == task_id).first()
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tugas tidak ditemukan")
    task.status = "done"
    log_audit(db, "onboarding_task", task.id, "complete", user.id, {})
    db.commit()
    return {"ok": True}
