import os
import jwt
import bcrypt
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from cryptography.fernet import Fernet
from pathlib import Path
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Setup logger
logger = logging.getLogger("Auth")

# Load environment variables
ROOT_PATH = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_PATH / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# JWT Secret & Alg
JWT_SECRET = os.environ.get("JWT_SECRET", "super_secret_auramail_jwt_token_key_19283")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Fernet Encryption Key Setup
# If ENCRYPTION_KEY does not exist in .env, we generate one and save it!
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    try:
        new_key = Fernet.generate_key().decode()
        # Append to .env file if .env file exists
        if ENV_PATH.exists():
            with open(ENV_PATH, "a") as f:
                f.write(f"\n# Secure AES encryption key for saving App Passwords\nENCRYPTION_KEY={new_key}\n")
            logger.info("Generated new ENCRYPTION_KEY and saved it to .env file.")
        else:
            # Create .env file
            with open(ENV_PATH, "w") as f:
                f.write(f"ENCRYPTION_KEY={new_key}\n")
            logger.info("Created new .env file with ENCRYPTION_KEY.")
        ENCRYPTION_KEY = new_key
    except Exception as e:
        logger.error(f"Failed to generate and save encryption key: {e}")
        # Fallback to a hardcoded (but static) key for demo/test environments to prevent crash
        ENCRYPTION_KEY = Fernet.generate_key().decode()

# Initialize Fernet cipher
cipher = Fernet(ENCRYPTION_KEY.encode())


# ==================== Password Hashing (Bcrypt) ====================

def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ==================== JWT Token Operations ====================

def create_access_token(user_id: str) -> str:
    """Generates a secure JWT access token valid for a standard days window."""
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": user_id, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[str]:
    """Decodes JWT access token and returns User ID. Returns None if invalid/expired."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except jwt.PyJWTError:
        return None


# ==================== Credential Hiding (Symmetric Encryption) ====================

def encrypt_password(plain_password: str) -> str:
    """Encrypts raw App Passwords using AES-128/256 Fernet block cipher."""
    if not plain_password:
        return ""
    encrypted = cipher.encrypt(plain_password.encode("utf-8"))
    return encrypted.decode("utf-8")

def decrypt_password(encrypted_password: str) -> str:
    """Decrypts AES-encrypted passwords. Returns empty string on error."""
    if not encrypted_password:
        return ""
    try:
        decrypted = cipher.decrypt(encrypted_password.encode("utf-8"))
        return decrypted.decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to decrypt password: {e}")
        return ""


# ==================== FastAPI Dependency ====================

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """FastAPI dependency to extract and validate the active user's JWT token."""
    token = credentials.credentials
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token. Please sign in again."
        )
    return user_id
