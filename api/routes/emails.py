import uuid
import time
import imaplib
import smtplib
import email
import json
import logging
import re
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from email.header import decode_header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from api.models import Email, Account, FolderAction, LabelAction
from api.db.database import db_instance as db
from api.auth import get_current_user, encrypt_password, decrypt_password

logger = logging.getLogger("EmailsRouter")

router = APIRouter(prefix="/emails", tags=["Emails"])


# ==================== Endpoints ====================

@router.get("/accounts", response_model=List[Account])
def get_accounts(user_id: str = Depends(get_current_user)):
    db_accounts = db.get_accounts(user_id)
    result = []
    for acc in db_accounts:
        result.append(Account(
            id=acc["id"],
            name=acc["name"],
            type=acc["type"],
            email=acc["email"],
            password=None  # Never return passwords to the client
        ))
    return result

@router.post("/accounts", response_model=Account)
def create_account(account: Account, user_id: str = Depends(get_current_user)):
    # Verify unique ID for this user
    existing_list = db.get_accounts(user_id)
    for existing in existing_list:
        if existing["id"] == account.id:
            raise HTTPException(status_code=400, detail="Account ID already exists")

    # Verify credentials via IMAP connection check if this is a real account (has password)
    if account.password:
        server_map = {
            "gmail": "imap.gmail.com",
            "office365": "outlook.office365.com",
            "imap": "imap.mail.yahoo.com"
        }
        server = server_map.get(account.type, "imap.gmail.com")
        
        # Try to resolve custom domains
        if account.type == "imap" and "@" in account.email:
            domain = account.email.split("@")[1]
            if "yahoo" in domain:
                server = "imap.mail.yahoo.com"
            elif "aol" in domain:
                server = "imap.aol.com"
            elif "icloud" in domain:
                server = "imap.mail.me.com"
                
        try:
            logger.info(f"Verifying IMAP credentials on {server} for {account.email}...")
            imap = imaplib.IMAP4_SSL(server, port=993)
            imap.login(account.email, account.password)
            imap.logout()
            logger.info("IMAP credentials verified successfully.")
        except Exception as e:
            logger.error(f"IMAP verification failed during account creation: {e}")
            raise HTTPException(
                status_code=400, 
                detail="Connection verification failed. Please check your email address and App Password."
            )
            
    # Encrypt password before storing in SQLite
    password_encrypted = encrypt_password(account.password) if account.password else None
    
    db.add_account(
        account_id=account.id,
        user_id=user_id,
        name=account.name,
        type_name=account.type,
        email=account.email,
        password_encrypted=password_encrypted
    )
    
    # Generate initial welcome email ONLY for demo accounts (without password)
    if not account.password:
        welcome_id = f"welcome-{account.id}"
        iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        welcome_email_body = f"Hi {account.name},\n\nWelcome to your new {account.type.upper()} email inbox on AuraMail!\n\nThis client integrates OpenAI agents to summarize threads, suggest quick replies, and prioritize incoming messages. We are thrilled to have you here.\n\nBest regards,\nThe AuraMail Team"
        welcome_email_html = f"<p>Hi {account.name},</p><p>Welcome to your new {account.type.upper()} email inbox on AuraMail!</p><p>This client integrates OpenAI agents to summarize threads, suggest quick replies, and prioritize incoming messages. We are thrilled to have you here.</p><p>Best regards,<br>The AuraMail Team</p>"
        
        db.add_email(
            email_id=welcome_id,
            account_id=account.id,
            user_id=user_id,
            from_email="team@auramail.ai",
            from_name="AuraMail Team",
            to_email=account.email,
            subject=f"Welcome to AuraMail, {account.name}!",
            body=welcome_email_body,
            body_html=welcome_email_html,
            date_str=iso_date,
            folder="inbox",
            labels=["System", "Welcome"],
            read=False,
            priority="high",
            priority_reason="Welcome message outlining core account activation details.",
            summary="A welcome email introducing the new user to their integrated AI-first inbox features."
        )
    
    return account

