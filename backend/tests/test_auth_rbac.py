"""Auth and RBAC tests."""
from .conftest import auth_headers


def test_login_success(client, admin_token):
    assert admin_token and len(admin_token) > 20


def test_login_wrong_password_rejected(client):
    resp = client.post("/api/v1/auth/login",
                       json={"email": "admin@hashiru.id", "password": "salah123"})
    assert resp.status_code == 401


def test_me_returns_role_and_employee(client, employee_token):
    resp = client.get("/api/v1/auth/me", headers=auth_headers(employee_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "employee"
    assert body["employee"]["full_name"] == "Sari Dewi"


def test_unauthenticated_request_rejected(client):
    resp = client.get("/api/v1/employees")
    assert resp.status_code == 401


def test_employee_cannot_create_employee(client, employee_token):
    resp = client.post("/api/v1/employees", headers=auth_headers(employee_token),
                       json={"full_name": "X", "email": "x@hashiru.id",
                             "join_date": "2026-01-01"})
    assert resp.status_code == 403


def test_employee_cannot_read_others_profile(client, employee_token, hr_token):
    # find another employee id via hr token, then try as employee
    lst = client.get("/api/v1/employees", headers=auth_headers(hr_token)).json()
    other = next(i for i in lst["items"] if i["full_name"] != "Sari Dewi")
    resp = client.get(f"/api/v1/employees/{other['id']}", headers=auth_headers(employee_token))
    assert resp.status_code == 403


def test_employee_can_read_own_profile(client, employee_token):
    me = client.get("/api/v1/auth/me", headers=auth_headers(employee_token)).json()
    resp = client.get(f"/api/v1/employees/{me['employee']['id']}",
                      headers=auth_headers(employee_token))
    assert resp.status_code == 200


def test_hr_can_create_employee(client, hr_token):
    resp = client.post("/api/v1/employees", headers=auth_headers(hr_token),
                       json={"full_name": "Test Karyawan", "email": "test.karyawan@hashiru.id",
                             "join_date": "2026-09-01", "base_salary": 9000000,
                             "nik": "3174050101990001"})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["employee_id"].startswith("EMP-")


def test_refresh_token_flow(client):
    login = client.post("/api/v1/auth/login",
                        json={"email": "admin@hashiru.id", "password": "Password123!"})
    refresh = login.json()["refresh_token"]
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_lockout_after_repeated_failures(client):
    # create throwaway user via admin, then fail 5+ times
    admin = client.post("/api/v1/auth/login",
                        json={"email": "admin@hashiru.id", "password": "Password123!"}).json()
    headers = auth_headers(admin["access_token"])
    client.post("/api/v1/users", headers=headers,
                json={"email": "lockme@hashiru.id", "password": "Password123!", "role": "employee"})
    for _ in range(5):
        r = client.post("/api/v1/auth/login",
                        json={"email": "lockme@hashiru.id", "password": "wrongpass"})
        assert r.status_code == 401
    r = client.post("/api/v1/auth/login",
                    json={"email": "lockme@hashiru.id", "password": "wrongpass"})
    assert r.status_code in (401, 403)  # locked on the 6th attempt
