"""Position endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, log_audit, require_role
from app.models import Employee, Position
from app.schemas import PositionCreate, PositionOut

router = APIRouter()

HR_READ = ("super_admin", "hr_director", "hr_manager", "hr_officer", "recruiter",
           "finance_officer", "dept_manager", "team_leader", "employee")
HR_WRITE = ("super_admin", "hr_director", "hr_manager", "hr_officer")


@router.get("", response_model=list[PositionOut])
def list_positions(department_id: str | None = None, db: Session = Depends(get_db),
                   user=Depends(require_role(*HR_READ))):
    q = db.query(Position).order_by(Position.title)
    if department_id:
        q = q.filter(Position.department_id == department_id)
    return q.all()


@router.post("", response_model=PositionOut, status_code=status.HTTP_201_CREATED)
def create_position(payload: PositionCreate, db: Session = Depends(get_db),
                    user=Depends(require_role(*HR_WRITE))):
    if db.query(Position).filter(Position.code == payload.code).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Kode jabatan sudah dipakai")
    pos = Position(**payload.model_dump())
    db.add(pos)
    db.flush()
    log_audit(db, "position", pos.id, "create", user.id, {})
    db.commit()
    db.refresh(pos)
    return pos


@router.get("/{pos_id}", response_model=PositionOut)
def get_position(pos_id: str, db: Session = Depends(get_db), user=Depends(require_role(*HR_READ))):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Jabatan tidak ditemukan")
    return pos


@router.put("/{pos_id}", response_model=PositionOut)
def update_position(pos_id: str, payload: PositionCreate, db: Session = Depends(get_db),
                    user=Depends(require_role(*HR_WRITE))):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Jabatan tidak ditemukan")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    for k, v in data.items():
        setattr(pos, k, v)
    log_audit(db, "position", pos.id, "update", user.id, data)
    db.commit()
    db.refresh(pos)
    return pos


@router.delete("/{pos_id}")
def delete_position(pos_id: str, db: Session = Depends(get_db),
                    user=Depends(require_role(*HR_WRITE))):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Jabatan tidak ditemukan")
    active = db.query(Employee).filter(Employee.position_id == pos_id, Employee.status == "active").count()
    if active:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"Jabatan masih dipakai {active} karyawan aktif")
    log_audit(db, "position", pos.id, "delete", user.id, {})
    db.delete(pos)
    db.commit()
    return {"ok": True}
