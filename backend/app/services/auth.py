from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from app.config import settings

def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, business_id: str | None = None, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "sub": user_id,
        "business_id": business_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except Exception:
        return None

import threading
import time
from collections import defaultdict
from starlette.requests import Request


def get_client_ip(request: Request) -> str:
    """Extract real client IP address, properly handling reverse proxies like Render and Cloudflare."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First IP in comma-separated chain is originating client
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


class LoginRateLimiter:
    """
    Industry-standard login rate limiter & brute-force protection:
    - Tracks failed attempts per IP and per target account (email).
    - Threshold: 5 failed attempts per 60-second window.
    - Lockout: When threshold is reached, IP/account is locked for 60 seconds (HTTP 429).
    - Thread-safe using threading.Lock.
    - Auto-purges expired timestamps.
    - Resets counter upon successful authentication.
    """

    def __init__(
        self,
        max_failed_attempts: int = 5,
        window_seconds: int = 60,
        lockout_seconds: int = 60,
    ):
        self.max_failed_attempts = max_failed_attempts
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._lock = threading.Lock()
        self._ip_failures: dict[str, list[float]] = defaultdict(list)
        self._email_failures: dict[str, list[float]] = defaultdict(list)
        self._lockouts: dict[str, float] = {}

    def check_rate_limit(self, client_ip: str, email: str) -> tuple[bool, int, str]:
        """
        Check if client_ip or email is currently locked out or has exceeded failed attempt threshold.
        Returns: (is_blocked, retry_after_seconds, reason)
        """
        now = time.time()
        client_ip = (client_ip or "unknown").strip().lower()
        email = (email or "unknown").strip().lower()

        with self._lock:
            # 1. Check active lockouts
            ip_lockout = self._lockouts.get(f"ip:{client_ip}", 0.0)
            if ip_lockout > now:
                return True, max(1, int(ip_lockout - now)), "IP temporarily locked out due to multiple failed login attempts."
            elif f"ip:{client_ip}" in self._lockouts:
                del self._lockouts[f"ip:{client_ip}"]

            email_lockout = self._lockouts.get(f"email:{email}", 0.0)
            if email_lockout > now:
                return True, max(1, int(email_lockout - now)), "Account temporarily locked out due to multiple failed login attempts."
            elif f"email:{email}" in self._lockouts:
                del self._lockouts[f"email:{email}"]

            # 2. Check rolling window failures
            cutoff = now - self.window_seconds
            ip_times = [t for t in self._ip_failures.get(client_ip, []) if t > cutoff]
            self._ip_failures[client_ip] = ip_times
            if len(ip_times) >= self.max_failed_attempts:
                self._lockouts[f"ip:{client_ip}"] = now + self.lockout_seconds
                return True, self.lockout_seconds, "Too many failed login attempts from this IP."

            email_times = [t for t in self._email_failures.get(email, []) if t > cutoff]
            self._email_failures[email] = email_times
            if len(email_times) >= self.max_failed_attempts:
                self._lockouts[f"email:{email}"] = now + self.lockout_seconds
                return True, self.lockout_seconds, "Too many failed login attempts for this account."

            return False, 0, ""

    def record_failed_attempt(self, client_ip: str, email: str) -> None:
        """
        Record a failed login attempt for both the client IP and targeted email.
        If threshold reached, triggers lockout.
        """
        now = time.time()
        client_ip = (client_ip or "unknown").strip().lower()
        email = (email or "unknown").strip().lower()

        with self._lock:
            cutoff = now - self.window_seconds

            ip_times = [t for t in self._ip_failures.get(client_ip, []) if t > cutoff]
            ip_times.append(now)
            self._ip_failures[client_ip] = ip_times
            if len(ip_times) >= self.max_failed_attempts:
                self._lockouts[f"ip:{client_ip}"] = now + self.lockout_seconds

            email_times = [t for t in self._email_failures.get(email, []) if t > cutoff]
            email_times.append(now)
            self._email_failures[email] = email_times
            if len(email_times) >= self.max_failed_attempts:
                self._lockouts[f"email:{email}"] = now + self.lockout_seconds

    def record_successful_login(self, client_ip: str, email: str) -> None:
        """
        Clear failure records and active lockouts upon successful authentication.
        """
        client_ip = (client_ip or "unknown").strip().lower()
        email = (email or "unknown").strip().lower()

        with self._lock:
            self._ip_failures.pop(client_ip, None)
            self._email_failures.pop(email, None)
            self._lockouts.pop(f"ip:{client_ip}", None)
            self._lockouts.pop(f"email:{email}", None)

    def reset(self) -> None:
        """Clear all rate limiting state (useful for tests)."""
        with self._lock:
            self._ip_failures.clear()
            self._email_failures.clear()
            self._lockouts.clear()


login_rate_limiter = LoginRateLimiter()

