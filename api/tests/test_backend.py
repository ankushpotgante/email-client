import pytest
from fastapi.testclient import TestClient
from api.index import app
from api.db.mock_data import db

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "supported_accounts" in response.json()

def test_get_accounts():
    response = client.get("/api/emails/accounts")
    assert response.status_code == 200
    assert len(response.json()) == 3
    assert response.json()[0]["id"] == "gmail"

def test_get_emails():
    response = client.get("/api/emails")
    assert response.status_code == 200
    assert len(response.json()) > 0
    # verify format of email object
    first_email = response.json()[0]
    assert "id" in first_email
    assert "subject" in first_email
    assert "fromEmail" in first_email

def test_get_emails_filtered():
    # Filter by account
    response = client.get("/api/emails?account=office365")
    assert response.status_code == 200
    for e in response.json():
        assert e["accountId"] == "office365"

def test_get_email_detail():
    response = client.get("/api/emails/gm-1")
    assert response.status_code == 200
    assert response.json()["id"] == "gm-1"
    assert "Term Sheet" in response.json()["subject"]

def test_get_email_detail_not_found():
    response = client.get("/api/emails/non-existent-id")
    assert response.status_code == 404

def test_move_folder():
    # Move gm-3 to archived
    response = client.post(
        "/api/emails/folder",
        json={"emailIds": ["gm-3"], "folder": "archived"}
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Verify DB state
    email = db.get_email_by_id("gm-3")
    assert email is not None
    assert email.folder == "archived"

def test_ai_prioritize():
    response = client.post(
        "/api/ai/prioritize",
        json={"emailId": "gm-2"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["emailId"] == "gm-2"
    assert data["priority"] == "high"
    assert len(data["priorityReason"]) > 0

def test_ai_summarize():
    response = client.post(
        "/api/ai/summarize",
        json={"emailId": "of-1"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["emailId"] == "of-1"
    assert "summary" in data
    assert len(data["summary"]) > 0

def test_ai_draft_reply():
    response = client.post(
        "/api/ai/draft-reply",
        json={"emailId": "gm-1", "prompt": "Sounds great, confirm 3pm", "tone": "friendly"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "body" in data
    assert "3:00 PM" in data["body"] or "Alex" in data["body"]

def test_create_demo_account():
    response = client.post(
        "/api/emails/accounts",
        json={"id": "demo-acc-1", "name": "Demo Account", "type": "gmail", "email": "demo@domain.com"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == "demo-acc-1"
    
    # Check that welcome email was created for demo account
    response = client.get("/api/emails?account=demo-acc-1")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert "Welcome" in response.json()[0]["subject"]

def test_create_real_account_invalid_credentials():
    response = client.post(
        "/api/emails/accounts",
        json={"id": "real-acc-1", "name": "Real Account", "type": "gmail", "email": "real@gmail.com", "password": "wrong_password"}
    )
    assert response.status_code == 400
    assert "verification failed" in response.json()["detail"].lower()
