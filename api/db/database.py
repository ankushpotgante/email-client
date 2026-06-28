import sqlite3
import json
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

# Setup logger
logger = logging.getLogger("Database")

# Resolve DB path at the root of the project (use writable /tmp for Vercel)
ROOT_PATH = Path(__file__).resolve().parent.parent.parent
if os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"):
    DB_PATH = Path("/tmp/auramail.db")
else:
    DB_PATH = ROOT_PATH / "auramail.db"

class Database:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        return conn

    def init_db(self):
        """Initializes database tables and executes schema migrations."""
        logger.info(f"Initializing SQLite Database at: {self.db_path}")
        conn = self.get_connection()
        cursor = conn.cursor()

        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        # 2. Accounts Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                email TEXT NOT NULL,
                password_encrypted TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # 3. Emails Table (with body_html support)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS emails (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                from_email TEXT NOT NULL,
                from_name TEXT NOT NULL,
                to_email TEXT NOT NULL,
                subject TEXT,
                body TEXT,
                body_html TEXT,
                date TEXT NOT NULL,
                folder TEXT NOT NULL,
                labels TEXT, -- JSON serialized list
                read INTEGER DEFAULT 0,
                priority TEXT DEFAULT 'medium',
                priority_reason TEXT,
                summary TEXT,
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        conn.commit()
        conn.close()
        logger.info("Database tables initialized successfully.")

    # ==================== User Operations ====================

    def create_user(self, user_id: str, username: str, password_hash: str, created_at: str) -> bool:
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (user_id, username, password_hash, created_at)
            )
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            return False

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    # ==================== Account Operations ====================

    def add_account(self, account_id: str, user_id: str, name: str, type_name: str, email: str, password_encrypted: Optional[str]) -> bool:
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO accounts (id, user_id, name, type, email, password_encrypted) VALUES (?, ?, ?, ?, ?, ?)",
                (account_id, user_id, name, type_name, email, password_encrypted)
            )
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            return False

    def get_accounts(self, user_id: str) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts WHERE user_id = ?", (user_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_account_by_id(self, user_id: str, account_id: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts WHERE user_id = ? AND id = ?", (user_id, account_id))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    # ==================== Email Operations ====================

    def add_email(self, email_id: str, account_id: str, user_id: str, from_email: str, from_name: str, 
                  to_email: str, subject: str, body: str, body_html: Optional[str], date_str: str, 
                  folder: str, labels: List[str], read: bool, priority: str, 
                  priority_reason: Optional[str] = None, summary: Optional[str] = None) -> bool:
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO emails (
                    id, account_id, user_id, from_email, from_name, to_email, subject, body, body_html, 
                    date, folder, labels, read, priority, priority_reason, summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                email_id, account_id, user_id, from_email, from_name, to_email, subject, body, body_html,
                date_str, folder, json.dumps(labels), 1 if read else 0, priority, priority_reason, summary
            ))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to add email: {e}")
            return False

    def get_emails(self, user_id: str, account_id: Optional[str] = None, folder: Optional[str] = None, q: Optional[str] = None, limit: int = 25, offset: int = 0) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM emails WHERE user_id = ?"
        params = [user_id]

        if account_id and account_id != "all":
            query += " AND account_id = ?"
            params.append(account_id)
        
        if folder:
            query += " AND folder = ?"
            params.append(folder)

        if q:
            q_lower = f"%{q.lower()}%"
            query += " AND (LOWER(subject) LIKE ? OR LOWER(body) LIKE ? OR LOWER(from_email) LIKE ? OR LOWER(from_name) LIKE ?)"
            params.extend([q_lower, q_lower, q_lower, q_lower])

        query += " ORDER BY date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        result = []
        for row in rows:
            d = dict(row)
            # Deserialize JSON serialized labels
            d["labels"] = json.loads(d["labels"]) if d["labels"] else []
            d["read"] = bool(d["read"])
            # Map database keys to Pydantic/CamelCase keys if necessary, but we can do that in models or router
            result.append(d)
        
        return result

    def get_email_by_id(self, user_id: str, email_id: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM emails WHERE user_id = ? AND id = ?", (user_id, email_id))
        row = cursor.fetchone()
        conn.close()
        if row:
            d = dict(row)
            d["labels"] = json.loads(d["labels"]) if d["labels"] else []
            d["read"] = bool(d["read"])
            return d
        return None

    def update_email_folder(self, user_id: str, email_ids: List[str], folder: str) -> bool:
        if not email_ids:
            return True
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            placeholders = ",".join(["?"] * len(email_ids))
            query = f"UPDATE emails SET folder = ? WHERE user_id = ? AND id IN ({placeholders})"
            cursor.execute(query, [folder, user_id] + email_ids)
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to update email folder: {e}")
            return False

    def mark_emails_read_status(self, user_id: str, email_ids: List[str], read: bool) -> bool:
        if not email_ids:
            return True
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            placeholders = ",".join(["?"] * len(email_ids))
            query = f"UPDATE emails SET read = ? WHERE user_id = ? AND id IN ({placeholders})"
            cursor.execute(query, [1 if read else 0, user_id] + email_ids)
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to update read status: {e}")
            return False

    def update_email_labels(self, user_id: str, email_ids: List[str], label: str, action: str) -> bool:
        if not email_ids:
            return True
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            for email_id in email_ids:
                email_record = self.get_email_by_id(user_id, email_id)
                if not email_record:
                    continue
                labels = email_record.get("labels", [])
                
                if action == "add" and label not in labels:
                    labels.append(label)
                elif action == "remove" and label in labels:
                    labels.remove(label)
                
                cursor.execute(
                    "UPDATE emails SET labels = ? WHERE user_id = ? AND id = ?",
                    (json.dumps(labels), user_id, email_id)
                )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to update labels: {e}")
            return False

    def update_email_triage(self, user_id: str, email_id: str, priority: str, priority_reason: str) -> bool:
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE emails SET priority = ?, priority_reason = ? WHERE user_id = ? AND id = ?",
                (priority, priority_reason, user_id, email_id)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to update email triage: {e}")
            return False

    def update_email_summary(self, user_id: str, email_id: str, summary: str) -> bool:
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE emails SET summary = ? WHERE user_id = ? AND id = ?",
                (summary, user_id, email_id)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to update email summary: {e}")
            return False

    def update_email_triage_by_id_only(self, email_id: str, priority: str, priority_reason: str) -> bool:
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE emails SET priority = ?, priority_reason = ? WHERE id = ?",
                (priority, priority_reason, email_id)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to update email triage by id only: {e}")
            return False

# Initialize global DB instance
db_instance = Database()
