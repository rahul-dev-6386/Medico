from collections import defaultdict
import time

from fastapi import Request, HTTPException, status, Depends
from typing import Callable


def rate_limit(max_requests: int = 60, window_seconds: int = 60) -> Callable:
    requests: dict[str, list[float]] = defaultdict(list)

    async def limiter(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - window_seconds

        requests[client_ip] = [
            t for t in requests[client_ip] if t > window_start
        ]

        if len(requests[client_ip]) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Try again later.",
            )

        requests[client_ip].append(now)

    return Depends(limiter)
