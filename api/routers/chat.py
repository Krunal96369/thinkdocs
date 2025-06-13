"""
Chat router for managing chat sessions and messages.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from api.routers.auth import get_current_user_from_token, UserResponse

router = APIRouter()

class ChatSession(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    user_id: str

class ChatMessage(BaseModel):
    id: str
    session_id: str
    content: str
    role: str  # "user" or "assistant"
    timestamp: datetime
    document_ids: List[str] = []

# Mock chat data
MOCK_SESSIONS = []
MOCK_MESSAGES = []

@router.get("/sessions", response_model=List[ChatSession])
async def get_chat_sessions(current_user: UserResponse = Depends(get_current_user_from_token)):
    """Get all chat sessions for the current user."""
    user_sessions = [session for session in MOCK_SESSIONS if session["user_id"] == current_user.id]
    return [ChatSession(**session) for session in user_sessions]

@router.post("/sessions", response_model=ChatSession)
async def create_chat_session(
    session_data: dict,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """Create a new chat session."""
    session_id = f"session_{len(MOCK_SESSIONS) + 1}"

    session = {
        "id": session_id,
        "title": session_data.get("title", "New Chat"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "user_id": current_user.id
    }

    MOCK_SESSIONS.append(session)
    return ChatSession(**session)

@router.get("/sessions/{session_id}", response_model=ChatSession)
async def get_chat_session(
    session_id: str,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """Get a specific chat session."""
    for session in MOCK_SESSIONS:
        if session["id"] == session_id and session["user_id"] == current_user.id:
            return ChatSession(**session)

    raise HTTPException(status_code=404, detail="Chat session not found")

@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """Delete a chat session."""
    for i, session in enumerate(MOCK_SESSIONS):
        if session["id"] == session_id and session["user_id"] == current_user.id:
            MOCK_SESSIONS.pop(i)
            # Also delete associated messages
            global MOCK_MESSAGES
            MOCK_MESSAGES = [msg for msg in MOCK_MESSAGES if msg["session_id"] != session_id]
            return {"message": "Chat session deleted successfully"}

    raise HTTPException(status_code=404, detail="Chat session not found")

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def get_chat_messages(
    session_id: str,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """Get messages for a chat session."""
    # Verify session belongs to user
    session_exists = any(
        session["id"] == session_id and session["user_id"] == current_user.id
        for session in MOCK_SESSIONS
    )

    if not session_exists:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session_messages = [msg for msg in MOCK_MESSAGES if msg["session_id"] == session_id]
    return [ChatMessage(**msg) for msg in session_messages]

@router.post("/sessions/{session_id}/messages", response_model=ChatMessage)
async def send_message(
    session_id: str,
    message_data: dict,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """Send a message in a chat session."""
    # Verify session belongs to user
    session_exists = any(
        session["id"] == session_id and session["user_id"] == current_user.id
        for session in MOCK_SESSIONS
    )

    if not session_exists:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Create user message
    user_message_id = f"msg_{len(MOCK_MESSAGES) + 1}"
    user_message = {
        "id": user_message_id,
        "session_id": session_id,
        "content": message_data.get("message", ""),
        "role": "user",
        "timestamp": datetime.utcnow(),
        "document_ids": message_data.get("document_ids", [])
    }

    MOCK_MESSAGES.append(user_message)

    # Create mock assistant response
    assistant_message_id = f"msg_{len(MOCK_MESSAGES) + 1}"
    assistant_message = {
        "id": assistant_message_id,
        "session_id": session_id,
        "content": f"This is a mock response to: {message_data.get('message', '')}",
        "role": "assistant",
        "timestamp": datetime.utcnow(),
        "document_ids": []
    }

    MOCK_MESSAGES.append(assistant_message)

    # Update session timestamp
    for session in MOCK_SESSIONS:
        if session["id"] == session_id:
            session["updated_at"] = datetime.utcnow()
            break

    return ChatMessage(**assistant_message)
