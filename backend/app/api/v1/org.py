"""Org chart endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_role
from app.models import Department, Employee, Position

router = APIRouter()

HR_READ = ("super_admin", "hr_director", "hr_manager", "hr_officer", "recruiter",
           "finance_officer", "dept_manager", "team_leader", "employee")


@router.get("/chart")
def org_chart(db: Session = Depends(get_db), user=Depends(require_role(*HR_READ))):
    employees = db.query(Employee).filter(Employee.status == "active").all()
    dept_map = {d.id: d.name for d in db.query(Department).all()}
    pos_map = {p.id: p.title for p in db.query(Position).all()}
    return {
        "nodes": [
            {
                "id": e.id,
                "name": e.full_name,
                "position": pos_map.get(e.position_id or ""),
                "department": dept_map.get(e.department_id or ""),
                "photo_url": e.photo_url,
                "parent_id": e.reporting_to,
            }
            for e in employees
        ]
    }
