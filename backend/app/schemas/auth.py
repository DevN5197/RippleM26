import re
from pydantic import BaseModel, Field, field_validator
from app.services.sanitization import sanitize_string

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class RegisterRequest(BaseModel):
    email: str = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=72, description="Password must be between 8 and 72 characters")
    full_name: str = Field(..., min_length=1, max_length=100)
    business_name: str | None = Field(default="My Business", max_length=100)

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
    def sanitize_business_name(cls, v: str | None) -> str | None:
        if v is not None:
            cleaned = sanitize_string(v)
            return cleaned or "My Business"
        return "My Business"

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str

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