@router.get("", response_model=List[Email])
def get_emails(
    account: Optional[str] = Query(None, description="Account ID or 'all'"),
    folder: Optional[str] = Query(None, description="Folder name (inbox, archived, trash, sent)"),
    q: Optional[str] = Query(None, description="Search query string"),
    user_id: str = Depends(get_current_user)
):
    rows = db.get_emails(user_id=user_id, account_id=account, folder=folder, q=q)
    return [Email(
        id=r["id"],
        accountId=r["account_id"],
        fromEmail=r["from_email"],
        fromName=r["from_name"],
        toEmail=r["to_email"],
        subject=r["subject"] or "",
        body=r["body"] or "",
        bodyHtml=r["body_html"] or "",
        date=r["date"],
        folder=r["folder"],
        labels=r["labels"],
        read=r["read"],
        priority=r["priority"],
        priorityReason=r["priority_reason"],
        summary=r["summary"]
    ) for r in rows]

@router.get("/{email_id}", response_model=Email)
def get_email(email_id: str, user_id: str = Depends(get_current_user)):
    r = db.get_email_by_id(user_id, email_id)
    if not r:
        raise HTTPException(status_code=404, detail="Email not found")
    return Email(
        id=r["id"],
        accountId=r["account_id"],
        fromEmail=r["from_email"],
        fromName=r["from_name"],
        toEmail=r["to_email"],
        subject=r["subject"] or "",
        body=r["body"] or "",
        bodyHtml=r["body_html"] or "",
        date=r["date"],
        folder=r["folder"],
        labels=r["labels"],
        read=r["read"],
        priority=r["priority"],
        priorityReason=r["priority_reason"],
        summary=r["summary"]
    )

@router.post("/folder")
def move_to_folder(action: FolderAction, user_id: str = Depends(get_current_user)):
    success = db.update_email_folder(user_id, action.emailIds, action.folder)
    return {"success": success, "emailIds": action.emailIds, "folder": action.folder}

@router.post("/read")
def mark_read(email_ids: List[str] = Query(..., alias="emailIds"), read: bool = True, user_id: str = Depends(get_current_user)):
    success = db.mark_emails_read_status(user_id, email_ids, read)
    return {"success": success, "emailIds": email_ids, "read": read}

@router.post("/labels")
def modify_labels(action: LabelAction, user_id: str = Depends(get_current_user)):
    success = db.update_email_labels(user_id, action.emailIds, action.label, action.action)
    return {"success": success, "emailIds": action.emailIds, "label": action.label, "action": action.action}

@router.post("/compose")
def compose_email(email_data: dict, user_id: str = Depends(get_current_user)):
    email_id = f"sent-{str(uuid.uuid4())[:8]}"
    iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    # Try to find corresponding account info
    from_account = db.get_account_by_id(user_id, email_data.get("accountId"))
    if not from_account:
        from_account = {"email": "alex.dev@gmail.com", "name": "Alex", "password_encrypted": None, "type": "gmail"}
        
    from_email = from_account["email"]
    from_name = from_account["name"]
    password_encrypted = from_account["password_encrypted"]
    
    to_email = email_data.get("toEmail")
    subject = email_data.get("subject", "(No Subject)")
    body = email_data.get("body", "")
    body_html = email_data.get("bodyHtml", body.replace("\n", "<br>"))
    
    # If the account has a password, decrypt it and actually send via SMTP!
    if password_encrypted:
        plain_password = decrypt_password(password_encrypted)
        
        # Determine SMTP server and port
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        
        if from_account["type"] == "office365":
            smtp_server = "smtp.office365.com"
        elif from_account["type"] == "imap" and "@" in from_email:
            domain = from_email.split("@")[1]
            if "yahoo" in domain:
                smtp_server = "smtp.mail.yahoo.com"
            elif "aol" in domain:
                smtp_server = "smtp.aol.com"
            elif "icloud" in domain:
                smtp_server = "smtp.mail.me.com"
                
        try:
            logger.info(f"SMTP: Connecting to {smtp_server}:{smtp_port} to send message for {from_email}...")
            
            # Construct MIME Message
            msg = MIMEMultipart()
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            # Start TLS Session
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
            server.starttls()
            server.login(from_email, plain_password)
            server.sendmail(from_email, to_email, msg.as_string())
            server.quit()
            logger.info(f"SMTP: Email sent successfully from {from_email} to {to_email}.")
        except Exception as e:
            logger.error(f"SMTP failed to send email: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to send email. Verify SMTP connection settings and credentials. Error: {str(e)}"
            )
            
    db.add_email(
        email_id=email_id,
        account_id=email_data.get("accountId", "gmail"),
        user_id=user_id,
        from_email=from_email,
        from_name=from_name,
        to_email=to_email,
        subject=subject,
        body=body,
        body_html=body_html,
        date_str=iso_date,
        folder="sent",
        labels=email_data.get("labels", []),
        read=True,
        priority="medium"
    )
    
    return {
        "success": True, 
        "email": {
            "id": email_id,
            "accountId": email_data.get("accountId", "gmail"),
            "fromEmail": from_email,
            "fromName": from_name,
            "toEmail": to_email,
            "subject": subject,
            "body": body,
            "bodyHtml": body_html,
            "date": iso_date,
            "folder": "sent",
            "labels": email_data.get("labels", []),
            "read": True,
            "priority": "medium"
        }
    }

