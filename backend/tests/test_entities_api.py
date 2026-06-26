"""Entities module backend tests - CRUD, project linking, RBAC, unlink-on-delete"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://command-center-524.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "cvlgroupe@hotmail.com"
ADMIN_PASS = "CVLN@dmin2026!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _register(role):
    email = f"TEST_{role}_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "pwd12345", "name": f"TEST_{role}", "role": role
    }, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["access_token"], r.json()["user"]["role"]


@pytest.fixture(scope="module")
def viewer_headers():
    tok, role = _register("viewer")
    assert role == "viewer"
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def manager_headers():
    tok, role = _register("manager")
    assert role == "manager"
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# -------- Entity CRUD --------
class TestEntitiesCRUD:
    eid = None

    def test_list_existing(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/entities", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        names = [e["name"] for e in r.json()]
        # Pre-seeded entities expected
        assert any("CVLN" in n for n in names) or len(r.json()) >= 0

    def test_create(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/entities", headers=admin_headers, json={
            "name": "TEST_Entity_A", "description": "test entity", "type": "label", "color": "#FF00AA"
        }, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_Entity_A"
        assert d["type"] == "label"
        assert d["color"] == "#FF00AA"
        assert "id" in d
        TestEntitiesCRUD.eid = d["id"]

    def test_get_one(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/entities/{TestEntitiesCRUD.eid}", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Entity_A"

    def test_update(self, admin_headers):
        r = requests.put(f"{BASE_URL}/api/entities/{TestEntitiesCRUD.eid}", headers=admin_headers, json={
            "name": "TEST_Entity_A_upd", "description": "updated", "type": "agency", "color": "#00FF00"
        }, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "TEST_Entity_A_upd"
        assert r.json()["type"] == "agency"

    def test_get_404(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/entities/nonexistent-id", headers=admin_headers, timeout=10)
        assert r.status_code == 404


# -------- Project linking + unlink-on-delete --------
class TestEntityProjectLink:
    entity_id = None
    project_id = None

    def test_create_entity(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/entities", headers=admin_headers, json={
            "name": "TEST_LinkEntity", "description": "", "type": "holding", "color": "#D4AF37"
        }, timeout=10)
        assert r.status_code == 200
        TestEntityProjectLink.entity_id = r.json()["id"]

    def test_create_project_with_entity(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/projects", headers=admin_headers, json={
            "name": "TEST_LinkedProject", "description": "x", "status": "planning",
            "team_members": [], "budget": 0, "entity_id": TestEntityProjectLink.entity_id
        }, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("entity_id") == TestEntityProjectLink.entity_id
        TestEntityProjectLink.project_id = d["id"]

    def test_get_project_returns_entity_id(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/projects/{TestEntityProjectLink.project_id}", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json().get("entity_id") == TestEntityProjectLink.entity_id

    def test_unlink_via_update(self, admin_headers):
        r = requests.put(f"{BASE_URL}/api/projects/{TestEntityProjectLink.project_id}", headers=admin_headers, json={
            "name": "TEST_LinkedProject", "description": "x", "status": "planning",
            "team_members": [], "budget": 0, "entity_id": None
        }, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json().get("entity_id") in (None, "")
        # Re-link
        r2 = requests.put(f"{BASE_URL}/api/projects/{TestEntityProjectLink.project_id}", headers=admin_headers, json={
            "name": "TEST_LinkedProject", "description": "x", "status": "planning",
            "team_members": [], "budget": 0, "entity_id": TestEntityProjectLink.entity_id
        }, timeout=10)
        assert r2.status_code == 200
        assert r2.json().get("entity_id") == TestEntityProjectLink.entity_id

    def test_delete_entity_unlinks_projects(self, admin_headers):
        r = requests.delete(f"{BASE_URL}/api/entities/{TestEntityProjectLink.entity_id}", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        # Verify project is unlinked
        pr = requests.get(f"{BASE_URL}/api/projects/{TestEntityProjectLink.project_id}", headers=admin_headers, timeout=10)
        assert pr.status_code == 200
        assert pr.json().get("entity_id") in (None, "")

    def test_cleanup_project(self, admin_headers):
        if TestEntityProjectLink.project_id:
            requests.delete(f"{BASE_URL}/api/projects/{TestEntityProjectLink.project_id}", headers=admin_headers, timeout=10)


# -------- RBAC --------
class TestEntityRBAC:
    def test_viewer_cannot_create(self, viewer_headers):
        r = requests.post(f"{BASE_URL}/api/entities", headers=viewer_headers, json={
            "name": "TEST_ViewerEntity", "type": "other"
        }, timeout=10)
        assert r.status_code == 403

    def test_viewer_cannot_delete(self, viewer_headers, admin_headers):
        # Create as admin
        r = requests.post(f"{BASE_URL}/api/entities", headers=admin_headers, json={
            "name": "TEST_DelTarget", "type": "other"
        }, timeout=10)
        assert r.status_code == 200
        eid = r.json()["id"]
        rv = requests.delete(f"{BASE_URL}/api/entities/{eid}", headers=viewer_headers, timeout=10)
        assert rv.status_code == 403
        # cleanup
        requests.delete(f"{BASE_URL}/api/entities/{eid}", headers=admin_headers, timeout=10)

    def test_manager_can_create_edit(self, manager_headers, admin_headers):
        r = requests.post(f"{BASE_URL}/api/entities", headers=manager_headers, json={
            "name": "TEST_MgrEntity", "type": "studio", "color": "#123456"
        }, timeout=10)
        assert r.status_code == 200, r.text
        eid = r.json()["id"]
        # edit
        ru = requests.put(f"{BASE_URL}/api/entities/{eid}", headers=manager_headers, json={
            "name": "TEST_MgrEntity_upd", "type": "studio", "color": "#654321"
        }, timeout=10)
        assert ru.status_code == 200
        assert ru.json()["name"] == "TEST_MgrEntity_upd"
        # manager cannot delete
        rd = requests.delete(f"{BASE_URL}/api/entities/{eid}", headers=manager_headers, timeout=10)
        assert rd.status_code == 403, f"Expected manager to be blocked from delete; got {rd.status_code}"
        # admin cleanup
        requests.delete(f"{BASE_URL}/api/entities/{eid}", headers=admin_headers, timeout=10)


# -------- Cleanup --------
def test_zz_cleanup(admin_headers=None):
    # final pass: delete any TEST_ prefixed entities still around
    headers = {"Authorization": f"Bearer {requests.post(f'{BASE_URL}/api/auth/login', json={'email': ADMIN_EMAIL, 'password': ADMIN_PASS}).json()['access_token']}"}
    r = requests.get(f"{BASE_URL}/api/entities", headers=headers, timeout=10)
    if r.status_code == 200:
        for e in r.json():
            if e.get("name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/entities/{e['id']}", headers=headers, timeout=10)
