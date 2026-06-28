import uuid
import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from api.db.database import db_instance
from api.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

class AuthRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=5, max_length=100)

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


# ==================== Seed Data Helper ====================

def seed_new_user_data(user_id: str):
    """
    Seeds a newly registered user with default demo mailboxes and emails,
    so they have interactive data to play with instantly.
    """
    # 1. Seed Accounts
    accounts = [
        {"id": f"gmail-{user_id[:4]}", "name": "Alex Dev", "type": "gmail", "email": "alex.dev@gmail.com"},
        {"id": f"office365-{user_id[:4]}", "name": "Alex Rivers", "type": "office365", "email": "alex.rivers@microsoft.com"},
        {"id": f"imap-{user_id[:4]}", "name": "Alex Personal", "type": "imap", "email": "alex.personal@yahoo.com"}
    ]
    for acc in accounts:
        db_instance.add_account(
            account_id=acc["id"],
            user_id=user_id,
            name=acc["name"],
            type_name=acc["type"],
            email=acc["email"],
            password_encrypted=None
        )

    # 2. Seed Emails
    gmail_id = accounts[0]["id"]
    office_id = accounts[1]["id"]
    imap_id = accounts[2]["id"]

    iso_date_1 = time.strftime("%Y-%m-%dT15:30:00Z", time.gmtime())
    iso_date_2 = time.strftime("%Y-%m-%dT09:15:00Z", time.gmtime())
    iso_date_3 = time.strftime("%Y-%m-%dT18:45:00Z", time.gmtime())
    iso_date_4 = time.strftime("%Y-%m-%dT11:20:00Z", time.gmtime())

    emails = [
        {
            "id": f"gm-1-{user_id[:4]}",
            "account_id": gmail_id,
            "from_email": "sjenkins@venturesvc.com",
            "from_name": "Sarah Jenkins",
            "to_email": "alex.dev@gmail.com",
            "subject": "Seed Round Term Sheet - AuraMail",
            "body": "Hi Alex,\n\nI am pleased to send over the finalized term sheet for AuraMail's seed funding round. We are excited about partnering with you.\n\nPlease review the terms. Our offer expires in 24 hours, so let's schedule a brief call at 3:00 PM EST today to resolve any final questions.\n\nBest,\nSarah Jenkins",
            "body_html": "<p>Hi Alex,</p><p>I am pleased to send over the finalized term sheet for AuraMail's seed funding round. We are excited about partnering with you.</p><p>Please review the terms. Our offer expires in 24 hours, so let's schedule a brief call at 3:00 PM EST today to resolve any final questions.</p><p>Best,<br>Sarah Jenkins</p>",
            "date": iso_date_1,
            "folder": "inbox",
            "labels": ["Important", "VC"],
            "read": False,
            "priority": "high",
            "priority_reason": "High importance: Term sheet offer with a 24-hour expiration requiring a call today.",
            "summary": "- Seed round term sheet received from Ventures VC.\n- 24-hour expiration clause is active.\n- Calls scheduled at 3:00 PM EST today for details."
        },
        {
            "id": f"gm-2-{user_id[:4]}",
            "account_id": gmail_id,
            "from_email": "alerts@aws.amazon.com",
            "from_name": "AWS CloudWatch",
            "to_email": "alex.dev@gmail.com",
            "subject": "CRITICAL ALERT: Production Database CPU Usage > 95%",
            "body": "CloudWatch Warning Alert:\n\nMetric Name: CPUUtilization\nNamespace: AWS/RDS\nDB Instance: auramail-prod-db\nRegion: us-east-1\nThreshold: > 95.0% for 5 minutes\nCurrent Value: 98.4%\n\nAction: Immediate sysops investigation is requested to prevent query latency spikes and service outages.",
            "body_html": "<div style='font-family:sans-serif;color:#d10000;border:1px solid #d10000;padding:15px;border-radius:8px;'><h3 style='margin-top:0;'>CloudWatch Warning Alert</h3><p><strong>Metric Name:</strong> CPUUtilization<br><strong>Namespace:</strong> AWS/RDS<br><strong>DB Instance:</strong> auramail-prod-db<br><strong>Region:</strong> us-east-1<br><strong>Threshold:</strong> &gt; 95.0% for 5 minutes<br><strong>Current Value:</strong> 98.4%</p><p><strong>Action:</strong> Immediate sysops investigation is requested to prevent query latency spikes and service outages.</p></div>",
            "date": iso_date_2,
            "folder": "inbox",
            "labels": ["System", "Alert"],
            "read": False,
            "priority": "high",
            "priority_reason": "High importance: Critical database overload alert requiring immediate sysops triage.",
            "summary": "- Production database CPU has spiked to 98.4%.\n- CloudWatch critical threshold exceeded.\n- Action required immediately to avoid service interruption."
        },
        {
            "id": f"of-1-{user_id[:4]}",
            "account_id": office_id,
            "from_email": "dharris@microsoft.com",
            "from_name": "David Harris (VP)",
            "to_email": "alex.rivers@microsoft.com",
            "subject": "Q3 Strategy Slide Submissions due tomorrow",
            "body": "Hi Team,\n\nFriendly reminder that all department roadmaps and Q3 budget allocations must be uploaded to the SharePoint portal by 9:00 AM tomorrow morning.\n\nMake sure your slide deck details the integration plans for the Agent OS features we discussed last week.\n\nThanks,\nDavid Harris\nVP of Product",
            "body_html": "<p>Hi Team,</p><p>Friendly reminder that all department roadmaps and Q3 budget allocations must be uploaded to the SharePoint portal by <strong>9:00 AM tomorrow morning</strong>.</p><p>Make sure your slide deck details the integration plans for the <em>Agent OS</em> features we discussed last week.</p><p>Thanks,<br>David Harris<br>VP of Product</p>",
            "date": iso_date_3,
            "folder": "inbox",
            "labels": ["Work", "Deadline"],
            "read": True,
            "priority": "medium",
            "priority_reason": "Medium importance: Standard work deadline for Q3 slides due by 9:00 AM tomorrow.",
            "summary": "- Q3 Strategy slide decks are due tomorrow morning at 9:00 AM.\n- Slides must highlight the integration details of Agent OS workflows.\n- Decks should be uploaded to the shared SharePoint portal."
        },
        {
            "id": f"im-1-{user_id[:4]}",
            "account_id": imap_id,
            "from_email": "mom@family.net",
            "from_name": "Mom",
            "to_email": "alex.personal@yahoo.com",
            "subject": "Lasagna on Sunday dinner?",
            "body": "Hi Alex,\n\nI am making lasagna this Sunday dinner! Let me know if you can make it. Can you pick up some garlic bread from the local bakery on your way?\n\nAlso, let me know if your friends are coming so I make enough.\n\nLove,\nMom",
            "body_html": "<p>Hi Alex,</p><p>I am making lasagna this Sunday dinner! Let me know if you can make it. Can you pick up some garlic bread from the local bakery on your way?</p><p>Also, let me know if your friends are coming so I make enough.</p><p>Love,<br>Mom</p>",
            "date": iso_date_4,
            "folder": "inbox",
            "labels": ["Family", "Personal"],
            "read": False,
            "priority": "high",
            "priority_reason": "High importance: Personal family check-in regarding Sunday dinner plans and catering.",
            "summary": "- Mom invites Alex to Sunday dinner for lasagna.\n- Asks Alex to buy garlic bread from the local bakery.\n- Asks for a headcount confirmation if friends are attending."
        }
    ]

    for mail in emails:
        db_instance.add_email(
            email_id=mail["id"],
            account_id=mail["account_id"],
            user_id=user_id,
            from_email=mail["from_email"],
            from_name=mail["from_name"],
            to_email=mail["to_email"],
            subject=mail["subject"],
            body=mail["body"],
            body_html=mail["body_html"],
            date_str=mail["date"],
            folder=mail["folder"],
            labels=mail["labels"],
            read=mail["read"],
            priority=mail["priority"],
            priority_reason=mail["priority_reason"],
            summary=mail["summary"]
        )


def ensure_dummy_account():
    """Creates a static dummy user seeded with demo data for new visitors."""
    existing = db_instance.get_user_by_username("dummy")
    if existing:
        return  # Already exists
    
    dummy_id = "dummy-user-00000000"
    pw_hash = hash_password("dummy")
    created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    success = db_instance.create_user(dummy_id, "dummy", pw_hash, created_at)
    if success:
        try:
            seed_new_user_data(dummy_id)
        except Exception as e:
            pass


# ==================== Auth Endpoints ====================

@router.post("/register", response_model=AuthResponse)
def register(req: AuthRequest):
    # Check if username exists
    existing = db_instance.get_user_by_username(req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username is already taken.")

    user_id = str(uuid.uuid4())
    pw_hash = hash_password(req.password)
    created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Create user
    success = db_instance.create_user(user_id, req.username, pw_hash, created_at)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create user.")

    # Create token
    token = create_access_token(user_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "username": req.username}
    }

@router.post("/login", response_model=AuthResponse)
def login(req: AuthRequest):
    user = db_instance.get_user_by_username(req.username)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid username or password.")

    # Verify password
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid username or password.")

    token = create_access_token(user["id"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "username": user["username"]}
    }
