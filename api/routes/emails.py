from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import uuid
import time
import imaplib
import smtplib
import email
import json
import logging
from email.header import decode_header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from api.models import Email, Account, FolderAction, LabelAction
from api.db.mock_data import db

logger = logging.getLogger("EmailsRouter")

router = APIRouter(prefix="/emails", tags=["Emails"])

@router.get("/accounts", response_model=List[Account])
def get_accounts():
    return db.get_accounts()

@router.post("/accounts", response_model=Account)
def create_account(account: Account):
    # Verify unique ID
    for existing in db.get_accounts():
        if existing.id == account.id:
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
            
    db.accounts.append(account)
    
    # Generate initial welcome email ONLY for demo accounts (without password)
    if not account.password:
        welcome_id = f"welcome-{account.id}"
        iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        welcome_email = Email(
            id=welcome_id,
            accountId=account.id,
            fromEmail="team@auramail.ai",
            fromName="AuraMail Team",
            toEmail=account.email,
            subject=f"Welcome to AuraMail, {account.name}!",
            body=f"Hi {account.name},\n\nWelcome to your new {account.type.upper()} email inbox on AuraMail!\n\nThis client integrates OpenAI agents to summarize threads, suggest quick replies, and prioritize incoming messages. We are thrilled to have you here.\n\nBest regards,\nThe AuraMail Team",
            date=iso_date,
            folder="inbox",
            labels=["System", "Welcome"],
            read=False,
            priority="high",
            priorityReason="Welcome message from AuraMail outlining core account activation details.",
            summary="A welcome email introducing the new AuraMail user to their integrated AI-first inbox features."
        )
        db.add_email(welcome_email)
    
    return account

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
    from_account = accounts.get(email_data.get("accountId"))
    
    if not from_account:
        from_account = Account(id="gmail", name="Alex", type="gmail", email="alex.dev@gmail.com")
        
    from_email = from_account.email
    from_name = from_account.name
    
    to_email = email_data.get("toEmail")
    subject = email_data.get("subject", "(No Subject)")
    body = email_data.get("body", "")
    
    # If the account has a password (it's a real connected account), actually send via SMTP!
    if from_account.password:
        # Determine SMTP server and port
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        
        if from_account.type == "office365":
            smtp_server = "smtp.office365.com"
        elif from_account.type == "imap" and "@" in from_account.email:
            domain = from_account.email.split("@")[1]
            if "yahoo" in domain:
                smtp_server = "smtp.mail.yahoo.com"
            elif "aol" in domain:
                smtp_server = "smtp.aol.com"
            elif "icloud" in domain:
                smtp_server = "smtp.mail.me.com"
                
        try:
            logger.info(f"SMTP: Connecting to {smtp_server}:{smtp_port} to send message for {from_account.email}...")
            
            # Construct MIME Message
            msg = MIMEMultipart()
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            # Start TLS Session
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
            server.starttls()
            server.login(from_account.email, from_account.password)
            server.sendmail(from_account.email, to_email, msg.as_string())
            server.quit()
            logger.info(f"SMTP: Email sent successfully from {from_account.email} to {to_email}.")
        except Exception as e:
            logger.error(f"SMTP failed to send email: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to send email. Verify SMTP connection settings and credentials. Error: {str(e)}"
            )
            
    new_email = Email(
        id=email_id,
        accountId=email_data.get("accountId", "gmail"),
        fromEmail=from_email,
        fromName=from_name,
        toEmail=to_email,
        subject=subject,
        body=body,
        date=iso_date,
        folder="sent",
        labels=email_data.get("labels", []),
        read=True,
        priority="medium"
    )
    
    db.add_email(new_email)
    return {"success": True, "email": new_email}


# Helper utilities for decoding IMAP email packets
def decode_mime_header(header_value: str) -> str:
    if not header_value:
        return ""
    decoded_parts = decode_header(header_value)
    result = []
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            try:
                result.append(part.decode(encoding or "utf-8", errors="ignore"))
            except Exception:
                result.append(part.decode("latin1", errors="ignore"))
        else:
            result.append(str(part))
    return "".join(result)

