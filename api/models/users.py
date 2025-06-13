"""
Production-grade User model with comprehensive security features.
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import Column, String, DateTime, Boolean, Text, JSON, Integer
from sqlalchemy.orm import relationship
import uuid
import secrets

from api.database import Base


class User(Base):
    """Production-grade User model with security and compliance features."""

    __tablename__ = "users"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Authentication credentials
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)

    # Profile information
    name = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)

    # Account status and verification
    is_active = Column(Boolean, nullable=False, default=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    is_premium = Column(Boolean, nullable=False, default=False)

    # Email verification
    email_verification_token = Column(String(255), nullable=True)
    email_verification_expires = Column(DateTime, nullable=True)

    # Password reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)

    # Security features
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    last_password_change = Column(DateTime, nullable=False, default=datetime.utcnow)

    # User preferences and settings
    preferences = Column(JSON, nullable=False, default=lambda: {
        "theme": "light",
        "notifications": True,
        "language": "en",
        "timezone": "UTC"
    })

    # Privacy and compliance
    terms_accepted_at = Column(DateTime, nullable=True)
    privacy_policy_accepted_at = Column(DateTime, nullable=True)
    marketing_consent = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_seen = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")

    def generate_email_verification_token(self) -> str:
        """Generate a secure email verification token."""
        self.email_verification_token = secrets.token_urlsafe(32)
        self.email_verification_expires = datetime.utcnow() + timedelta(hours=24)
        return self.email_verification_token

    def generate_password_reset_token(self) -> str:
        """Generate a secure password reset token."""
        self.password_reset_token = secrets.token_urlsafe(32)
        self.password_reset_expires = datetime.utcnow() + timedelta(hours=2)
        return self.password_reset_token

    def is_email_verification_valid(self, token: str) -> bool:
        """Check if email verification token is valid."""
        return (
            self.email_verification_token == token and
            self.email_verification_expires and
            datetime.utcnow() < self.email_verification_expires
        )

    def is_password_reset_valid(self, token: str) -> bool:
        """Check if password reset token is valid."""
        return (
            self.password_reset_token == token and
            self.password_reset_expires and
            datetime.utcnow() < self.password_reset_expires
        )

    def clear_verification_token(self):
        """Clear email verification token after successful verification."""
        self.email_verification_token = None
        self.email_verification_expires = None
        self.is_verified = True

    def clear_password_reset_token(self):
        """Clear password reset token after successful reset."""
        self.password_reset_token = None
        self.password_reset_expires = None

    def is_account_locked(self) -> bool:
        """Check if account is locked due to failed login attempts."""
        return (
            self.locked_until and
            datetime.utcnow() < self.locked_until
        )

    def increment_failed_login(self, max_attempts: int = 5, lockout_minutes: int = 15):
        """Increment failed login attempts and lock account if necessary."""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= max_attempts:
            self.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)

    def reset_failed_login(self):
        """Reset failed login attempts after successful login."""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login = datetime.utcnow()

    def update_last_seen(self):
        """Update last seen timestamp."""
        self.last_seen = datetime.utcnow()

    def to_dict(self) -> dict:
        """Convert user to dictionary (excluding sensitive fields)."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "avatar": self.avatar,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "is_premium": self.is_premium,
            "preferences": self.preferences,
            "created_at": self.created_at.isoformat(),
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "last_login": self.last_login.isoformat() if self.last_login else None
        }

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, verified={self.is_verified})>"
