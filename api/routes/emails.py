import uuid
import time
import datetime
import imaplib
import smtplib
import os
import email
import json
import logging
import re
import threading
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
            password=None,  # Never return passwords to the client
            imap_host=acc.get("imap_host"),
            imap_port=acc.get("imap_port")
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
        server = account.imap_host or server_map.get(account.type, "imap.gmail.com")
        port = account.imap_port or 993
        
        # Try to resolve custom domains only if imap_host is not explicitly provided
        if not account.imap_host and account.type == "imap" and "@" in account.email:
            domain = account.email.split("@")[1]
            if "yahoo" in domain:
                server = "imap.mail.yahoo.com"
            elif "aol" in domain:
                server = "imap.aol.com"
            elif "icloud" in domain:
                server = "imap.mail.me.com"
            else:
                server = f"imap.{domain}"
                
        try:
            logger.info(f"Verifying IMAP credentials on {server}:{port} for {account.email}...")
            # Configure SSL context to bypass local certificate verification issues (common on Windows/macOS local dev)
            import ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            imap = imaplib.IMAP4_SSL(server, port=port, ssl_context=ctx)
            imap.login(account.email, account.password)
            imap.logout()
            logger.info("IMAP credentials verified successfully.")
        except Exception as e:
            logger.error(f"IMAP verification failed during account creation: {e}")
            # Allow saving account details on Vercel despite port 993 firewall blocks
            if os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"):
                logger.info("Proceeding with account creation on Vercel despite verification failure.")
            else:
                err_msg = str(e)
                if "authenticationfailed" in err_msg.lower() or "login failed" in err_msg.lower() or "credential" in err_msg.lower():
                    detail_msg = (
                        "Authentication failed (IMAP verification failed). Please verify that:\n"
                        "1. You are using a 16-character 'App Password' instead of your main password (required for Gmail, Outlook, Yahoo, iCloud).\n"
                        "2. IMAP access is enabled in your email provider's account settings.\n"
                        "3. Your email address is typed correctly."
                    )
                else:
                    detail_msg = (
                        f"IMAP Connection failed (IMAP verification failed): {err_msg}.\n"
                        "Please verify that:\n"
                        "1. Your server host is reachable on SSL port 993.\n"
                        "2. You are not behind a firewall blocking outbound mail traffic.\n"
                        "3. You are using an App Password if required."
                    )
                raise HTTPException(status_code=400, detail=detail_msg)
            
    # Encrypt password before storing in SQLite
    password_encrypted = encrypt_password(account.password) if account.password else None
    
    db.add_account(
        account_id=account.id,
        user_id=user_id,
        name=account.name,
        type_name=account.type,
        email=account.email,
        password_encrypted=password_encrypted,
        imap_host=account.imap_host,
        imap_port=account.imap_port
    )
    
    # Generate initial welcome email ONLY for demo accounts (without password)
    if not account.password:
        welcome_id = f"welcome-{account.id}"
        iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        welcome_email_body = f"Hi {account.name},\n\nWelcome to your new {account.type.upper()} email inbox on AuraMail!\n\nThis client integrates AI agents to summarize threads, suggest quick replies, and prioritize incoming messages. We are thrilled to have you here.\n\nBest regards,\nThe AuraMail Team"
        welcome_email_html = f"<p>Hi {account.name},</p><p>Welcome to your new {account.type.upper()} email inbox on AuraMail!</p><p>This client integrates AI agents to summarize threads, suggest quick replies, and prioritize incoming messages. We are thrilled to have you here.</p><p>Best regards,<br>The AuraMail Team</p>"
        
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
    limit: int = Query(25, description="Number of emails to return"),
    offset: int = Query(0, description="Pagination offset"),
    user_id: str = Depends(get_current_user)
):
    rows = db.get_emails(user_id=user_id, account_id=account, folder=folder, q=q, limit=limit, offset=offset)
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

