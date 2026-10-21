import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.business import Business, BusinessMembership
from app.models.settings import AppSettingsModel
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    login_rate_limiter,
    get_client_ip,
)
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserResponse, BusinessResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

def _build_business_response(b: Business) -> BusinessResponse:
    return BusinessResponse(
        id=b.id,
        name=b.name,
        currency=b.currency,
        openingCashPaise=b.opening_cash_paise,
        safetyThresholdPaise=b.safety_threshold_paise,
        industry=b.industry,
        ownerName=b.owner_name,
        ownerEmail=b.owner_email,
        phone=b.phone,
        address=b.address,
        taxRatePercent=b.tax_rate_percent,
        defaultSupplierPaymentTermsDays=b.default_supplier_payment_terms_days,
        defaultCustomerPaymentTermsDays=b.default_customer_payment_terms_days,
        defaultForecastHorizonDays=b.default_forecast_horizon_days,
    )

from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from app.services.notifications import (
    generate_otp,
    hash_otp,
    verify_otp_hash,
    send_email_otp,
    send_whatsapp_otp,
    send_gmail_otp,
)
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    BusinessResponse,
    VerifyOtpRequest,
    ResendOtpRequest,
    VerifyOtpResponse,
)

class RegisterResponse(BaseModel):
    success: bool = True
    message: str = "Account created successfully."
    email: str
    phone_number: str | None = None
    requires_verification: bool = False
    is_email_verified: bool = True
    is_phone_verified: bool = True
    access_token: str | None = None
    token_type: str = "bearer"
    debug_otp: str | None = None
    user: UserResponse | None = None
    business: BusinessResponse | None = None

@router.post("/register", response_model=RegisterResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    phone = req.phone_number.strip() if req.phone_number else None

    existing_user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists. Please log in."
        )

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    user = User(
        id=user_id,
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
        phone_number=phone,
        is_email_verified=True,
        is_phone_verified=True,
        otp_attempts=0,
        otp_used=True,
    )

    db.add(user)
    db.flush()

    business_id = f"biz_{uuid.uuid4().hex[:12]}"
    business = Business(
        id=business_id,
        name=req.business_name or "My Business",
        currency="INR",
        opening_cash_paise=1_000_000,
        safety_threshold_paise=500_000,
        owner_name=user.full_name,
        owner_email=user.email,
        phone=user.phone_number,
    )
    db.add(business)
    db.flush()

    membership = BusinessMembership(
        id=f"mem_{uuid.uuid4().hex[:12]}",
        user_id=user.id,
        business_id=business.id,
        role="owner",
    )
    db.add(membership)

    settings_record = AppSettingsModel(
        id=f"set_{uuid.uuid4().hex[:12]}",
        business_id=business.id,
        notification_preferences_json='{"overduePayments":true,"upcomingSupplierPayments":true,"overdueInvoices":true,"lowCash":true,"delayedDeliveries":true,"highRippleImpact":true}',
        app_preferences_json='{"theme":"system","compactTables":false,"version":"1.0.0"}',
    )
    db.add(settings_record)
    db.commit()
    db.refresh(user)
    db.refresh(business)

    token = create_access_token(data={"sub": user.id, "email": user.email})

    return RegisterResponse(
        success=True,
        message="Account created successfully.",
        email=user.email,
        phone_number=user.phone_number,
        requires_verification=False,
        is_email_verified=True,
        is_phone_verified=True,
        access_token=token,
        token_type="bearer",
        debug_otp=None,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone_number=user.phone_number,
            is_email_verified=True,
            is_phone_verified=True,
            emergency_dispatch_unlocked=True,
        ),
        business=_build_business_response(business),
    )

@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    # 1. Prevent replay attacks on already used OTPs
    if user.otp_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code has already been used. Please request a new OTP."
        )

    # 2. Enforce brute-force attempt limits (max 3)
    if user.otp_attempts >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum verification attempts (3) exceeded. This OTP is invalidated. Please request a new code."
        )

    # 3. Enforce expiration timestamp (default 10 minutes)
    if not user.otp_expires_at or user.otp_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a fresh OTP."
        )

    if not user.otp_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found. Please request a new OTP."
        )

    # 4. Verify cryptographically secure hash
    is_valid = verify_otp_hash(req.otp, user.otp_hash)
    if not is_valid:
        user.otp_attempts += 1
        db.commit()
        attempts_left = max(0, 3 - user.otp_attempts)
        if attempts_left == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid code. Maximum attempts reached. Code has been locked out; please request a new OTP."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {attempts_left} attempt(s) remaining."
        )

    # 5. Idempotent & Atomic Verification - Unlocks full account rights
    user.otp_used = True
    user.otp_hash = None
    user.otp_expires_at = None
    user.otp_attempts = 0

    user.is_email_verified = True
    user.is_phone_verified = True

    db.commit()
    db.refresh(user)

    membership = db.query(BusinessMembership).filter(BusinessMembership.user_id == user.id).first()
    business_id = membership.business_id if membership else None
    business = db.query(Business).filter(Business.id == business_id).first() if business_id else None
    b_resp = _build_business_response(business) if business else BusinessResponse(
        id="biz_default", name="My Business", currency="INR", openingCashPaise=1000000, safetyThresholdPaise=500000
    )

    token = create_access_token(user_id=user.id, business_id=business_id)
    emergency_unlocked = user.is_email_verified and (user.is_phone_verified or not user.phone_number)

    return VerifyOtpResponse(
        success=True,
        message="Account security verification successful. Emergency alert dispatch rights unlocked.",
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone_number=user.phone_number,
            is_email_verified=user.is_email_verified,
            is_phone_verified=user.is_phone_verified,
            emergency_dispatch_unlocked=emergency_unlocked,
        ),
        business=b_resp,
        is_email_verified=user.is_email_verified,
        is_phone_verified=user.is_phone_verified,
        emergency_dispatch_unlocked=emergency_unlocked,
    )

