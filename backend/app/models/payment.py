import uuid
from sqlalchemy import Column, String, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(64), primary_key=True, default=lambda: f"pay_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    direction = Column(String(20), nullable=False) # "incoming" | "outgoing"
    invoice_id = Column(String(64), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    purchase_order_id = Column(String(64), ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True)
    supplier_id = Column(String(64), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    amount_paise = Column(BigInteger, default=0, nullable=False)
    status = Column(String(50), default="completed", nullable=False) # "scheduled" | "completed" | "failed" | "cancelled"
    scheduled_date = Column(String(50), nullable=False)
    completed_date = Column(String(50), nullable=True)
    method = Column(String(100), default="Bank Transfer", nullable=True)
    created_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payments")
