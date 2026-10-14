import uuid
from sqlalchemy import Column, String, BigInteger, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class CashFlowEvent(Base):
    __tablename__ = "cash_flow_events"

    id = Column(String(64), primary_key=True, default=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False) # "supplier_payment" | "customer_payment" | "payroll" | "rent" | "tax" | "other"
    label = Column(String(255), nullable=False)
    direction = Column(String(20), nullable=False) # "incoming" | "outgoing"
    amount_paise = Column(BigInteger, default=0, nullable=False)
    date = Column(String(50), nullable=False, index=True)
    related_invoice_id = Column(String(64), nullable=True)
    related_purchase_order_id = Column(String(64), nullable=True)
    is_projected = Column(Boolean, default=False, nullable=False)
    counterparty_name = Column(String(255), nullable=True)
    status = Column(String(50), default="completed", nullable=False) # "completed" | "scheduled" | "overdue" | "projected"
    risk_note = Column(Text, nullable=True)
    created_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="cash_flow_events")
