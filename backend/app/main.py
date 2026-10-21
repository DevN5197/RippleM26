import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import *  # Import all models to ensure registration
from app.seed import seed_rupi_clothing
from app.middleware import SecurityHardeningMiddleware

logger = logging.getLogger("ripple.server")

# Routers
from app.api import auth
from app.api import suppliers
from app.api import customers
from app.api import inventory
from app.api import purchase_orders
from app.api import invoices
from app.api import cash_flow
from app.api import relationships
from app.api import settings as settings_api
from app.api import dashboard
from app.api import simulator
from app.api import ai

app = FastAPI(
    title="Ripple Cash-Flow Intelligence API",
    description="Backend API for Ripple small-business financial coordination & cash-flow intelligence platform.",
    version="1.0.0",
)

# Global Security Hardening Middleware (Rate limiting, 1MB size cap, security headers)
app.add_middleware(SecurityHardeningMiddleware)

# CORS setup
origins = settings.cors_origin_list
if not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global Exception Handler (Prevents unhandled crashes and white screens)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Pass through standard HTTP and validation errors without turning them into 500s
    if isinstance(exc, (StarletteHTTPException, RequestValidationError)):
        raise exc
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "An internal server error occurred. Deterministic fallback data is active.",
            "fallbackAvailable": True,
        },
    )

# Include API Routers
app.include_router(auth.router)
app.include_router(suppliers.router)
app.include_router(customers.router)
app.include_router(inventory.router)
app.include_router(purchase_orders.router)
app.include_router(invoices.router)
app.include_router(cash_flow.router)
app.include_router(simulator.router)
app.include_router(relationships.router)
app.include_router(settings_api.router)
app.include_router(dashboard.router)
app.include_router(ai.router)

@app.on_event("startup")
def on_startup():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    # Ensure newly added columns exist in users table for existing databases
    with engine.connect() as conn:
        for col, col_type in [
            ("phone_number", "VARCHAR(32)"),
            ("is_email_verified", "BOOLEAN DEFAULT 0"),
            ("is_phone_verified", "BOOLEAN DEFAULT 0"),
            ("otp_hash", "VARCHAR(255)"),
            ("otp_expires_at", "DATETIME"),
            ("otp_attempts", "INTEGER DEFAULT 0"),
            ("otp_last_sent_at", "DATETIME"),
            ("otp_used", "BOOLEAN DEFAULT 0"),
        ]:
            try:
                from sqlalchemy import text
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

    # Automatically seed default demo business if not present
    db = SessionLocal()
    try:
        seed_rupi_clothing(db, overwrite=False)
    finally:
        db.close()

@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
def health_check():
    return {
        "status": "healthy",
        "service": "ripple-backend",
        "environment": settings.ENVIRONMENT,
    }
