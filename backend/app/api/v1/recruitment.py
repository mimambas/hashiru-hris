"""Recruitment: job postings, applicants pipeline, interviews."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_db,
    log_audit,
    paginate,
    pagination_params,
    require_role,
)
from app.models import Applicant, Interview, JobPosting, User
from app.schemas import (
    ApplicantCreate,
    ApplicantOut,
    ApplicantStageUpdate,
    ApplicantUpdate,
    InterviewCreate,
    InterviewOut,
    JobCreate,
    JobOut,
)

router = APIRouter()

RECRUIT_ROLES = ("super_admin", "hr_director", "hr_manager", "hr_officer", "recruiter")
STAGES = ["screening", "assessment", "interview_hr", "interview_tech",
          "interview_final", "offer", "hired"]

# ---- Jobs ----
jobs = APIRouter()


@jobs.get("", response_model=dict)
def list_jobs(
    status_: str | None = Query(None, alias="status"),
    paging: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    user=Depends(require_role(*RECRUIT_ROLES)),
):
    q = db.query(JobPosting).order_by(JobPosting.created_at.desc())
    if status_:
        q = q.filter(JobPosting.status == status_)
    return paginate(q, paging["page"], paging["per_page"], lambda j: JobOut.model_validate(j).model_dump())


@jobs.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(payload: JobCreate, db: Session = Depends(get_db),
               user=Depends(require_role(*RECRUIT_ROLES))):
    job = JobPosting(**payload.model_dump())
    db.add(job)
    db.flush()
    log_audit(db, "job", job.id, "create", user.id, {"title": job.title})
    db.commit()
    db.refresh(job)
    return JobOut.model_validate(job)


@jobs.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db), user=Depends(require_role(*RECRUIT_ROLES))):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lowongan tidak ditemukan")
    return JobOut.model_validate(job)


@jobs.put("/{job_id}", response_model=JobOut)
def update_job(job_id: str, payload: JobCreate, db: Session = Depends(get_db),
               user=Depends(require_role(*RECRUIT_ROLES))):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lowongan tidak ditemukan")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    for k, v in data.items():
        setattr(job, k, v)
    log_audit(db, "job", job.id, "update", user.id, data)
    db.commit()
    db.refresh(job)
    return JobOut.model_validate(job)


@jobs.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db),
               user=Depends(require_role(*RECRUIT_ROLES))):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lowongan tidak ditemukan")
    log_audit(db, "job", job.id, "delete", user.id, {})
    db.delete(job)
    db.commit()
    return {"ok": True}


@jobs.get("/{job_id}/pipeline")
def job_pipeline(job_id: str, db: Session = Depends(get_db),
                 user=Depends(require_role(*RECRUIT_ROLES))):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lowongan tidak ditemukan")
    applicants = db.query(Applicant).filter(Applicant.job_id == job_id).all()
    stages = []
    for stage in STAGES + ["rejected"]:
        stages.append({
            "name": stage,
            "applicants": [ApplicantOut.model_validate(a).model_dump()
                           for a in applicants if a.current_stage == stage],
        })
    return {"job_id": job_id, "stages": stages}


@jobs.post("/{job_id}/applicants", response_model=ApplicantOut, status_code=status.HTTP_201_CREATED)
def add_applicant(job_id: str, payload: ApplicantCreate, db: Session = Depends(get_db),
                  user=Depends(require_role(*RECRUIT_ROLES))):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lowongan tidak ditemukan")
    app = Applicant(job_id=job_id, **payload.model_dump())
    db.add(app)
    db.flush()
    log_audit(db, "applicant", app.id, "create", user.id, {"job_id": job_id})
    db.commit()
    db.refresh(app)
    return ApplicantOut.model_validate(app)


@jobs.get("/{job_id}/applicants", response_model=list[ApplicantOut])
def list_applicants(job_id: str, db: Session = Depends(get_db),
                    user=Depends(require_role(*RECRUIT_ROLES))):
    return [ApplicantOut.model_validate(a) for a in
            db.query(Applicant).filter(Applicant.job_id == job_id).order_by(Applicant.created_at).all()]


# ---- Applicants ----
applicants = APIRouter()


@applicants.get("/{app_id}", response_model=ApplicantOut)
def get_applicant(app_id: str, db: Session = Depends(get_db),
                  user=Depends(require_role(*RECRUIT_ROLES))):
    app = db.query(Applicant).filter(Applicant.id == app_id).first()
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kandidat tidak ditemukan")
    return ApplicantOut.model_validate(app)


@applicants.put("/{app_id}", response_model=ApplicantOut)
def update_applicant(app_id: str, payload: ApplicantUpdate, db: Session = Depends(get_db),
                     user=Depends(require_role(*RECRUIT_ROLES))):
    app = db.query(Applicant).filter(Applicant.id == app_id).first()
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kandidat tidak ditemukan")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    for k, v in data.items():
        setattr(app, k, v)
    log_audit(db, "applicant", app.id, "update", user.id, data)
    db.commit()
    db.refresh(app)
    return ApplicantOut.model_validate(app)


@applicants.put("/{app_id}/stage", response_model=ApplicantOut)
def move_stage(app_id: str, payload: ApplicantStageUpdate, db: Session = Depends(get_db),
               user=Depends(require_role(*RECRUIT_ROLES))):
    if payload.stage not in STAGES + ["rejected"]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Stage tidak valid")
    app = db.query(Applicant).filter(Applicant.id == app_id).first()
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kandidat tidak ditemukan")
    old = app.current_stage
    app.current_stage = payload.stage
    if payload.stage == "rejected":
        app.status = "rejected"
    log_audit(db, "applicant", app.id, "stage_move", user.id, {"from": old, "to": payload.stage})
    db.commit()
    db.refresh(app)
    return ApplicantOut.model_validate(app)


# ---- Interviews ----
interviews = APIRouter()


@interviews.post("", response_model=InterviewOut, status_code=status.HTTP_201_CREATED)
def create_interview(payload: InterviewCreate, db: Session = Depends(get_db),
                     user=Depends(require_role(*RECRUIT_ROLES))):
    app = db.query(Applicant).filter(Applicant.id == payload.applicant_id).first()
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kandidat tidak ditemukan")
    iv = Interview(**payload.model_dump())
    db.add(iv)
    db.flush()
    log_audit(db, "interview", iv.id, "create", user.id, {"applicant_id": app.id})
    db.commit()
    db.refresh(iv)
    return InterviewOut.model_validate(iv)


@interviews.get("", response_model=list[InterviewOut])
def list_interviews(applicant_id: str | None = None, db: Session = Depends(get_db),
                    user=Depends(require_role(*RECRUIT_ROLES))):
    q = db.query(Interview).order_by(Interview.scheduled_at)
    if applicant_id:
        q = q.filter(Interview.applicant_id == applicant_id)
    return [InterviewOut.model_validate(i) for i in q.all()]


router.include_router(jobs, prefix="/jobs", tags=["jobs"])
router.include_router(applicants, prefix="/applicants", tags=["applicants"])
router.include_router(interviews, prefix="/interviews", tags=["interviews"])
