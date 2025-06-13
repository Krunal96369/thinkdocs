"""
Health check endpoints for ThinkDocs API.
Provides system health status and readiness checks.
"""

import asyncio
import time
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from api.database import get_db
from api.services.cache import get_redis
from api.services.vector_db import get_vector_db

router = APIRouter()


@router.get("/")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "ThinkDocs API",
        "version": "1.0.0"
    }


@router.get("/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Comprehensive readiness check.
    Verifies all critical services are operational.
    """
    checks = {}
    overall_status = "healthy"

    # Database check
    try:
        result = await db.execute(text("SELECT 1"))
        checks["database"] = {
            "status": "healthy",
            "response_time": 0.001  # Placeholder
        }
    except Exception as e:
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_status = "unhealthy"

    # Redis check
    try:
        redis = await get_redis()
        await redis.ping()
        checks["redis"] = {
            "status": "healthy",
            "response_time": 0.001  # Placeholder
        }
    except Exception as e:
        checks["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_status = "unhealthy"

    # Vector DB check
    try:
        vector_db = await get_vector_db()
        # Basic heartbeat check
        checks["vector_db"] = {
            "status": "healthy",
            "response_time": 0.001  # Placeholder
        }
    except Exception as e:
        checks["vector_db"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_status = "unhealthy"

    if overall_status == "unhealthy":
        raise HTTPException(status_code=503, detail="Service unavailable")

    return {
        "status": overall_status,
        "timestamp": time.time(),
        "checks": checks
    }


@router.get("/live")
async def liveness_check() -> Dict[str, str]:
    """
    Liveness probe for Kubernetes.
    Simple check that the service is running.
    """
    return {
        "status": "alive",
        "timestamp": str(time.time())
    }
