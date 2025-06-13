"""
Production-grade authentication router with database integration and security features.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
import jwt

from api.config import settings
from api.database import get_db
from api.models.users import User
from api.services.user_service import UserService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["authentication"], prefix="/auth")
security = HTTPBearer()


# Enhanced Pydantic models with validation
class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=2, max_length=255)
    terms_accepted: bool = Field(default=False)
    privacy_accepted: bool = Field(default=False)
    marketing_consent: bool = Field(default=False)

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar: Optional[str] = None
    is_verified: bool
    is_premium: bool
    preferences: dict
    created_at: datetime
    last_seen: Optional[datetime] = None
    last_login: Optional[datetime] = None

    @classmethod
    def from_user(cls, user: User) -> "UserResponse":
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar=user.avatar,
            is_verified=user.is_verified,
            is_premium=user.is_premium,
            preferences=user.preferences,
            created_at=user.created_at,
            last_seen=user.last_seen,
            last_login=user.last_login
        )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


class EmailVerificationRequest(BaseModel):
    token: str = Field(..., min_length=1)


# JWT Token Management
def create_access_token(user: User, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token for user."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.security.access_token_expire_minutes
        )

    to_encode = {
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "verified": user.is_verified,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.security.secret_key,
        algorithm=settings.security.algorithm
    )
    return encoded_jwt


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.security.secret_key,
            algorithms=[settings.security.algorithm]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception

    # Get user from database
    user_service = UserService(db)
    user = await user_service.get_user_by_id(user_id)

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )

    # Update last seen
    user.update_last_seen()
    await db.commit()

    return user


# Authentication endpoints
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: UserRegisterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user with comprehensive validation."""
    user_service = UserService(db)

    # Register user
    user, error = await user_service.register_user(
        email=request.email,
        password=request.password,
        name=request.name,
        terms_accepted=request.terms_accepted,
        privacy_accepted=request.privacy_accepted,
        marketing_consent=request.marketing_consent
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.security.access_token_expire_minutes)
    access_token = create_access_token(
        user=user,
        expires_delta=access_token_expires
    )

    # TODO: Send verification email in background
    # background_tasks.add_task(send_verification_email, user.email, user.email_verification_token)

    logger.info(f"User registered successfully: {user.email}")

    return TokenResponse(
        access_token=access_token,
        expires_in=int(access_token_expires.total_seconds()),
        user=UserResponse.from_user(user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: UserLoginRequest,
    req: Request,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return JWT token."""
    user_service = UserService(db)

    # Authenticate user
    user, error = await user_service.authenticate_user(
        email=request.email,
        password=request.password
    )

    if error:
        # Log failed login attempt with IP for security monitoring
        client_ip = req.client.host if req.client else "unknown"
        logger.warning(f"Failed login attempt for {request.email} from {client_ip}: {error}")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.security.access_token_expire_minutes)
    access_token = create_access_token(
        user=user,
        expires_delta=access_token_expires
    )

    logger.info(f"User logged in successfully: {user.email}")

    return TokenResponse(
        access_token=access_token,
        expires_in=int(access_token_expires.total_seconds()),
        user=UserResponse.from_user(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile."""
    return UserResponse.from_user(current_user)


@router.post("/verify-email")
async def verify_email(
    request: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify user email address."""
    user_service = UserService(db)

    success, message = await user_service.verify_email(request.token)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    return {"message": message}


@router.post("/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset."""
    user_service = UserService(db)

    success, message = await user_service.request_password_reset(request.email)

    # TODO: Send password reset email in background
    # if success:
    #     background_tasks.add_task(send_password_reset_email, request.email, reset_token)

    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Reset password using token."""
    user_service = UserService(db)

    success, message = await user_service.reset_password(
        token=request.token,
        new_password=request.new_password
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    return {"message": message}


@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password."""
    user_service = UserService(db)

    # Verify current password
    user, error = await user_service.authenticate_user(
        email=current_user.email,
        password=request.current_password
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Update password using reset mechanism (reuses validation)
    # Generate temporary reset token
    reset_token = current_user.generate_password_reset_token()
    await db.commit()

    success, message = await user_service.reset_password(
        token=reset_token,
        new_password=request.new_password
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    logger.info(f"Password changed for user: {current_user.email}")
    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (token invalidation handled client-side)."""
    logger.info(f"User logged out: {current_user.email}")
    return {"message": "Successfully logged out"}


@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
):
    """Refresh JWT token."""
    access_token_expires = timedelta(minutes=settings.security.access_token_expire_minutes)
    access_token = create_access_token(
        user=current_user,
        expires_delta=access_token_expires
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=int(access_token_expires.total_seconds()),
        user=UserResponse.from_user(current_user)
    )


@router.get("/health")
async def auth_health_check():
    """Health check endpoint for authentication service."""
    return {
        "status": "healthy",
        "service": "authentication",
        "timestamp": datetime.utcnow().isoformat()
    }
