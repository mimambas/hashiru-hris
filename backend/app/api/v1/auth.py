"""Authentication endpoints: login / refresh / logout / me."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models import Employee, User
from app.schemas import (
    AccessTokenResponse,
    LoginRequest,
    MeResponse,
    OkResponse,
    RefreshRequest,
    TokenResponse,
)

router = APIRouter()
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email atau kata sandi salah")
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi nanti.",
        )
    if not user.is_active or not verify_password(payload.password, user.hashed_password):
        user.failed_attempts = (user.failed_attempts or 0) + 1
        if user.failed_attempts >= settings.LOGIN_MAX_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email atau kata sandi salah")
    user.failed_attempts = 0
    user.locked_until = None
    db.commit()
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
    if data.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token tidak valid")
    user = db.query(User).filter(User.id == data.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Pengguna tidak ditemukan atau nonaktif")
    return AccessTokenResponse(access_token=create_access_token(user.id, user.role))


@router.post("/logout", response_model=OkResponse)
def logout(_: User = Depends(get_current_user)):
    # Stateless JWT: the client discards tokens. Hook for blocklist if needed.
    return OkResponse(ok=True)


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    employee = None
    if user.employee_id:
        emp = db.query(Employee).filter(Employee.id == user.employee_id).first()
        if emp:
            employee = {
                "id": emp.id,
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "photo_url": emp.photo_url,
            }
    return {"id": user.id, "email": user.email, "role": user.role, "employee": employee}
