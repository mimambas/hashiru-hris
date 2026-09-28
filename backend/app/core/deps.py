"""Shared FastAPI dependencies: DB session, auth, RBAC, pagination."""
from collections.abc import Callable
from typing import Any

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.security import decode_token
from app.models import Base, User

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token akses diperlukan")
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token akses tidak valid")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Pengguna tidak ditemukan atau nonaktif")
    return user


def require_role(*roles: str) -> Callable[[User], User]:
    """Dependency factory enforcing that the current user has one of the roles."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses ke fitur ini")
        return user

    return checker


def pagination_params(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
) -> dict[str, int]:
    return {"page": page, "per_page": per_page}


def paginate(query, page: int, per_page: int, serializer) -> dict[str, Any]:
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = (total + per_page - 1) // per_page
    return {
        "items": [serializer(i) for i in items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


def scope_employee_id(user: User) -> str | None:
    """Return the employee id the user is scoped to, or None for full access."""
    if user.role == "employee":
        return user.employee_id
    return None


def log_audit(
    db: Session,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: str | None,
    changes: dict | None = None,
) -> None:
    """Record an audit trail entry."""
    from app.models import AuditLog

    db.add(
        AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            changes=changes or {},
        )
    )
