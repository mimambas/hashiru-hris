"""FastAPI application entrypoint."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    attendance,
    audit,
    auth,
    dashboard,
    departments,
    documents,
    employees,
    expenses,
    leave,
    onboarding,
    offboarding,
    org,
    payroll,
    positions,
    recruitment,
    reports,
    settings as settings_api,
    users,
)
from app.core.config import get_settings
from app.core.deps import create_tables

settings = get_settings()

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_tables()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}


v1 = "/api/v1"
app.include_router(auth.router, prefix=f"{v1}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{v1}/users", tags=["users"])
app.include_router(employees.router, prefix=f"{v1}/employees", tags=["employees"])
app.include_router(departments.router, prefix=f"{v1}/departments", tags=["departments"])
app.include_router(positions.router, prefix=f"{v1}/positions", tags=["positions"])
app.include_router(org.router, prefix=f"{v1}/org", tags=["org"])
app.include_router(attendance.router, prefix=f"{v1}/attendance", tags=["attendance"])
app.include_router(leave.router, prefix=v1, tags=["leave"])
app.include_router(payroll.router, prefix=f"{v1}/payroll", tags=["payroll"])
app.include_router(expenses.router, prefix=f"{v1}/expenses", tags=["expenses"])
app.include_router(recruitment.router, prefix=v1, tags=["recruitment"])
app.include_router(onboarding.router, prefix=f"{v1}/onboarding", tags=["onboarding"])
app.include_router(offboarding.router, prefix=f"{v1}/offboarding", tags=["offboarding"])
app.include_router(documents.router, prefix=f"{v1}/documents", tags=["documents"])
app.include_router(reports.router, prefix=f"{v1}/reports", tags=["reports"])
app.include_router(dashboard.router, prefix=f"{v1}/dashboard", tags=["dashboard"])
app.include_router(settings_api.router, prefix=f"{v1}/settings", tags=["settings"])
app.include_router(audit.router, prefix=f"{v1}/audit-logs", tags=["audit"])
