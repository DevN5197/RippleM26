import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.business import Business, BusinessMembership
from app.models.settings import AppSettingsModel
from app.services.auth import hash_password, verify_password, create_access_token
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

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    user = User(
        id=user_id,
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
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

    token = create_access_token(user_id=user.id, business_id=business.id)
    b_resp = _build_business_response(business)

    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name),
        business=b_resp,
        businesses=[b_resp],
    )

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

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