def get_email_body(msg) -> str:
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            if content_type == "text/plain" and "attachment" not in content_disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    try:
                        body += payload.decode(part.get_content_charset() or "utf-8", errors="ignore")
                    except Exception:
                        body += payload.decode("latin1", errors="ignore")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            try:
                body = payload.decode(msg.get_content_charset() or "utf-8", errors="ignore")
            except Exception:
                body = payload.decode("latin1", errors="ignore")
    return body.strip()

@router.post("/{account_id}/sync")
def sync_emails(account_id: str):
    # Find account
    account = None
    for acc in db.get_accounts():
        if acc.id == account_id:
            account = acc
            break
            
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    # If no password (like default seeds), simulate sync adding an email notification
    if not account.password:
        sim_id = f"sim-{account_id}-{int(time.time())}"
        iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        sim_email = Email(
            id=sim_id,
            accountId=account.id,
            fromEmail="alerts@smartai.ai",
            fromName="Smart AI Assistant",
            toEmail=account.email,
            subject="Smart AI Inbox Synchronization Complete",
            body=f"Hello,\n\nThis is a simulated synchronization check for your {account.name} account.\n\nAll folders are up to date. The Smart AI priority triaging system is active.",
            date=iso_date,
            folder="inbox",
            labels=["Sync", "System"],
            read=False,
            priority="medium",
            priorityReason="Confirmation alert confirming successful mock synchronization of folders.",
            summary="A system confirmation email verifying successful account sync and agent attachments."
        )
        db.add_email(sim_email)
        return {"status": "success", "synced": 1}

    # Connect to IMAP
    server_map = {
        "gmail": "imap.gmail.com",
        "office365": "outlook.office365.com",
        "imap": "imap.mail.yahoo.com"
    }
    server = server_map.get(account.type, "imap.gmail.com")
    
    # Try to extract custom IMAP server if domain matches
    if account.type == "imap" and "@" in account.email:
        domain = account.email.split("@")[1]
        if "yahoo" in domain:
            server = "imap.mail.yahoo.com"
        elif "aol" in domain:
            server = "imap.aol.com"
        elif "icloud" in domain:
            server = "imap.mail.me.com"
            
    try:
        logger.info(f"Connecting to IMAP server {server} on port 993...")
        imap = imaplib.IMAP4_SSL(server, port=993)
        imap.login(account.email, account.password)
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
            local_id = f"imap-{account.id}-{msg_id.decode('utf-8')}"
            
            # Check duplicate
            if db.get_email_by_id(local_id):
                continue
                
            subject = decode_mime_header(msg.get("Subject", "(No Subject)"))
            
            # Parse sender details
            from_header = msg.get("From", "")
            from_name, from_email = email.utils.parseaddr(from_header)
            if not from_name:
                from_name = from_email.split("@")[0] if from_email else "Unknown"
            if not from_email:
                from_email = "unknown@domain.com"
                
            body = get_email_body(msg)
            if not body:
                body = "(No readable text content found)"
                
            iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
            new_email = Email(
                id=local_id,
                accountId=account.id,
                fromEmail=from_email,
                fromName=from_name,
                toEmail=account.email,
                subject=subject,
                body=body,
                date=iso_date,
                folder="inbox",
                labels=["Inbox"],
                read=False,
                priority="medium",
                priorityReason="",
                summary=""
            )
            
            # Sync triage
            try:
                from api.agents.agent_os import triage_agent
                email_text = f"From: {from_name} <{from_email}>\nSubject: {subject}\nBody: {body}"
                triage_json = triage_agent.run(email_text, json_mode=True)
                triage_result = json.loads(triage_json)
                new_email.priority = triage_result.get("priority", "medium")
                new_email.priority_reason = triage_result.get("reason", "")
            except Exception as e:
                logger.error(f"Triage failed for synced email: {e}")
                new_email.priority = "medium"
                new_email.priority_reason = "Triage skipped due to processing error."
                
            db.add_email(new_email)
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
