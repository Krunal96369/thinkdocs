"""
Socket.IO router for real-time communication.
Handles chat messages, document processing updates, and system notifications.
"""

import logging
from datetime import datetime
from typing import Dict, Set

import socketio
from fastapi import APIRouter, HTTPException
import jwt

from api.config import settings

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)

# Create FastAPI router
router = APIRouter()

# Connection manager for Socket.IO connections
class ConnectionManager:
    def __init__(self):
        # Store active connections by user ID
        self.active_connections: Dict[str, Set[str]] = {}
        # Store chat session subscriptions
        self.chat_sessions: Dict[str, Set[str]] = {}
        # Store document processing subscriptions
        self.document_processing: Dict[str, Set[str]] = {}

    async def connect(self, sid: str, user_id: str):
        """Register a new Socket.IO connection."""
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(sid)
        logger.info(f"User {user_id} connected via Socket.IO (sid: {sid})")

    async def disconnect(self, sid: str, user_id: str):
        """Remove a Socket.IO connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(sid)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

        # Remove from all subscriptions
        for session_connections in self.chat_sessions.values():
            session_connections.discard(sid)

        for doc_connections in self.document_processing.values():
            doc_connections.discard(sid)

        logger.info(f"User {user_id} disconnected from Socket.IO (sid: {sid})")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to a specific user."""
        if user_id in self.active_connections:
            for sid in self.active_connections[user_id].copy():
                try:
                    await sio.emit('personal_message', message, room=sid)
                except Exception as e:
                    logger.error(f"Failed to send message to {sid}: {e}")
                    self.active_connections[user_id].discard(sid)

    async def broadcast_to_session(self, message: dict, session_id: str):
        """Broadcast a message to all users in a chat session."""
        if session_id in self.chat_sessions:
            for sid in self.chat_sessions[session_id].copy():
                try:
                    await sio.emit('message_received', message, room=sid)
                except Exception as e:
                    logger.error(f"Failed to broadcast to session {session_id}: {e}")
                    self.chat_sessions[session_id].discard(sid)

    async def broadcast_document_update(self, message: dict, document_id: str):
        """Broadcast document processing updates."""
        if document_id in self.document_processing:
            for sid in self.document_processing[document_id].copy():
                try:
                    await sio.emit('document_update', message, room=sid)
                except Exception as e:
                    logger.error(f"Failed to broadcast document update: {e}")
                    self.document_processing[document_id].discard(sid)

    def join_chat_session(self, sid: str, session_id: str):
        """Subscribe a Socket.IO connection to chat session updates."""
        if session_id not in self.chat_sessions:
            self.chat_sessions[session_id] = set()
        self.chat_sessions[session_id].add(sid)

    def leave_chat_session(self, sid: str, session_id: str):
        """Unsubscribe a Socket.IO connection from chat session updates."""
        if session_id in self.chat_sessions:
            self.chat_sessions[session_id].discard(sid)

    def subscribe_document_processing(self, sid: str, document_id: str):
        """Subscribe to document processing updates."""
        if document_id not in self.document_processing:
            self.document_processing[document_id] = set()
        self.document_processing[document_id].add(sid)

    def unsubscribe_document_processing(self, sid: str, document_id: str):
        """Unsubscribe from document processing updates."""
        if document_id in self.document_processing:
            self.document_processing[document_id].discard(sid)

# Global connection manager instance
manager = ConnectionManager()

