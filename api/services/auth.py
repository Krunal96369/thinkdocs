"""
Authentication service for user management and token validation.
"""

import logging
from typing import Optional, Dict, Any
import jwt
from datetime import datetime

from api.config import settings

logger = logging.getLogger(__name__)


async def get_current_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Get current user from JWT token.

    Args:
        token: JWT token string

    Returns:
        User information dict or None if invalid
    """
    try:
        # Decode JWT token
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"]
        )

        # Extract user information
        user_id = payload.get("sub")
        username = payload.get("username")
        email = payload.get("email")
        exp = payload.get("exp")

        # Check if token is expired
        if exp and datetime.utcnow().timestamp() > exp:
            logger.warning("Token expired")
            return None

        if not user_id:
            logger.warning("Invalid token - no user ID")
            return None

        # Return user information
        return {
            "id": user_id,
            "username": username,
            "email": email,
            "exp": exp
        }

    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None
    except Exception as e:
        logger.error(f"Error validating token: {e}")
        return None


def create_access_token(user_data: Dict[str, Any], expires_delta: Optional[int] = None) -> str:
    """
    Create a new JWT access token.

    Args:
        user_data: User information to encode
        expires_delta: Token expiration time in seconds

    Returns:
        JWT token string
    """
    try:
        # Set expiration time
        if expires_delta:
            expire = datetime.utcnow().timestamp() + expires_delta
        else:
            expire = datetime.utcnow().timestamp() + 3600  # 1 hour default

        # Create payload
        payload = {
            "sub": str(user_data.get("id")),
            "username": user_data.get("username"),
            "email": user_data.get("email"),
            "exp": expire,
            "iat": datetime.utcnow().timestamp()
        }

        # Encode token
        token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
        return token

    except Exception as e:
        logger.error(f"Error creating token: {e}")
        raise


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password

    Returns:
        True if password matches, False otherwise
    """
    try:
        import bcrypt
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    try:
        import bcrypt
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    except Exception as e:
        logger.error(f"Error hashing password: {e}")
        raise
