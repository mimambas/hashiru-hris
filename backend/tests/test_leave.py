"""Leave and attendance business-rule tests."""
from datetime import date, timedelta

from .conftest import auth_headers


def _future_workdays(n_start=10, length=2):
    """Return (start, end) ISO dates `length` weekdays starting ~n_start days out."""
    d = date.today() + timedelta(days=n_start)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    end = d
    added = 1
    while added < length:
        end += timedelta(days=1)
        if end.weekday() < 5:
            added += 1
    return d.isoformat(), end.isoformat()


def test_leave_overlap_rejected(client, employee_token):
    start, end = _future_workdays(30, 2)
    payload = {"leave_type": "AL", "start_date": start, "end_date": end, "reason": "uji"}
    r1 = client.post("/api/v1/leave-requests", headers=auth_headers(employee_token), json=payload)
    assert r1.status_code == 201, r1.text
    r2 = client.post("/api/v1/leave-requests", headers=auth_headers(employee_token), json=payload)
    assert r2.status_code == 409


def test_leave_insufficient_balance_rejected(client, employee_token):
    # ask for far more days than the AL balance (12)
    start, _ = _future_workdays(60, 2)
    end = (date.fromisoformat(start) + timedelta(days=60)).isoformat()
    payload = {"leave_type": "AL", "start_date": start, "end_date": end, "reason": "uji saldo"}
    resp = client.post("/api/v1/leave-requests", headers=auth_headers(employee_token), json=payload)
    assert resp.status_code == 422


def test_checkin_twice_rejected(client, employee_token):
    r1 = client.post("/api/v1/attendance/check-in", headers=auth_headers(employee_token), json={})
    assert r1.status_code in (200, 201, 409)
    r2 = client.post("/api/v1/attendance/check-in", headers=auth_headers(employee_token), json={})
    assert r2.status_code == 409


def test_leave_approve_flow_updates_balance(client, employee_token, hr_token):
    start, end = _future_workdays(90, 2)
    payload = {"leave_type": "AL", "start_date": start, "end_date": end, "reason": "uji approve"}
    created = client.post("/api/v1/leave-requests", headers=auth_headers(employee_token),
                          json=payload).json()
    req_id = created["id"]
    days = created["total_days"]
    before = {b["leave_type"]: b for b in
              client.get("/api/v1/leave-balances/me", headers=auth_headers(employee_token)).json()}
    used_before = before["AL"]["used_days"]
    resp = client.put(f"/api/v1/leave-requests/{req_id}/approve", headers=auth_headers(hr_token))
    assert resp.status_code == 200
    after = {b["leave_type"]: b for b in
             client.get("/api/v1/leave-balances/me", headers=auth_headers(employee_token)).json()}
    assert after["AL"]["used_days"] == used_before + days