@router.post("/forward")
def forward_email(email_data: dict, user_id: str = Depends(get_current_user)):
    original_id = email_data.get("emailId")
    to_email = email_data.get("toEmail")
    note = email_data.get("note", "")
    
    if not original_id or not to_email:
        raise HTTPException(status_code=400, detail="emailId and toEmail are required")
    
    original = db.get_email_by_id(user_id, original_id)
    if not original:
        raise HTTPException(status_code=404, detail="Original email not found")
    
    # Find sender account
    from_account = db.get_account_by_id(user_id, original.get("account_id"))
    if not from_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    from_email = from_account["email"]
    from_name = from_account["name"]
    password_encrypted = from_account["password_encrypted"]
    
    orig_subject = original.get("subject", "")
    fwd_subject = orig_subject if orig_subject.startswith("Fwd:") else f"Fwd: {orig_subject}"
    
    orig_body = original.get("body", "")
    fwd_body = f"{note}\n\n--- Forwarded Message ---\nFrom: {original.get('from_name')} <{original.get('from_email')}>\nDate: {original.get('date')}\nSubject: {orig_subject}\n\n{orig_body}"
    
    orig_html = original.get("body_html", "") or orig_body.replace("\n", "<br>")
    note_html = note.replace("\n", "<br>") if note else ""
    fwd_body_html = f"<p>{note_html}</p><hr style='border:1px solid #3f3f46;margin:16px 0;'><p style='color:#71717a;font-size:12px;'>--- Forwarded Message ---<br>From: {original.get('from_name')} &lt;{original.get('from_email')}&gt;<br>Subject: {orig_subject}</p>{orig_html}"
    
    email_id = f"fwd-{str(uuid.uuid4())[:8]}"
    iso_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    # Send via SMTP if real account
    if password_encrypted:
        plain_password = decrypt_password(password_encrypted)
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        if from_account["type"] == "office365":
            smtp_server = "smtp.office365.com"
        elif from_account["type"] == "imap" and "@" in from_email:
            domain = from_email.split("@")[1]
            if "yahoo" in domain:
                smtp_server = "smtp.mail.yahoo.com"
            elif "icloud" in domain:
                smtp_server = "smtp.mail.me.com"
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = to_email
            msg['Subject'] = fwd_subject
            msg.attach(MIMEText(fwd_body, 'plain', 'utf-8'))
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
            server.starttls()
            server.login(from_email, plain_password)
            server.sendmail(from_email, to_email, msg.as_string())
            server.quit()
            logger.info(f"SMTP: Forwarded email from {from_email} to {to_email}.")
        except Exception as e:
            logger.error(f"SMTP forward failed: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to forward email. Error: {str(e)}")
    
    db.add_email(
        email_id=email_id,
        account_id=original.get("account_id"),
        user_id=user_id,
        from_email=from_email,
        from_name=from_name,
        to_email=to_email,
        subject=fwd_subject,
        body=fwd_body,
        body_html=fwd_body_html,
        date_str=iso_date,
        folder="sent",
        labels=["Forwarded"],
        read=True,
        priority="medium"
    )
    
    return {
        "success": True,
        "email": {
            "id": email_id,
            "subject": fwd_subject,
            "toEmail": to_email,
            "date": iso_date,
            "folder": "sent"
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
    server = account.get("imap_host") or server_map.get(account["type"], "imap.gmail.com")
    port = account.get("imap_port") or 993
    
    # Try to extract custom IMAP server if domain matches and imap_host is not explicitly stored
    if not account.get("imap_host") and account["type"] == "imap" and "@" in account["email"]:
        domain = account["email"].split("@")[1]
        if "yahoo" in domain:
            server = "imap.mail.yahoo.com"
        elif "aol" in domain:
            server = "imap.aol.com"
        elif "icloud" in domain:
            server = "imap.mail.me.com"
        else:
            server = f"imap.{domain}"
            
    # Decrypt password for IMAP connection
    plain_password = decrypt_password(account["password_encrypted"])
            
    try:
        logger.info(f"Connecting to IMAP server {server}:{port}...")
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        imap = imaplib.IMAP4_SSL(server, port=port, ssl_context=ctx)
        imap.login(account["email"], plain_password)
        imap.select("INBOX")
        
        status, messages = imap.search(None, "ALL")
        if status != "OK":
            imap.close()
            imap.logout()
            raise HTTPException(status_code=400, detail="Failed to search IMAP inbox")
            
        msg_ids = messages[0].split()
        recent_ids = msg_ids[-25:]
        synced_count = 0
        newly_synced_ids = []  # collect IDs of freshly inserted emails for background triage
        
        for msg_id in reversed(recent_ids):
            status, data = imap.fetch(msg_id, "(RFC822)")
            if status != "OK" or not data:
                continue
                
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            # Extract basic details
            local_id = f"imap-{account_id}-{msg_id.decode('utf-8')}"
            
            # Check duplicate (delta polling: break early since older messages are already synced)
            if db.get_email_by_id(user_id, local_id):
                break
                
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
                
            msg_date = parse_email_date(msg)
            
            # Check read/unread status from IMAP flags
            is_read = False
            try:
                status_flags, flag_data = imap.fetch(msg_id, "(FLAGS)")
                if status_flags == "OK" and flag_data and flag_data[0]:
                    flags_str = flag_data[0].decode("utf-8", errors="ignore")
                    if "\\Seen" in flags_str:
                        is_read = True
            except Exception as fe:
                logger.warning(f"Error fetching flags for msg {msg_id}: {fe}")
            
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
                date_str=msg_date,
                folder="inbox",
                labels=["Inbox"],
                read=is_read,
                priority="medium",
                priority_reason="",
                summary=""
            )
            newly_synced_ids.append(local_id)
            synced_count += 1
            
        # Also sync Sent folder — track selected state carefully
        imap_in_selected_state = True  # INBOX is currently selected
        sent_folder_names = ["[Gmail]/Sent Mail", "Sent Items", "Sent Messages", "Sent"]
        sent_synced = False
        for sent_folder in sent_folder_names:
            try:
                # Quote folder names that contain spaces
                folder_arg = f'"{sent_folder}"' if ' ' in sent_folder else sent_folder
                status2, _ = imap.select(folder_arg)
                if status2 == "OK":
                    imap_in_selected_state = True
                    status3, sent_msgs = imap.search(None, "ALL")
                    if status3 == "OK" and sent_msgs[0]:
                        sent_ids = sent_msgs[0].split()
                        recent_sent = sent_ids[-10:]
                        for smsg_id in reversed(recent_sent):
                            sstatus, sdata = imap.fetch(smsg_id, "(RFC822)")
                            if sstatus != "OK" or not sdata:
                                continue
                            sraw = sdata[0][1]
                            smsg = email.message_from_bytes(sraw)
                            slid = f"imap-sent-{account_id}-{smsg_id.decode('utf-8')}"
                            if db.get_email_by_id(user_id, slid):
                                break
                            ssubject = decode_mime_header(smsg.get("Subject", "(No Subject)"))
                            sto_header = smsg.get("To", "")
                            sto_name, sto_email_addr = email.utils.parseaddr(sto_header)
                            sfrom_header = smsg.get("From", "")
                            sfrom_name, sfrom_email_addr = email.utils.parseaddr(sfrom_header)
                            sbody, sbody_html = get_email_body_content(smsg)
                            if not sbody:
                                sbody = "(No readable content)"
                            if not sbody_html:
                                sbody_html = sbody.replace("\n", "<br>")
                            smsg_date = parse_email_date(smsg)
                            db.add_email(
                                email_id=slid,
                                account_id=account_id,
                                user_id=user_id,
                                from_email=sfrom_email_addr or account["email"],
                                from_name=sfrom_name or account["name"],
                                to_email=sto_email_addr or "",
                                subject=ssubject,
                                body=sbody,
                                body_html=sbody_html,
                                date_str=smsg_date,
                                folder="sent",
                                labels=["Sent"],
                                read=True,
                                priority="low"
                            )
                            synced_count += 1
                    sent_synced = True
                    break  # Found and processed Sent folder, stop looking
                else:
                    imap_in_selected_state = False  # select failed, not in SELECTED state
            except Exception as se:
                logger.warning(f"Could not sync sent folder '{sent_folder}': {se}")
                imap_in_selected_state = False
                continue

        # Only call close() when actually in SELECTED state
        try:
            if imap_in_selected_state:
                imap.close()
        except Exception:
            pass
        imap.logout()

        # Run AI triage in background for newly synced inbox emails (non-blocking)

        def run_background_triage(uid: str, email_ids: list):
            from api.agents.agent_os import triage_agent
            for eid in email_ids:
                try:
                    e = db.get_email_by_id(uid, eid)
                    if not e or e.get("priority_reason"):
                        continue
                    email_text = f"From: {e.get('from_name')} <{e.get('from_email')}>\nSubject: {e.get('subject')}\nBody: {e.get('body', '')[:600]}"
                    triage_json = triage_agent.run(email_text, json_mode=True)
                    triage_result = json.loads(triage_json)
                    db.update_email_triage(
                        uid, eid,
                        triage_result.get("priority", "medium"),
                        triage_result.get("reason", "")
                    )
                except Exception as ex:
                    logger.warning(f"Background triage failed for {eid}: {ex}")

        if newly_synced_ids:
            t = threading.Thread(
                target=run_background_triage,
                args=(user_id, newly_synced_ids),
                daemon=True
            )
            t.start()

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

def parse_email_date(msg) -> str:
    """
    Parses the 'Date' header from an email message and returns a standardized 
    ISO 8601 UTC timestamp (YYYY-MM-DDTHH:MM:SSZ). Falls back to the current time 
    if the header is missing or invalid.
    """
    date_header = msg.get("Date")
    if date_header:
        try:
            dt = email.utils.parsedate_to_datetime(date_header)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=datetime.timezone.utc)
            return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except Exception as e:
            logger.warning(f"Failed to parse email Date header '{date_header}': {e}")
    # Fallback to current time
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
