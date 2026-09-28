"""Attendance endpoints: check-in/out, manual records, team summary."""
from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user,
    get_db,
    log_audit,
    paginate,
    pagination_params,
    require_role,
    scope_employee_id,
)
from app.models import AttendanceRecord, Employee, Setting, User
from app.schemas import AttendanceOut, CheckInRequest, ManualAttendanceRequest

router = APIRouter()


def _attendance_settings(db: Session) -> dict:
    s = db.query(Setting).filter(Setting.key == "attendance").first()
    return s.value if s else {}


def _resolve_employee(user: User, employee_id: str | None, db: Session) -> str:
    scoped = scope_employee_id(user)
    if scoped:
        return scoped
    if employee_id:
        emp = db.query(Employee).filter(Employee.id == employee_id).first()
        if not emp:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Karyawan tidak ditemukan")
        return emp.id
    if not user.employee_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Parameter employee_id wajib diisi")
    return user.employee_id


def _serialize(r: AttendanceRecord) -> dict:
    return AttendanceOut.model_validate(r).model_dump()


@router.get("", response_model=dict)
def list_attendance(
    employee_id: str | None = None,
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None, alias="to"),
    status_: str | None = Query(None, alias="status"),
    paging: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(AttendanceRecord).order_by(AttendanceRecord.date.desc())
    scoped = scope_employee_id(user)
    if scoped:
        query = query.filter(AttendanceRecord.employee_id == scoped)
    elif employee_id:
        query = query.filter(AttendanceRecord.employee_id == employee_id)
    if from_:
        query = query.filter(AttendanceRecord.date >= from_)
    if to:
        query = query.filter(AttendanceRecord.date <= to)
    if status_:
        query = query.filter(AttendanceRecord.status == status_)
    return paginate(query, paging["page"], paging["per_page"], _serialize)


@router.post("/check-in", response_model=AttendanceOut)
def check_in(
    payload: CheckInRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    emp_id = _resolve_employee(user, None, db)
    today = date.today()
    existing = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.employee_id == emp_id, AttendanceRecord.date == today)
        .first()
    )
    if existing and existing.check_in:
        raise HTTPException(status.HTTP_409_CONFLICT, "Anda sudah check-in hari ini")
    settings = _attendance_settings(db)
    grace = int(settings.get("grace_period_minutes", 15))
    work_start = settings.get("work_start", "09:00")
    wh, wm = (int(x) for x in work_start.split(":"))
    now = datetime.now()
    late = max(0, int((now - datetime.combine(today, time(wh, wm))).total_seconds() // 60) - grace)
    record = existing or AttendanceRecord(employee_id=emp_id, date=today, source="self")
    record.check_in = now
    record.late_minutes = late
    record.status = "late" if late > 0 else "present"
    if payload.latitude is not None:
        record.latitude = payload.latitude
    if payload.longitude is not None:
        record.longitude = payload.longitude
    db.add(record)
    log_audit(db, "attendance", record.id, "check_in", user.id, {"date": str(today)})
    db.commit()
    db.refresh(record)
    return AttendanceOut.model_validate(record)


@router.post("/check-out", response_model=AttendanceOut)
def check_out(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    emp_id = _resolve_employee(user, None, db)
    today = date.today()
    record = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.employee_id == emp_id, AttendanceRecord.date == today)
        .first()
    )
    if not record or not record.check_in:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Anda belum check-in hari ini")
    if record.check_out:
        raise HTTPException(status.HTTP_409_CONFLICT, "Anda sudah check-out hari ini")
    settings = _attendance_settings(db)
    work_end = settings.get("work_end", "18:00")
    wh, wm = (int(x) for x in work_end.split(":"))
    now = datetime.now()
    ot_minutes = max(0, int((now - datetime.combine(today, time(wh, wm))).total_seconds() // 60))
    ot_min_threshold = int(settings.get("overtime_min_minutes", 30))
    ot_hours = round(ot_minutes / 60, 2) if ot_minutes >= ot_min_threshold else 0
    max_ot = float(settings.get("max_overtime_hours", 3))
    record.check_out = now
    record.overtime_hours = min(ot_hours, max_ot)
    if record.status == "present" and now.time() < time(wh, wm):
        record.status = "early_leave"
    log_audit(db, "attendance", record.id, "check_out", user.id, {"date": str(today)})
    db.commit()
    db.refresh(record)
    return AttendanceOut.model_validate(record)


@router.get("/today")
def today_status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.employee_id:
        return {"checked_in": False, "no_employee": True}
    emp_id = _resolve_employee(user, None, db)
    record = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.employee_id == emp_id, AttendanceRecord.date == date.today())
        .first()
    )
    return _serialize(record) if record else {"checked_in": False}


@router.post("/manual", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def manual_attendance(
    payload: ManualAttendanceRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("super_admin", "hr_director", "hr_manager", "hr_officer")),
):
    existing = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.employee_id == payload.employee_id, AttendanceRecord.date == payload.date)
        .first()
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Data absensi untuk tanggal tersebut sudah ada")
    record = AttendanceRecord(
        employee_id=payload.employee_id,
        date=payload.date,
        check_in=payload.check_in,
        check_out=payload.check_out,
        status="pending_approval",
        source="manual",
        is_manual=True,
        reason=payload.reason,
    )
    db.add(record)
    db.flush()
    log_audit(db, "attendance", record.id, "manual_create", user.id, {"reason": payload.reason})
    db.commit()
    db.refresh(record)
    return AttendanceOut.model_validate(record)


@router.get("/team")
def team_summary(
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("super_admin", "hr_director", "hr_manager",
                                       "hr_officer", "dept_manager", "team_leader")),
):
    from_ = from_ or date.today()
    to = to or date.today()
    query = db.query(Employee, AttendanceRecord).outerjoin(
        AttendanceRecord,
        (AttendanceRecord.employee_id == Employee.id)
        & (AttendanceRecord.date >= from_)
        & (AttendanceRecord.date <= to),
    )
    if user.role in ("dept_manager", "team_leader") and user.employee_id:
        me = db.query(Employee).filter(Employee.id == user.employee_id).first()
        if me and me.department_id:
            query = query.filter(
                (Employee.department_id == me.department_id) | (Employee.reporting_to == user.employee_id)
            )
    rows = query.order_by(Employee.full_name, AttendanceRecord.date).all()
    result: dict[str, dict] = {}
    for emp, rec in rows:
        entry = result.setdefault(emp.id, {"employee": emp.full_name, "records": {}})
        if rec:
            entry["records"][str(rec.date)] = rec.status
    return list(result.values())
