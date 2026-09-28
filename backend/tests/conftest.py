"""Shared pytest fixtures: isolated SQLite DB, seeded data, auth tokens."""
import os
import sys

# Isolated test database — must be set before app modules are imported.
os.environ["DATABASE_URL"] = "sqlite:////tmp/test_hris.db"
os.environ["UPLOAD_DIR"] = "/tmp/test_hris_uploads"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

# Remove stale test DB so each pytest run starts clean.
if os.path.exists("/tmp/test_hris.db"):
    os.remove("/tmp/test_hris.db")
os.makedirs("/tmp/test_hris_uploads", exist_ok=True)

from app.core.deps import SessionLocal, create_tables  # noqa: E402
from app.core.seed_data import seed_all  # noqa: E402
from app.main import app  # noqa: E402

create_tables()
db = SessionLocal()
seed_all(db)
db.close()


def _token(email: str, password: str = "Password123!") -> str:
    with TestClient(app) as client:
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin_token() -> str:
    return _token("admin@hashiru.id")


@pytest.fixture(scope="session")
def employee_token() -> str:
    return _token("sari@hashiru.id")


@pytest.fixture(scope="session")
def hr_token() -> str:
    return _token("rina@hashiru.id")


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
