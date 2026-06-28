import pytest
import os
import shutil
from pathlib import Path
from fastapi.testclient import TestClient

from api.index import app
from api.db.database import db_instance

client = TestClient(app)

TEST_DB_PATH = Path(__file__).resolve().parent.parent / "test_auramail.db"
auth_headers = {}
test_user_id = ""

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Redirects the global database to a temporary SQLite test database."""
    # Override database path
    original_db_path = db_instance.db_path
    db_instance.db_path = TEST_DB_PATH
    db_instance.init_db()
    
    # Ensure dummy user (with seeded data) exists in the test database
    from api.routes.auth import ensure_dummy_account
    ensure_dummy_account()
    
    yield
    
    # Reset path and clean up test file
    db_instance.db_path = original_db_path
    if TEST_DB_PATH.exists():
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "supported_accounts" in response.json()

def test_register_user():
    """Test registering a new clean user (no seeded data by design)."""
    global auth_headers, test_user_id
    response = client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "testuser"
    test_user_id = data["user"]["id"]

def test_login_as_dummy():
    """Login as dummy/dummy to get a token with seeded data for subsequent tests."""
    global auth_headers
    response = client.post(
        "/api/auth/login",
        json={"username": "dummy", "password": "dummy"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    token = data["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

def test_get_accounts():
    response = client.get("/api/emails/accounts", headers=auth_headers)
    assert response.status_code == 200
    # User is seeded with 3 default accounts upon registration
    assert len(response.json()) == 3
    assert response.json()[0]["type"] == "gmail"

def test_get_emails():
    response = client.get("/api/emails", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) > 0
    # verify format of email object
    first_email = response.json()[0]
    assert "id" in first_email
    assert "subject" in first_email
    assert "fromEmail" in first_email
    assert "bodyHtml" in first_email

def test_get_emails_filtered():
    # Fetch seeded accounts to find the ID
    accs = client.get("/api/emails/accounts", headers=auth_headers).json()
    office_acc_id = next(a["id"] for a in accs if a["type"] == "office365")
    
    response = client.get(f"/api/emails?account={office_acc_id}", headers=auth_headers)
    assert response.status_code == 200
    for e in response.json():
        assert e["accountId"] == office_acc_id

def test_get_email_detail():
    # Resolve seeded email ID
    emails_list = client.get("/api/emails", headers=auth_headers).json()
    vc_email = next(e for e in emails_list if "Term Sheet" in e["subject"])
    
    response = client.get(f"/api/emails/{vc_email['id']}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == vc_email["id"]
    assert "Sarah Jenkins" in response.json()["fromName"]

def test_get_email_detail_not_found():
    response = client.get("/api/emails/non-existent-id", headers=auth_headers)
    assert response.status_code == 404

def test_move_folder():
    emails_list = client.get("/api/emails", headers=auth_headers).json()
    first_email_id = emails_list[0]["id"]
    
    response = client.post(
        "/api/emails/folder",
        json={"emailIds": [first_email_id], "folder": "archived"},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Verify by fetching from API
    detail = client.get(f"/api/emails/{first_email_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["folder"] == "archived"

def test_ai_prioritize():
    emails_list = client.get("/api/emails", headers=auth_headers).json()
    db_email_id = emails_list[0]["id"]
    
    response = client.post(
        "/api/ai/prioritize",
        json={"emailId": db_email_id},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["emailId"] == db_email_id
    assert data["priority"] in ["high", "medium", "low"]
    assert len(data["priorityReason"]) > 0

def test_ai_summarize():
    emails_list = client.get("/api/emails", headers=auth_headers).json()
    db_email_id = emails_list[0]["id"]
    
    response = client.post(
        "/api/ai/summarize",
        json={"emailId": db_email_id},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["emailId"] == db_email_id
    assert "summary" in data
    assert len(data["summary"]) > 0

def test_ai_draft_reply():
    emails_list = client.get("/api/emails", headers=auth_headers).json()
    vc_email = next(e for e in emails_list if "Term Sheet" in e["subject"])
    
    response = client.post(
        "/api/ai/draft-reply",
        json={"emailId": vc_email["id"], "prompt": "Confirm 3pm", "tone": "friendly"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "body" in data
    assert len(data["body"]) > 0

def test_create_demo_account():
    response = client.post(
        "/api/emails/accounts",
        json={"id": "demo-acc-99", "name": "Demo Account", "type": "gmail", "email": "demo99@domain.com"},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["id"] == "demo-acc-99"
    
    # Check that welcome email was created for demo account
    response = client.get("/api/emails?account=demo-acc-99", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert "Welcome" in response.json()[0]["subject"]

def test_create_real_account_invalid_credentials():
    response = client.post(
        "/api/emails/accounts",
        json={"id": "real-acc-99", "name": "Real Account", "type": "gmail", "email": "real99@gmail.com", "password": "wrong_password"},
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "verification failed" in response.json()["detail"].lower()
