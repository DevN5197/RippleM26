import uuid
from sqlalchemy import Column, String, BigInteger, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(64), primary_key=True, default=lambda: f"invc_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_number = Column(String(100), nullable=False, index=True)
    type = Column(String(20), default="receivable", nullable=False) # "receivable" | "payable"
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_order_id = Column(String(64), ForeignKey("customer_orders.id", ondelete="SET NULL"), nullable=True)
    supplier_id = Column(String(64), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True)
    purchase_order_id = Column(String(64), ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True)
    amount_paise = Column(BigInteger, default=0, nullable=False)
    amount_paid_paise = Column(BigInteger, default=0, nullable=False)
    status = Column(String(50), default="sent", nullable=False) # "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void" | "cancelled"
    issue_date = Column(String(50), nullable=False)
    due_date = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(String(50), nullable=True)
    updated_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    customer_order = relationship("CustomerOrder", back_populates="invoices")
    supplier = relationship("Supplier", back_populates="invoices")
    purchase_order = relationship("PurchaseOrder", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")
