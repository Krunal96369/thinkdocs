"""
Redis cache service for ThinkDocs.
Handles caching, session storage, and pub/sub messaging.
"""

import json
import logging
from typing import Any, Optional, Dict, List
from datetime import timedelta

import redis.asyncio as redis
from redis.asyncio import Redis

from api.config import settings

logger = logging.getLogger(__name__)

# Global Redis connection pool
_redis_pool: Optional[Redis] = None


async def setup_redis() -> Redis:
    """Initialize Redis connection pool."""
    global _redis_pool

    if _redis_pool is None:
        try:
            _redis_pool = redis.from_url(
                settings.redis.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )

            # Test connection
            await _redis_pool.ping()
            logger.info("Redis connection established successfully")

        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    return _redis_pool


async def get_redis() -> Redis:
    """Get Redis connection."""
    if _redis_pool is None:
        await setup_redis()
    return _redis_pool


async def close_redis():
    """Close Redis connection."""
    global _redis_pool
    if _redis_pool:
        await _redis_pool.close()
        _redis_pool = None
        logger.info("Redis connection closed")


class CacheService:
    """Redis cache service with common operations."""

    def __init__(self):
        self.redis: Optional[Redis] = None

    async def _get_redis(self) -> Redis:
        """Get Redis connection."""
        if self.redis is None:
            self.redis = await get_redis()
        return self.redis

    async def get(self, key: str) -> Optional[str]:
        """Get value from cache."""
        try:
            redis_client = await self._get_redis()
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: str,
        expire: Optional[int] = None
    ) -> bool:
        """Set value in cache with optional expiration."""
        try:
            redis_client = await self._get_redis()
            return await redis_client.set(key, value, ex=expire)
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            redis_client = await self._get_redis()
            return bool(await redis_client.delete(key))
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            redis_client = await self._get_redis()
            return bool(await redis_client.exists(key))
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False

    async def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        """Get JSON value from cache."""
        try:
            value = await self.get(key)
            if value:
                return json.loads(value)
            return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for key {key}: {e}")
            return None

    async def set_json(
        self,
        key: str,
        value: Dict[str, Any],
        expire: Optional[int] = None
    ) -> bool:
        """Set JSON value in cache."""
        try:
            json_value = json.dumps(value)
            return await self.set(key, json_value, expire)
        except (TypeError, ValueError) as e:
            logger.error(f"JSON encode error for key {key}: {e}")
            return False

    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter in cache."""
        try:
            redis_client = await self._get_redis()
            return await redis_client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Cache increment error for key {key}: {e}")
            return None

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for key."""
        try:
            redis_client = await self._get_redis()
            return await redis_client.expire(key, seconds)
        except Exception as e:
            logger.error(f"Cache expire error for key {key}: {e}")
            return False

    async def get_keys(self, pattern: str) -> List[str]:
        """Get keys matching pattern."""
        try:
            redis_client = await self._get_redis()
            return await redis_client.keys(pattern)
        except Exception as e:
            logger.error(f"Cache keys error for pattern {pattern}: {e}")
            return []


# Global cache service instance
cache_service = CacheService()


# Convenience functions
async def cache_get(key: str) -> Optional[str]:
    """Get value from cache."""
    return await cache_service.get(key)


async def cache_set(key: str, value: str, expire: Optional[int] = None) -> bool:
    """Set value in cache."""
    return await cache_service.set(key, value, expire)


async def cache_delete(key: str) -> bool:
    """Delete key from cache."""
    return await cache_service.delete(key)


async def cache_get_json(key: str) -> Optional[Dict[str, Any]]:
    """Get JSON value from cache."""
    return await cache_service.get_json(key)


async def cache_set_json(
    key: str,
    value: Dict[str, Any],
    expire: Optional[int] = None
) -> bool:
    """Set JSON value in cache."""
    return await cache_service.set_json(key, value, expire)