async def authenticate_socket(sid: str, auth_data: dict) -> str:
    """Authenticate Socket.IO connection using token."""
    token = auth_data.get("token")

    if not token:
        logger.warning(f"No token provided for connection {sid}")
        await sio.disconnect(sid)
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        # Verify JWT token
        payload = jwt.decode(token, settings.security.secret_key, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            logger.warning(f"Invalid token for connection {sid}")
            await sio.disconnect(sid)
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_id
    except jwt.ExpiredSignatureError:
        logger.warning(f"Expired token for connection {sid}")
        await sio.disconnect(sid)
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        logger.warning(f"Invalid token for connection {sid}")
        await sio.disconnect(sid)
        raise HTTPException(status_code=401, detail="Invalid token")

# Socket.IO event handlers
@sio.event
async def connect(sid, environ, auth):
    """Handle Socket.IO connection."""
    try:
        user_id = await authenticate_socket(sid, auth or {})
        await manager.connect(sid, user_id)

        # Send welcome message
        await sio.emit('connection_established', {
            "type": "connection_established",
            "message": "Connected to ThinkDocs real-time updates",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id
        }, room=sid)

        logger.info(f"User {user_id} connected successfully (sid: {sid})")

    except Exception as e:
        logger.error(f"Connection failed for {sid}: {e}")
        await sio.disconnect(sid)

@sio.event
async def disconnect(sid):
    """Handle Socket.IO disconnection."""
    # Find user_id for this sid (we should store this mapping)
    user_id = None
    for uid, sids in manager.active_connections.items():
        if sid in sids:
            user_id = uid
            break

    if user_id:
        await manager.disconnect(sid, user_id)

    logger.info(f"Connection {sid} disconnected")

@sio.event
async def join_chat_session(sid, data):
    """Join a chat session."""
    session_id = data.get("session_id")
    if session_id:
        manager.join_chat_session(sid, session_id)
        await sio.emit('joined_session', {
            "session_id": session_id,
            "message": f"Joined chat session {session_id}"
        }, room=sid)

@sio.event
async def leave_chat_session(sid, data):
    """Leave a chat session."""
    session_id = data.get("session_id")
    if session_id:
        manager.leave_chat_session(sid, session_id)
        await sio.emit('left_session', {
            "session_id": session_id,
            "message": f"Left chat session {session_id}"
        }, room=sid)

@sio.event
async def send_message(sid, data):
    """Send a message to a chat session."""
    session_id = data.get("session_id")
    message = data.get("message")
    timestamp = data.get("timestamp", datetime.utcnow().isoformat())

    if session_id and message:
        message_data = {
            "session_id": session_id,
            "message": message,
            "timestamp": timestamp,
            "sid": sid
        }
        await manager.broadcast_to_session(message_data, session_id)

@sio.event
async def subscribe_document_processing(sid, data):
    """Subscribe to document processing updates."""
    document_id = data.get("document_id")
    if document_id:
        manager.subscribe_document_processing(sid, document_id)
        await sio.emit('subscribed_document', {
            "document_id": document_id,
            "message": f"Subscribed to document {document_id} processing updates"
        }, room=sid)

@sio.event
async def unsubscribe_document_processing(sid, data):
    """Unsubscribe from document processing updates."""
    document_id = data.get("document_id")
    if document_id:
        manager.unsubscribe_document_processing(sid, document_id)
        await sio.emit('unsubscribed_document', {
            "document_id": document_id,
            "message": f"Unsubscribed from document {document_id} processing updates"
        }, room=sid)

# Utility functions for other parts of the application
async def notify_message_received(session_id: str, message_data: dict):
    """Notify all subscribers of a new message in a chat session."""
    await manager.broadcast_to_session({
        "type": "message_received",
        "session_id": session_id,
        "data": message_data,
        "timestamp": datetime.utcnow().isoformat()
    }, session_id)

async def notify_document_processing_started(document_id: str, filename: str, user_id: str):
    """Notify user that document processing has started."""
    await manager.send_personal_message({
        "type": "document_processing_started",
        "document_id": document_id,
        "filename": filename,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)

async def notify_document_processing_progress(document_id: str, progress: int, stage: str, user_id: str):
    """Notify user of document processing progress."""
    await manager.send_personal_message({
        "type": "document_processing_progress",
        "document_id": document_id,
        "progress": progress,
        "stage": stage,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)

async def notify_document_processing_completed(document_id: str, filename: str, user_id: str):
    """Notify user that document processing is complete."""
    await manager.send_personal_message({
        "type": "document_processing_completed",
        "document_id": document_id,
        "filename": filename,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)

async def notify_document_processing_failed(document_id: str, filename: str, error: str, user_id: str):
    """Notify user that document processing failed."""
    await manager.send_personal_message({
        "type": "document_processing_failed",
        "document_id": document_id,
        "filename": filename,
        "error": error,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)

async def send_system_notification(user_id: str, notification_type: str, message: str, duration: int = 4000):
    """Send a system notification to a specific user."""
    await manager.send_personal_message({
        "type": "system_notification",
        "notification_type": notification_type,
        "message": message,
        "duration": duration,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)

# Export the Socket.IO app for mounting in main.py
socket_app = socketio.ASGIApp(sio)
