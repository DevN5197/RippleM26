"""
Authentication and database dependencies.
Re-exported from app.api.deps for compatibility.
"""
from app.api.deps import get_current_user, get_current_business, security

__all__ = ["get_current_user", "get_current_business", "security"]