@router.post("/{account_id}/sync")
def sync_emails(account_id: str, user_id: str = Depends(get_current_user)):
    # Find account
    account = db.get_account_by_id(user_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    # If no password (like default seeds), simulate sync adding an email notification
    if not account["password_encrypted"]:
        sim_id = f"sim-{account_id}-{int(time.time())}"
        iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        db.add_email(
            email_id=sim_id,
            account_id=account_id,
            user_id=user_id,
            from_email="alerts@smartai.ai",
            from_name="Smart AI Assistant",
            to_email=account["email"],
            subject="Smart AI Inbox Synchronization Complete",
            body=f"Hello,\n\nThis is a simulated synchronization check for your {account['name']} account.\n\nAll folders are up to date. The Smart AI priority triaging system is active.",
            body_html=f"<p>Hello,</p><p>This is a simulated synchronization check for your {account['name']} account.</p><p>All folders are up to date. The Smart AI priority triaging system is active.</p>",
            date_str=iso_date,
            folder="inbox",
            labels=["Sync", "System"],
            read=False,
            priority="medium",
            priority_reason="Confirmation alert confirming successful mock synchronization of folders.",
            summary="A system confirmation email verifying successful account sync and agent attachments."
        )
        return {"status": "success", "synced": 1}

    # Connect to IMAP
    server_map = {
        "gmail": "imap.gmail.com",
        "office365": "outlook.office365.com",
        "imap": "imap.mail.yahoo.com"
    }
    server = server_map.get(account["type"], "imap.gmail.com")
    
    # Try to extract custom IMAP server if domain matches
    if account["type"] == "imap" and "@" in account["email"]:
        domain = account["email"].split("@")[1]
        if "yahoo" in domain:
            server = "imap.mail.yahoo.com"
        elif "aol" in domain:
            server = "imap.aol.com"
        elif "icloud" in domain:
            server = "imap.mail.me.com"
            
    # Decrypt password for IMAP connection
    plain_password = decrypt_password(account["password_encrypted"])
            
    try:
        logger.info(f"Connecting to IMAP server {server} on port 993...")
        imap = imaplib.IMAP4_SSL(server, port=993)
        imap.login(account["email"], plain_password)
        imap.select("INBOX")
        
        status, messages = imap.search(None, "ALL")
        if status != "OK":
            imap.close()
            imap.logout()
            raise HTTPException(status_code=400, detail="Failed to search IMAP inbox")
            
        msg_ids = messages[0].split()
        # Sync the last 5 emails to make it responsive
        recent_ids = msg_ids[-5:]
        synced_count = 0
        
        for msg_id in reversed(recent_ids):
            status, data = imap.fetch(msg_id, "(RFC822)")
            if status != "OK" or not data:
                continue
                
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            # Extract basic details
            local_id = f"imap-{account_id}-{msg_id.decode('utf-8')}"
            
            # Check duplicate
            if db.get_email_by_id(user_id, local_id):
                continue
                
            subject = decode_mime_header(msg.get("Subject", "(No Subject)"))
            
            # Parse sender details
            from_header = msg.get("From", "")
            from_name, from_email = email.utils.parseaddr(from_header)
            if not from_name:
                from_name = from_email.split("@")[0] if from_email else "Unknown"
            if not from_email:
                from_email = "unknown@domain.com"
                
            body, body_html = get_email_body_content(msg)
            if not body:
                body = "(No readable text content found)"
            if not body_html:
                body_html = body.replace("\n", "<br>")
                
            iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
            # Sync triage
            priority = "medium"
            priority_reason = ""
            try:
                from api.agents.agent_os import triage_agent
                email_text = f"From: {from_name} <{from_email}>\nSubject: {subject}\nBody: {body}"
                triage_json = triage_agent.run(email_text, json_mode=True)
                triage_result = json.loads(triage_json)
                priority = triage_result.get("priority", "medium")
                priority_reason = triage_result.get("reason", "")
            except Exception as e:
                logger.error(f"Triage failed for synced email: {e}")
                priority_reason = "Triage skipped due to processing error."
                
            db.add_email(
                email_id=local_id,
                account_id=account_id,
                user_id=user_id,
                from_email=from_email,
                from_name=from_name,
                to_email=account["email"],
                subject=subject,
                body=body,
                body_html=body_html,
                date_str=iso_date,
                folder="inbox",
                labels=["Inbox"],
                read=False,
                priority=priority,
                priority_reason=priority_reason,
                summary=""
            )
            synced_count += 1
            
        imap.close()
        imap.logout()
        return {"status": "success", "synced": synced_count}
        
    except imaplib.IMAP4.error as e:
        logger.error(f"IMAP login failed: {e}")
        raise HTTPException(status_code=400, detail="IMAP login failed. Please verify email and App Password credentials.")
    except Exception as e:
        logger.error(f"IMAP sync failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to synchronize IMAP emails: {str(e)}")


# ==================== Helper Utilities ====================

def decode_mime_header(header_value: str) -> str:
    if not header_value:
        return ""
    decoded_parts = decode_header(header_value)
    header_text = ""
    for content, encoding in decoded_parts:
        if isinstance(content, bytes):
            try:
                header_text += content.decode(encoding or "utf-8", errors="ignore")
            except Exception:
                header_text += content.decode("latin1", errors="ignore")
        else:
            header_text += content
    return header_text

def get_email_body_content(msg) -> tuple:
    """
    Walks a MIME message structure to extract BOTH plaintext text/plain 
    and rich text/html body versions.
    """
    body_text = ""
    body_html = ""
    
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            
            if "attachment" in content_disposition:
                continue
                
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    try:
                        body_text += payload.decode(part.get_content_charset() or "utf-8", errors="ignore")
                    except Exception:
                        body_text += payload.decode("latin1", errors="ignore")
            elif content_type == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    try:
                        body_html += payload.decode(part.get_content_charset() or "utf-8", errors="ignore")
                    except Exception:
                        body_html += payload.decode("latin1", errors="ignore")
    else:
        content_type = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload:
            if content_type == "text/html":
                try:
                    body_html = payload.decode(msg.get_content_charset() or "utf-8", errors="ignore")
                except Exception:
                    body_html = payload.decode("latin1", errors="ignore")
                # Fallback clean text: strip HTML tags roughly
                import re
                clean = re.compile('<.*?>')
                body_text = re.sub(clean, '', body_html)
            else:
                try:
                    body_text = payload.decode(msg.get_content_charset() or "utf-8", errors="ignore")
                except Exception:
                    body_text = payload.decode("latin1", errors="ignore")
                    
    # Clean up empty states
    body_text = body_text.strip()
    body_html = body_html.strip()
    
    # If HTML is empty but text exists, copy text to html
    if not body_html and body_text:
        body_html = body_text.replace("\n", "<br>")
        
    # If text is empty but HTML exists, strip HTML tags roughly
    if not body_text and body_html:
        import re
        clean = re.compile('<.*?>')
        body_text = re.sub(clean, '', body_html)
        
    return body_text, body_html
