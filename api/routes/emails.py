from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import uuid
import time
from api.models import Email, Account, FolderAction, LabelAction
from api.db.mock_data import db

router = APIRouter(prefix="/emails", tags=["Emails"])

@router.get("/accounts", response_model=List[Account])
def get_accounts():
    return db.get_accounts()

@router.get("", response_model=List[Email])
def get_emails(
    account: Optional[str] = Query(None, description="Account ID or 'all'"),
    folder: Optional[str] = Query(None, description="Folder name (inbox, archived, trash, sent)"),
    q: Optional[str] = Query(None, description="Search query string")
):
    return db.get_emails(account_id=account, folder=folder, q=q)

@router.get("/{email_id}", response_model=Email)
def get_email(email_id: str):
    email = db.get_email_by_id(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email

@router.post("/folder")
def move_to_folder(action: FolderAction):
    success = db.update_email_folder(action.emailIds, action.folder)
    return {"success": success, "emailIds": action.emailIds, "folder": action.folder}

@router.post("/read")
def mark_read(email_ids: List[str] = Query(..., alias="emailIds"), read: bool = True):
    success = db.mark_emails_read_status(email_ids, read)
    return {"success": success, "emailIds": email_ids, "read": read}

@router.post("/labels")
def modify_labels(action: LabelAction):
    success = db.update_email_labels(action.emailIds, action.label, action.action)
    return {"success": success, "emailIds": action.emailIds, "label": action.label, "action": action.action}

@router.post("/compose")
def compose_email(email_data: dict):
    # Compose represents creating a new sent email record
    email_id = f"sent-{str(uuid.uuid4())[:8]}"
    
    # Setup ISO date
    iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    # Try to find corresponding account info
    accounts = {a.id: a for a in db.get_accounts()}
    from_email = accounts.get(email_data.get("accountId"), Account(id="gmail", name="Alex", type="gmail", email="alex.dev@gmail.com")).email
    
    new_email = Email(
        id=email_id,
        accountId=email_data.get("accountId", "gmail"),
        fromEmail=from_email,
        fromName="Alex Rivers",
        toEmail=email_data.get("toEmail"),
        subject=email_data.get("subject", "(No Subject)"),
        body=email_data.get("body", ""),
        date=iso_date,
        folder="sent",
        labels=email_data.get("labels", []),
        read=True,
        priority="medium"
    )
    
    db.add_email(new_email)
    return {"success": True, "email": new_email}
