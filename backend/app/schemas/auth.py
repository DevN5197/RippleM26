from pydantic import BaseModel

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    business_name: str | None = "My Business"

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
