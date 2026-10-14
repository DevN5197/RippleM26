from datetime import datetime
import uuid
from sqlalchemy import Column, String, BigInteger, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(String(64), primary_key=True, default=lambda: f"biz_{uuid.uuid4().hex[:12]}")
    name = Column(String(255), nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    opening_cash_paise = Column(BigInteger, default=1_000_000, nullable=False)
    safety_threshold_paise = Column(BigInteger, default=500_000, nullable=False)
    industry = Column(String(100), nullable=True)
    owner_name = Column(String(255), nullable=True)
    owner_email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    tax_rate_percent = Column(Integer, default=18, nullable=False)
    default_supplier_payment_terms_days = Column(Integer, default=30, nullable=False)
    default_customer_payment_terms_days = Column(Integer, default=15, nullable=False)
    default_forecast_horizon_days = Column(Integer, default=30, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    memberships = relationship("BusinessMembership", back_populates="business", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="business", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="business", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="business", cascade="all, delete-orphan")
    customer_orders = relationship("CustomerOrder", back_populates="business", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="business", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="business", cascade="all, delete-orphan")
    cash_flow_events = relationship("CashFlowEvent", back_populates="business", cascade="all, delete-orphan")
    simulation_scenarios = relationship("SimulationScenario", back_populates="business", cascade="all, delete-orphan")
    settings = relationship("AppSettingsModel", back_populates="business", uselist=False, cascade="all, delete-orphan")

class BusinessMembership(Base):
    __tablename__ = "business_memberships"

    id = Column(String(64), primary_key=True, default=lambda: f"mem_{uuid.uuid4().hex[:12]}")
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="owner", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="memberships")
    business = relationship("Business", back_populates="memberships")
