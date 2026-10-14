import uuid
from sqlalchemy import Column, String, BigInteger, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(64), primary_key=True, default=lambda: f"cus_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    contact_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    tax_id = Column(String(100), nullable=True)
    credit_terms_days = Column(Integer, default=15, nullable=False)
    outstanding_paise = Column(BigInteger, default=0, nullable=False)
    status = Column(String(20), default="active", nullable=False) # "active" | "archived"
    notes = Column(Text, nullable=True)
    created_at = Column(String(50), nullable=True)
    updated_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="customers")
    orders = relationship("CustomerOrder", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")
