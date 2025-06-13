"""
Admin router for development and debugging purposes.
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/status")
async def admin_status():
    """Get admin status information."""
    return {
        "status": "admin_active",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": "development"
    }
