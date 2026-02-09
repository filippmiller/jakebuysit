"""
Redis client wrapper for caching marketplace data.
"""
import redis
import json
import structlog
from typing import Optional, Any
from config.settings import settings

logger = structlog.get_logger()


class RedisCache:
    """Redis caching client."""

    def __init__(self):
        self.client = redis.from_url(
            settings.redis_url,
            decode_responses=True
        )
        logger.info("redis_client_initialized", url=settings.redis_url)

    async def get(self, key: str) -> Optional[dict]:
        """Get cached value."""
        try:
            value = self.client.get(key)
            if value:
                logger.debug("cache_hit", key=key)
                return json.loads(value)
            logger.debug("cache_miss", key=key)
            return None
        except Exception as e:
            logger.error("cache_get_error", key=key, error=str(e))
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """Set cached value with optional TTL (seconds)."""
        try:
            serialized = json.dumps(value)
            if ttl:
                self.client.setex(key, ttl, serialized)
            else:
                self.client.set(key, serialized)
            logger.debug("cache_set", key=key, ttl=ttl)
            return True
        except Exception as e:
            logger.error("cache_set_error", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        """Delete cached value."""
        try:
            self.client.delete(key)
            logger.debug("cache_deleted", key=key)
            return True
        except Exception as e:
            logger.error("cache_delete_error", key=key, error=str(e))
            return False

    def generate_cache_key(
        self,
        prefix: str,
        **kwargs
    ) -> str:
        """
        Generate consistent cache key from parameters.

        Example:
            generate_cache_key("marketplace", brand="Apple", model="AirPods")
            => "marketplace:brand=Apple:model=AirPods"
        """
        parts = [prefix]
        for key, value in sorted(kwargs.items()):
            if value is not None:
                parts.append(f"{key}={value}")
        return ":".join(parts)

    def close(self):
        """Close Redis connection."""
        self.client.close()
        logger.info("redis_client_closed")


# Global instance
redis_cache = RedisCache()
