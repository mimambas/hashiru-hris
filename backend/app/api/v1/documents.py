"""Document upload / download / verify."""
import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import (
    get_current_user,
    get_db,
    log_audit,
    paginate,
    pagination_params,
    require_role,
    scope_employee_id,
)
from app.models import Document, User
from app.schemas import DocumentOut

router = APIRouter()
settings = get_settings()

ALLOWED_EXT = {"pdf", "jpg", "jpeg", "png", "docx"}
HR_ROLES = ("super_admin", "hr_director", "hr_manager", "hr_officer")


@router.get("", response_model=dict)
def list_documents(
    employee_id: str | None = None,
    category: str | None = None,
    q: str | None = None,
    paging: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Document).order_by(Document.created_at.desc())
    scoped = scope_employee_id(user)
    if scoped:
        query = query.filter(Document.employee_id == scoped)
    elif employee_id:
        query = query.filter(Document.employee_id == employee_id)
    if category:
        query = query.filter(Document.category == category)
    if q:
        query = query.filter(Document.name.ilike(f"%{q}%"))
    return paginate(query, paging["page"], paging["per_page"],
                    lambda d: DocumentOut.model_validate(d).model_dump())


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    employee_id: str = Form(...),
    category: str = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    scoped = scope_employee_id(user)
    if scoped and scoped != employee_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda hanya dapat mengunggah dokumen sendiri")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"Tipe file tidak didukung. Gunakan: {', '.join(sorted(ALLOWED_EXT))}")
    data = file.file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            f"Ukuran file maksimal {settings.MAX_UPLOAD_MB}MB")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored = f"{uuid.uuid4().hex}.{ext}"
    fpath = os.path.join(settings.UPLOAD_DIR, stored)
    with open(fpath, "wb") as fh:
        fh.write(data)
    doc = Document(
        employee_id=employee_id, category=category, name=name,
        file_path=fpath, file_type=ext, file_size=len(data),
        verified=False, uploaded_by=user.id,
    )
    db.add(doc)
    db.flush()
    log_audit(db, "document", doc.id, "upload", user.id, {"name": name})
    db.commit()
    db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.get("/{doc_id}/download")
def download_document(
    doc_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dokumen tidak ditemukan")
    scoped = scope_employee_id(user)
    if scoped and doc.employee_id != scoped:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses ke dokumen ini")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File tidak ditemukan di server")
    return FileResponse(doc.file_path, filename=f"{doc.name}.{doc.file_type or 'bin'}")


@router.put("/{doc_id}/verify", response_model=DocumentOut)
def verify_document(
    doc_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(*HR_ROLES)),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dokumen tidak ditemukan")
    doc.verified = True
    doc.verified_by = user.id
    log_audit(db, "document", doc.id, "verify", user.id, {})
    db.commit()
    db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dokumen tidak ditemukan")
    scoped = scope_employee_id(user)
    if scoped and doc.employee_id != scoped:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses ke dokumen ini")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    log_audit(db, "document", doc.id, "delete", user.id, {})
    db.delete(doc)
    db.commit()
    return {"ok": True}
