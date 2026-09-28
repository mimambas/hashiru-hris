"""Department endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, log_audit, require_role
from app.models import Department, Employee
from app.schemas import DepartmentCreate, DepartmentOut, DepartmentUpdate

router = APIRouter()

HR_READ = ("super_admin", "hr_director", "hr_manager", "hr_officer", "recruiter",
           "finance_officer", "dept_manager", "team_leader", "employee")
HR_WRITE = ("super_admin", "hr_director", "hr_manager", "hr_officer")


@router.get("", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), user=Depends(require_role(*HR_READ))):
    return db.query(Department).order_by(Department.name).all()


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db),
                      user=Depends(require_role(*HR_WRITE))):
    if db.query(Department).filter(Department.code == payload.code).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Kode departemen sudah dipakai")
    dept = Department(**payload.model_dump())
    db.add(dept)
    db.flush()
    log_audit(db, "department", dept.id, "create", user.id, {})
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/tree")
def department_tree(db: Session = Depends(get_db), user=Depends(require_role(*HR_READ))):
    depts = db.query(Department).all()
    children: dict[str | None, list] = {}
    for d in depts:
        children.setdefault(d.parent_id, []).append(d)

    def node(d: Department) -> dict:
        return {
            "id": d.id, "name": d.name, "code": d.code, "head_id": d.head_id,
            "cost_center": d.cost_center,
            "children": [node(c) for c in children.get(d.id, [])],
        }

    return [node(d) for d in children.get(None, [])]


@router.get("/{dept_id}", response_model=DepartmentOut)
def get_department(dept_id: str, db: Session = Depends(get_db), user=Depends(require_role(*HR_READ))):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Departemen tidak ditemukan")
    return dept


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: str, payload: DepartmentUpdate, db: Session = Depends(get_db),
                      user=Depends(require_role(*HR_WRITE))):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Departemen tidak ditemukan")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    for k, v in data.items():
        setattr(dept, k, v)
    log_audit(db, "department", dept.id, "update", user.id, data)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}")
def delete_department(dept_id: str, db: Session = Depends(get_db),
                      user=Depends(require_role(*HR_WRITE))):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Departemen tidak ditemukan")
    active = db.query(Employee).filter(
        Employee.department_id == dept_id, Employee.status == "active").count()
    if active:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"Departemen masih memiliki {active} karyawan aktif")
    log_audit(db, "department", dept.id, "delete", user.id, {})
    db.delete(dept)
    db.commit()
    return {"ok": True}


