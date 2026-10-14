import uuid
from sqlalchemy import Column, String, BigInteger, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String(64), primary_key=True, default=lambda: f"sup_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    contact_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    tax_id = Column(String(100), nullable=True)
    payment_terms_days = Column(Integer, default=30, nullable=False)
    outstanding_paise = Column(BigInteger, default=0, nullable=False)
    reliability_score = Column(Integer, default=80, nullable=False)
    status = Column(String(20), default="active", nullable=False) # "active" | "archived"
    lead_time_days = Column(Integer, default=7, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(String(50), nullable=True)
    updated_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="suppliers")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
    invoices = relationship("Invoice", back_populates="supplier")
