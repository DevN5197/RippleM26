import re
from typing import Literal
from pydantic import BaseModel, Field, field_validator
from app.services.sanitization import sanitize_string

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class RegisterRequest(BaseModel):
    email: str = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=72, description="Password must be between 8 and 72 characters")
    full_name: str = Field(..., min_length=1, max_length=100)
    business_name: str = Field(..., min_length=2, max_length=100, description="Registered business or trading name")
    phone_number: str = Field(..., min_length=7, max_length=20, description="E.164 phone number for WhatsApp verification, e.g. +919876543210")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned) or "@" not in cleaned or "." not in cleaned.split("@")[-1]:
            raise ValueError("Invalid email format. Please provide a valid email address.")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if len(v) > 72:
            raise ValueError("Password cannot exceed 72 characters.")
        return v

    @field_validator("full_name")
    @classmethod
    def sanitize_full_name(cls, v: str) -> str:
        cleaned = sanitize_string(v)
        if not cleaned:
            raise ValueError("Full name cannot be empty.")
        return cleaned

    @field_validator("business_name")
    @classmethod
    def sanitize_business_name(cls, v: str) -> str:
        cleaned = sanitize_string(v) if v else ""
        if not cleaned or len(cleaned) < 2:
            raise ValueError("Business name is required (minimum 2 characters).")
        return cleaned

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Phone number is required for WhatsApp OTP verification.")
        cleaned = re.sub(r"[\s\-\(\)]", "", v.strip())
        if not re.match(r"^\+?[1-9]\d{6,14}$", cleaned):
            raise ValueError("Invalid phone number format. Must follow standard E.164 format (e.g. +919876543210).")
        return cleaned if cleaned.startswith("+") else f"+{cleaned}"

class LoginRequest(BaseModel):
    email: str
    password: str

class VerifyOtpRequest(BaseModel):
    email: str = Field(..., description="Registered account email")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    channel: Literal["email", "phone"] = "email"

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned) or "@" not in cleaned or "." not in cleaned.split("@")[-1]:
            raise ValueError("Invalid email format.")
        return cleaned

    @field_validator("otp")
    @classmethod
    def validate_otp_code(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise ValueError("OTP must be exactly 6 digits.")
        return cleaned

class ResendOtpRequest(BaseModel):
    email: str = Field(..., description="Registered account email")
    channel: Literal["email", "phone"] = "email"

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned) or "@" not in cleaned or "." not in cleaned.split("@")[-1]:
            raise ValueError("Invalid email format.")
        return cleaned

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone_number: str | None = None
    is_email_verified: bool = False
    is_phone_verified: bool = False
    emergency_dispatch_unlocked: bool = False

    class Config:
        from_attributes = True

class BusinessResponse(BaseModel):
    id: str
    name: str
    currency: str
    openingCashPaise: int
    safetyThresholdPaise: int
    industry: str | None = None
    ownerName: str | None = None
    ownerEmail: str | None = None
    phone: str | None = None
    address: str | None = None
    taxRatePercent: int | None = 18
    defaultSupplierPaymentTermsDays: int | None = 30
    defaultCustomerPaymentTermsDays: int | None = 15
    defaultForecastHorizonDays: int | None = 30

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    business: BusinessResponse
    businesses: list[BusinessResponse] = []
    requires_verification: bool = False
    is_email_verified: bool = False
    is_phone_verified: bool = False

class VerifyOtpResponse(BaseModel):
    success: bool
    message: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    business: BusinessResponse
    is_email_verified: bool
    is_phone_verified: bool
    emergency_dispatch_unlocked: bool

