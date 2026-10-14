import uuid
from sqlalchemy import Column, String, BigInteger, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(String(64), primary_key=True, default=lambda: f"po_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    po_number = Column(String(100), nullable=True, index=True)
    supplier_id = Column(String(64), ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(64), nullable=True) # for single item legacy compatibility
    quantity = Column(Integer, nullable=True)
    total_paise = Column(BigInteger, default=0, nullable=False)
    advance_paid_paise = Column(BigInteger, default=0, nullable=False)
    status = Column(String(50), default="draft", nullable=False)
    order_date = Column(String(50), nullable=False)
    expected_delivery_date = Column(String(50), nullable=False)
    payment_terms_days = Column(Integer, nullable=True)
    payment_due_date = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    received_quantity = Column(Integer, default=0, nullable=False)
    created_at = Column(String(50), nullable=True)
    updated_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="purchase_orders")
    supplier = relationship("Supplier", back_populates="purchase_orders")
    line_items = relationship("PurchaseOrderLineItem", back_populates="purchase_order", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="purchase_order")

class PurchaseOrderLineItem(Base):
    __tablename__ = "purchase_order_line_items"

    id = Column(String(64), primary_key=True, default=lambda: f"poli_{uuid.uuid4().hex[:12]}")
    purchase_order_id = Column(String(64), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    unit_price_paise = Column(BigInteger, nullable=False)
    total_paise = Column(BigInteger, nullable=False)
    received_quantity = Column(Integer, default=0, nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="line_items")
    product = relationship("Product")

class CustomerOrder(Base):
    __tablename__ = "customer_orders"

    id = Column(String(64), primary_key=True, default=lambda: f"co_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    total_paise = Column(BigInteger, default=0, nullable=False)
    status = Column(String(50), default="quote", nullable=False)
    order_date = Column(String(50), nullable=False)
    delivery_date = Column(String(50), nullable=True)
    created_at = Column(String(50), nullable=True)
    updated_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="customer_orders")
    customer = relationship("Customer", back_populates="orders")
    product = relationship("Product")
    invoices = relationship("Invoice", back_populates="customer_order")
