"""CVLN Command Center v1.0 - Backend API regression tests"""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://command-center-524.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "cvlgroupe@hotmail.com"
ADMIN_PASS = "CVLN@dmin2026!"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------------- Auth ----------------
class TestAuth:
    def test_login_admin(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_register_blocks_admin_role(self):
        # registering as admin should be forced to viewer
        import uuid as _u
        email = f"TEST_{_u.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "pwd12345", "name": "TEST RBAC", "role": "admin"
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "viewer"


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_stats(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ["projects", "tasks", "contacts", "events", "finance", "upcoming_events", "recent_tasks"]:
            assert k in d
        assert "revenue" in d["finance"] and "expenses" in d["finance"] and "profit" in d["finance"]


# ---------------- Projects CRUD ----------------
class TestProjects:
    project_id = None

    def test_create(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/projects", headers=admin_headers, json={
            "name": "TEST_Project", "description": "desc", "status": "planning",
            "team_members": [], "budget": 100.0
        }, timeout=10)
        assert r.status_code == 200, r.text
        TestProjects.project_id = r.json()["id"]
        assert r.json()["name"] == "TEST_Project"

    def test_get_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/projects", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert any(p["id"] == TestProjects.project_id for p in r.json())

    def test_update(self, admin_headers):
        r = requests.put(f"{BASE_URL}/api/projects/{TestProjects.project_id}", headers=admin_headers, json={
            "name": "TEST_Project_upd", "description": "u", "status": "in_progress",
            "team_members": [], "budget": 200.0
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Project_upd"
        assert r.json()["budget"] == 200.0

    def test_delete(self, admin_headers):
        r = requests.delete(f"{BASE_URL}/api/projects/{TestProjects.project_id}", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/projects/{TestProjects.project_id}", headers=admin_headers, timeout=10)
        assert g.status_code == 404


# ---------------- Tasks CRUD ----------------
class TestTasks:
    tid = None

    def test_create(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json={
            "title": "TEST_Task", "priority": "high", "status": "todo"
        }, timeout=10)
        assert r.status_code == 200, r.text
        TestTasks.tid = r.json()["id"]

    def test_toggle_complete(self, admin_headers):
        r = requests.put(f"{BASE_URL}/api/tasks/{TestTasks.tid}", headers=admin_headers, json={
            "title": "TEST_Task", "priority": "high", "status": "completed"
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

    def test_delete(self, admin_headers):
        r = requests.delete(f"{BASE_URL}/api/tasks/{TestTasks.tid}", headers=admin_headers, timeout=10)
        assert r.status_code == 200


# ---------------- Finance ----------------
class TestFinance:
    rev = None
    exp = None

    def test_create_revenue(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/finance", headers=admin_headers, json={
            "type": "revenue", "category": "sales", "amount": 5000.0, "description": "TEST_rev"
        }, timeout=10)
        assert r.status_code == 200
        TestFinance.rev = r.json()["id"]

    def test_create_expense(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/finance", headers=admin_headers, json={
            "type": "expense", "category": "ops", "amount": 1200.0, "description": "TEST_exp"
        }, timeout=10)
        assert r.status_code == 200
        TestFinance.exp = r.json()["id"]

    def test_update(self, admin_headers):
        r = requests.put(f"{BASE_URL}/api/finance/{TestFinance.rev}", headers=admin_headers, json={
            "type": "revenue", "category": "sales", "amount": 7500.0, "description": "TEST_rev_upd"
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["amount"] == 7500.0

    def test_delete_both(self, admin_headers):
        for fid in [TestFinance.rev, TestFinance.exp]:
            r = requests.delete(f"{BASE_URL}/api/finance/{fid}", headers=admin_headers, timeout=10)
            assert r.status_code == 200


# ---------------- Contacts ----------------
class TestContacts:
    cid = None
    def test_create(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/contacts", headers=admin_headers, json={
            "name": "TEST_Contact", "email": "t@t.com", "type": "partner"
        }, timeout=10)
        assert r.status_code == 200
        TestContacts.cid = r.json()["id"]

    def test_update(self, admin_headers):
        r = requests.put(f"{BASE_URL}/api/contacts/{TestContacts.cid}", headers=admin_headers, json={
            "name": "TEST_Contact_upd", "email": "t@t.com", "type": "client"
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["type"] == "client"

    def test_delete(self, admin_headers):
        r = requests.delete(f"{BASE_URL}/api/contacts/{TestContacts.cid}", headers=admin_headers, timeout=10)
        assert r.status_code == 200


# ---------------- Events ----------------
class TestEvents:
    eid = None
    def test_create(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/events", headers=admin_headers, json={
            "title": "TEST_Event", "date": "2026-06-01T10:00:00", "location": "Paris"
        }, timeout=10)
        assert r.status_code == 200
        TestEvents.eid = r.json()["id"]

    def test_update(self, admin_headers):
        r = requests.put(f"{BASE_URL}/api/events/{TestEvents.eid}", headers=admin_headers, json={
            "title": "TEST_Event_upd", "date": "2026-06-02T10:00:00", "location": "Lyon"
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["location"] == "Lyon"

    def test_delete(self, admin_headers):
        r = requests.delete(f"{BASE_URL}/api/events/{TestEvents.eid}", headers=admin_headers, timeout=10)
        assert r.status_code == 200


# ---------------- KPIs ----------------
class TestKPIs:
    kid = None
    def test_create(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/kpis", headers=admin_headers, json={
            "name": "TEST_KPI", "value": 95.0, "unit": "%", "category": "general"
        }, timeout=10)
        assert r.status_code == 200
        TestKPIs.kid = r.json()["id"]

    def test_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/kpis", headers=admin_headers, timeout=10)
        assert r.status_code == 200

    def test_delete(self, admin_headers):
        r = requests.delete(f"{BASE_URL}/api/kpis/{TestKPIs.kid}", headers=admin_headers, timeout=10)
        assert r.status_code == 200


# ---------------- Documents ----------------
class TestDocuments:
    did = None

    def test_upload(self, admin_token):
        files = {"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
        data = {"title": "TEST_Doc", "category": "general"}
        r = requests.post(
            f"{BASE_URL}/api/documents",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files, data=data, timeout=15
        )
        assert r.status_code == 200, r.text
        TestDocuments.did = r.json()["id"]

    def test_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/documents", headers=admin_headers, timeout=10)
        assert r.status_code == 200

    def test_delete(self, admin_headers):
        if TestDocuments.did:
            r = requests.delete(f"{BASE_URL}/api/documents/{TestDocuments.did}", headers=admin_headers, timeout=10)
            assert r.status_code == 200


# ---------------- RBAC ----------------
class TestRBAC:
    def test_viewer_cannot_create_project(self):
        import uuid as _u
        email = f"TEST_v_{_u.uuid4().hex[:8]}@example.com"
        rr = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "pwd12345", "name": "viewer", "role": "viewer"
        }, timeout=10)
        assert rr.status_code == 200
        tok = rr.json()["access_token"]
        r = requests.post(f"{BASE_URL}/api/projects",
                          headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
                          json={"name": "x"}, timeout=10)
        assert r.status_code == 403