@router.post("/resend-otp")
def resend_otp(req: ResendOtpRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    # Enforce 60-second cooldown between resend requests
    if user.otp_last_sent_at:
        elapsed = (datetime.utcnow() - user.otp_last_sent_at).total_seconds()
        if elapsed < 60:
            cooldown_remaining = int(60 - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please wait {cooldown_remaining} seconds before requesting a new OTP.",
                headers={"Retry-After": str(cooldown_remaining)},
            )

    new_otp = generate_otp()
    user.otp_hash = hash_otp(new_otp)
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    user.otp_attempts = 0
    user.otp_used = False
    user.otp_last_sent_at = datetime.utcnow()
    db.commit()

    if req.channel == "phone" and user.phone_number:
        send_whatsapp_otp(user.phone_number, new_otp)
        target = f"WhatsApp ({user.phone_number})"
    else:
        send_email_otp(user.email, new_otp)
        target = f"Email ({user.email})"

    return {
        "success": True,
        "message": f"Fresh 6-digit verification code dispatched to {target}.",
        "cooldownSeconds": 60,
        "debug_otp": None,
    }

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    email = req.email.lower().strip()

    # 1. Enforce brute-force & rate-limiting protection before expensive DB / bcrypt operations
    is_blocked, retry_after, reason = login_rate_limiter.check_rate_limit(client_ip, email)
    if is_blocked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{reason} Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        login_rate_limiter.record_failed_attempt(client_ip, email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # 2. Reset failed attempts on valid login
    login_rate_limiter.record_successful_login(client_ip, email)

    # 3. Mark accounts verified on successful login
    user.is_email_verified = True
    user.is_phone_verified = True
    db.commit()

    memberships = db.query(BusinessMembership).filter(BusinessMembership.user_id == user.id).all()
    if not memberships:
        # Create a default business if none exists
        business = Business(
            id=f"biz_{uuid.uuid4().hex[:12]}",
            name="My Business",
            currency="INR",
            opening_cash_paise=1_000_000,
            safety_threshold_paise=500_000,
            owner_name=user.full_name,
            owner_email=user.email,
        )
        db.add(business)
        db.flush()
        membership = BusinessMembership(
            id=f"mem_{uuid.uuid4().hex[:12]}",
            user_id=user.id,
            business_id=business.id,
            role="owner",
        )
        db.add(membership)
        db.commit()
        memberships = [membership]

    all_businesses = []
    active_business = None
    for m in memberships:
        b = db.query(Business).filter(Business.id == m.business_id).first()
        if b:
            b_resp = _build_business_response(b)
            all_businesses.append(b_resp)
            if active_business is None:
                active_business = b_resp

    if not active_business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No business found for user")

    token = create_access_token(user_id=user.id, business_id=active_business.id)
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name),
        business=active_business,
        businesses=all_businesses,
    )

@router.get("/me")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(BusinessMembership).filter(BusinessMembership.user_id == user.id).all()
    all_businesses = []
    active_business = None
    for m in memberships:
        b = db.query(Business).filter(Business.id == m.business_id).first()
        if b:
            b_resp = _build_business_response(b)
            all_businesses.append(b_resp)
            if active_business is None:
                active_business = b_resp

    return {
        "user": UserResponse(id=user.id, email=user.email, full_name=user.full_name),
        "business": active_business,
        "businesses": all_businesses,
    }

@router.post("/switch-business/{business_id}", response_model=AuthResponse)
def switch_business(business_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(BusinessMembership).filter(
        BusinessMembership.user_id == user.id,
        BusinessMembership.business_id == business_id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this business")

    target_business = db.query(Business).filter(Business.id == business_id).first()
    if not target_business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    memberships = db.query(BusinessMembership).filter(BusinessMembership.user_id == user.id).all()
    all_businesses = []
    for m in memberships:
        b = db.query(Business).filter(Business.id == m.business_id).first()
        if b:
            all_businesses.append(_build_business_response(b))

    target_resp = _build_business_response(target_business)
    token = create_access_token(user_id=user.id, business_id=target_business.id)
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name),
        business=target_resp,
        businesses=all_businesses,
    )
