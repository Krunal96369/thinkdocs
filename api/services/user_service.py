"""
 User service for authentication and user management.
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import bcrypt
import secrets

from api.models.users import User
from api.config import settings

logger = logging.getLogger(__name__)


class PasswordValidator:
    """Production-grade password validation."""

    @staticmethod
    def validate_password(password: str) -> Tuple[bool, str]:
        """
        Validate password strength.

        Returns:
            (is_valid, error_message)
        """
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"

        if len(password) > 128:
            return False, "Password must be less than 128 characters"

        # Check for at least one uppercase letter
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"

        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"

        # Check for at least one digit
        if not re.search(r'\d', password):
            return False, "Password must contain at least one number"

        # Check for at least one special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False, "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)"

        # Check for common weak patterns
        weak_patterns = [
            r'(.)\1{2,}',  # Three or more repeated characters
            r'123|234|345|456|567|678|789|890',  # Sequential numbers
            r'abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz',  # Sequential letters
        ]

        for pattern in weak_patterns:
            if re.search(pattern, password.lower()):
                return False, "Password contains weak patterns. Please use a more complex password"

        return True, ""


class EmailValidator:
    """Production-grade email validation."""

    @staticmethod
    def validate_email(email: str) -> Tuple[bool, str]:
        """
        Validate email format and domain.

        Returns:
            (is_valid, error_message)
        """
        if not email or len(email) > 255:
            return False, "Email address is required and must be less than 255 characters"

        # Basic email regex pattern
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return False, "Please enter a valid email address"

        # Check for disposable email domains (basic list)
        disposable_domains = {
            '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
            'mailinator.com', 'throwaway.email', 'temp-mail.org'
        }

        domain = email.split('@')[1].lower()
        if domain in disposable_domains:
            return False, "Disposable email addresses are not allowed"

        return True, ""


class UserService:
    """Production-grade user service with comprehensive security."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.password_validator = PasswordValidator()
        self.email_validator = EmailValidator()

    async def register_user(
        self,
        email: str,
        password: str,
        name: str,
        terms_accepted: bool = False,
        privacy_accepted: bool = False,
        marketing_consent: bool = False
    ) -> Tuple[Optional[User], str]:
        """
        Register a new user with comprehensive validation.

        Returns:
            (user, error_message)
        """
        try:
            # Validate email
            email_valid, email_error = self.email_validator.validate_email(email)
            if not email_valid:
                return None, email_error

            # Validate password
            password_valid, password_error = self.password_validator.validate_password(password)
            if not password_valid:
                return None, password_error

            # Validate name
            if not name or len(name.strip()) < 2:
                return None, "Name must be at least 2 characters long"

            if len(name) > 255:
                return None, "Name must be less than 255 characters"

            # Check if user already exists
            existing_user = await self.get_user_by_email(email)
            if existing_user:
                return None, "An account with this email already exists"

            # Create password hash
            password_hash = self._hash_password(password)

            # Create new user
            user = User(
                email=email.lower().strip(),
                password_hash=password_hash,
                name=name.strip(),
                terms_accepted_at=datetime.utcnow() if terms_accepted else None,
                privacy_policy_accepted_at=datetime.utcnow() if privacy_accepted else None,
                marketing_consent=marketing_consent
            )

            # Generate email verification token
            user.generate_email_verification_token()

            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)

            logger.info(f"User registered successfully: {user.email}")
            return user, ""

        except Exception as e:
            logger.error(f"Registration failed: {e}")
            await self.db.rollback()
            return None, "Registration failed. Please try again."

    async def authenticate_user(self, email: str, password: str) -> Tuple[Optional[User], str]:
        """
        Authenticate user with comprehensive security checks.

        Returns:
            (user, error_message)
        """
        try:
            # Get user by email
            user = await self.get_user_by_email(email)
            if not user:
                return None, "Invalid email or password"

            # Check if account is locked
            if user.is_account_locked():
                return None, f"Account is locked due to too many failed login attempts. Try again later."

            # Check if account is active
            if not user.is_active:
                return None, "Account is deactivated. Please contact support."

            # Verify password
            if not self._verify_password(password, user.password_hash):
                # Increment failed login attempts
                user.increment_failed_login(
                    max_attempts=settings.security.max_login_attempts,
                    lockout_minutes=settings.security.lockout_duration_minutes
                )
                await self.db.commit()

                return None, "Invalid email or password"

            # Reset failed login attempts on successful login
            user.reset_failed_login()
            user.update_last_seen()
            await self.db.commit()

            logger.info(f"User authenticated successfully: {user.email}")
            return user, ""

        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return None, "Authentication failed. Please try again."

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        try:
            result = await self.db.execute(
                select(User).where(User.email == email.lower().strip())
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        try:
            result = await self.db.execute(
                select(User).where(User.id == user_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None

    async def verify_email(self, token: str) -> Tuple[bool, str]:
        """Verify user email with token."""
        try:
            result = await self.db.execute(
                select(User).where(User.email_verification_token == token)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "Invalid verification token"

            if not user.is_email_verification_valid(token):
                return False, "Verification token has expired"

            user.clear_verification_token()
            await self.db.commit()

            logger.info(f"Email verified successfully: {user.email}")
            return True, "Email verified successfully"

        except Exception as e:
            logger.error(f"Email verification failed: {e}")
            return False, "Email verification failed"

    async def request_password_reset(self, email: str) -> Tuple[bool, str]:
        """Request password reset for user."""
        try:
            user = await self.get_user_by_email(email)
            if not user:
                # Don't reveal whether email exists for security
                return True, "If the email exists, a password reset link has been sent"

            if not user.is_active:
                return False, "Account is deactivated"

            # Generate password reset token
            token = user.generate_password_reset_token()
            await self.db.commit()

            # TODO: Send email with reset link
            logger.info(f"Password reset requested for: {user.email}")
            return True, "Password reset link sent to your email"

        except Exception as e:
            logger.error(f"Password reset request failed: {e}")
            return False, "Password reset request failed"

    async def reset_password(self, token: str, new_password: str) -> Tuple[bool, str]:
        """Reset user password with token."""
        try:
            # Validate new password
            password_valid, password_error = self.password_validator.validate_password(new_password)
            if not password_valid:
                return False, password_error

            # Find user with reset token
            result = await self.db.execute(
                select(User).where(User.password_reset_token == token)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "Invalid reset token"

            if not user.is_password_reset_valid(token):
                return False, "Reset token has expired"

            # Update password
            user.password_hash = self._hash_password(new_password)
            user.last_password_change = datetime.utcnow()
            user.clear_password_reset_token()
            user.failed_login_attempts = 0
            user.locked_until = None

            await self.db.commit()

            logger.info(f"Password reset successfully: {user.email}")
            return True, "Password reset successfully"

        except Exception as e:
            logger.error(f"Password reset failed: {e}")
            return False, "Password reset failed"

    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        salt = bcrypt.gensalt(rounds=12)  # Production-grade rounds
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash."""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
