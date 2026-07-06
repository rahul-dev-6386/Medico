import logging
from typing import Any

from redis import Redis
from rq import Queue

from app.core.config import settings

logger = logging.getLogger("queue")

_redis: Redis | None = None
_queue: Queue | None = None


def get_connection() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        logger.info(f"Connected to Redis at {settings.REDIS_URL}")
    return _redis


def get_queue() -> Queue:
    global _queue
    if _queue is None:
        _queue = Queue("report_processing", connection=get_connection())
    return _queue


def enqueue_job(func: str, *args: Any, **kwargs: Any) -> str:
    q = get_queue()
    from rq import get_current_job
    job = q.enqueue(func, *args, **kwargs)
    logger.info(f"Enqueued job {job.id} for {func}")
    return job.id
