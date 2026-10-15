import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Maximum payload size: 1 MB
MAX_PAYLOAD_SIZE = 1024 * 1024

# Route-specific rate limits: (max_requests, window_seconds)
RATE_LIMIT_RULES: dict[str, tuple[int, int]] = {
    "/api/simulator/simulate": (30, 60),
    "/api/simulate": (30, 60),
    "/api/ai/chat": (10, 60),
}

class SecurityHardeningMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # Store timestamp lists per (client_id, route_pattern)
        self.request_history: dict[tuple[str, str], list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # 1. Enforce payload size limit on incoming requests
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                if length > MAX_PAYLOAD_SIZE:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": True,
                            "message": "Request payload exceeds 1MB limit.",
                        },
                    )
            except (ValueError, TypeError):
                pass

        # 2. Check rate limit for protected routes
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        # Check authorization header or IP as client identifier
        auth_hdr = request.headers.get("authorization", "")
        client_key = auth_hdr[:30] if auth_hdr else client_ip

        for route_pattern, (max_req, window_sec) in RATE_LIMIT_RULES.items():
            if path == route_pattern:
                now = time.time()
                history_key = (client_key, route_pattern)
                timestamps = self.request_history[history_key]

                # Purge older timestamps outside the window
                cutoff = now - window_sec
                self.request_history[history_key] = [t for t in timestamps if t > cutoff]

                if len(self.request_history[history_key]) >= max_req:
                    return JSONResponse(
                        status_code=429,
                        content={
                            "error": True,
                            "message": f"Rate limit exceeded: maximum {max_req} requests per {window_sec}s for this endpoint.",
                        },
                        headers={"Retry-After": str(window_sec)},
                    )

                self.request_history[history_key].append(now)
                break

        response = await call_next(request)

        # 3. Add security hardening response headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response
