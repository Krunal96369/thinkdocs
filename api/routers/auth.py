"""
Authentication router for user management and JWT token handling.
Provides login, registration, token refresh, and user profile endpoints.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
import bcrypt

from api.config import settings
from api.database import get_db
from api.models.users import User
from api.services.user_service import UserService

router = APIRouter()
security = HTTPBearer()

# Pydantic models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
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

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# Mock fallback data for development
MOCK_USERS = {
    "user@example.com": {
        "id": "user_123",
        "email": "user@example.com",
        "name": "Demo User",
        "password_hash": bcrypt.hashpw("password".encode(), bcrypt.gensalt()).decode(),
        "avatar": None,
        "is_verified": True,
        "is_premium": False,
        "created_at": datetime.utcnow(),
        "last_seen": datetime.utcnow(),
        "last_login": datetime.utcnow(),
        "preferences": {
            "theme": "light",
            "notifications": True,
            "language": "en"
        }
    },
    "demo@thinkdocs.com": {
        "id": "user_2",
        "email": "demo@thinkdocs.com",
        "name": "Demo User 2",
        "password_hash": bcrypt.hashpw("password".encode(), bcrypt.gensalt()).decode(),
        "avatar": None,
        "is_verified": True,
        "is_premium": False,
        "created_at": datetime.utcnow(),
        "last_seen": datetime.utcnow(),
        "last_login": datetime.utcnow(),
        "preferences": {
            "theme": "light",
            "notifications": True,
            "language": "en"
        }
    }
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.security.secret_key, algorithm="HS256")
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current user from JWT token."""
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

    # Try database first
    if db is not None:
        try:
            user_service = UserService(db)
            user = await user_service.get_user_by_id(user_id)

            if user and user.is_active:
                user.update_last_seen()
                await db.commit()
                return user
        except Exception as e:
            print(f"⚠️ Database auth failed, falling back to mock: {e}")

    # Fallback to mock database
    for user_data in MOCK_USERS.values():
        if user_data["id"] == user_id:
            # Create a mock User object for compatibility
            class MockUser:
                def __init__(self, data):
                    for key, value in data.items():
                        setattr(self, key, value)
                    self.is_active = True

                def update_last_seen(self):
                    pass

            return MockUser(user_data)

    raise credentials_exception

@router.post("/login", response_model=TokenResponse)
async def login(
    user_login: UserLogin,
    req: Request,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return JWT token."""

    # Try database first
    if db is not None:
        try:
            user_service = UserService(db)
            user, error = await user_service.authenticate_user(
                email=user_login.email,
                password=user_login.password
            )

            if user:
                # Create access token
                access_token_expires = timedelta(minutes=settings.security.access_token_expire_minutes)
                access_token = create_access_token(
                    data={"sub": user.id}, expires_delta=access_token_expires
                )

                return TokenResponse(
                    access_token=access_token,
                    expires_in=int(access_token_expires.total_seconds()),
                    user=UserResponse.from_user(user)
                )
            else:
                # Log failed login attempt
                client_ip = req.client.host if req.client else "unknown"
                print(f"⚠️ Failed login for {user_login.email} from {client_ip}: {error}")
        except Exception as e:
            print(f"⚠️ Database login failed: {e}")

    # No fallback - require proper authentication
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password"
    )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_register: UserRegister,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""

    # Try database first
    if db is not None:
        try:
            user_service = UserService(db)

            # Register user
            user, error = await user_service.register_user(
                email=user_register.email,
                password=user_register.password,
                name=user_register.name,
                terms_accepted=user_register.terms_accepted,
                privacy_accepted=user_register.privacy_accepted,
                marketing_consent=user_register.marketing_consent
            )

            if user:
                # Create access token
                access_token_expires = timedelta(minutes=settings.security.access_token_expire_minutes)
                access_token = create_access_token(
                    data={"sub": user.id}, expires_delta=access_token_expires
                )

                # TODO: Send verification email in background
                # background_tasks.add_task(send_verification_email, user.email, user.email_verification_token)

                return TokenResponse(
                    access_token=access_token,
                    expires_in=int(access_token_expires.total_seconds()),
                    user=UserResponse.from_user(user)
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error
                )
        except Exception as e:
            print(f"⚠️ Database registration failed: {e}")

    # No fallback - require proper database registration
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Registration service unavailable. Please try again later."
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user = Depends(get_current_user_from_token)):
    """Get current user profile."""
    # If it's a real User object from database
    if hasattr(current_user, 'to_dict'):
        return UserResponse.from_user(current_user)

    # If it's a mock user object
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar=current_user.avatar,
        is_verified=current_user.is_verified,
        is_premium=current_user.is_premium,
        created_at=current_user.created_at,
        last_seen=current_user.last_seen,
        last_login=current_user.last_login,
        preferences=current_user.preferences
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: UserResponse = Depends(get_current_user_from_token)):
    """Refresh JWT token."""
    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={"sub": current_user.id}, expires_delta=access_token_expires
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=int(access_token_expires.total_seconds()),
        user=current_user
    )

@router.post("/logout")
async def logout(current_user: UserResponse = Depends(get_current_user_from_token)):
    """Logout user (client should discard token)."""
    return {"message": "Successfully logged out"}

@router.post("/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """Change user password."""
    # Find user in mock database
    user_data = None
    for data in MOCK_USERS.values():
        if data["id"] == current_user.id:
            user_data = data
            break

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify current password
    if not verify_password(password_change.current_password, user_data["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Update password
    user_data["password_hash"] = get_password_hash(password_change.new_password)

    return {"message": "Password changed successfully"}

@router.post("/forgot-password")
async def forgot_password(email: EmailStr):
    """Send password reset email (mock implementation)."""
    # In production, send actual email with reset token
    return {"message": "Password reset email sent (if email exists)"}

@router.post("/reset-password")
async def reset_password(token: str, new_password: str):
    """Reset password using token (mock implementation)."""
    # In production, verify reset token and update password
    return {"message": "Password reset successfully (mock)"}

@router.get("/test-auth")
async def test_auth(current_user: UserResponse = Depends(get_current_user_from_token)):
    """Test endpoint to verify JWT authentication is working."""
    return {
        "message": "Authentication successful",
        "user": current_user,
        "timestamp": datetime.utcnow().isoformat()
    }
