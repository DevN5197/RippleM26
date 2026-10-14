import uuid
from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(String(64), primary_key=True, default=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    quantity_on_hand = Column(Integer, default=0, nullable=False)
    quantity_reserved = Column(Integer, default=0, nullable=False)
    quantity_on_order = Column(Integer, default=0, nullable=False)
    expected_restock_date = Column(String(50), nullable=True)
    updated_at = Column(String(50), nullable=True)

    product = relationship("Product", back_populates="inventory")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(String(64), primary_key=True, default=lambda: f"mov_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False) # "receipt" | "sale" | "reservation" | "reservation_release" | "adjustment" | "return"
    quantity = Column(Integer, nullable=False)
    resulting_balance = Column(Integer, nullable=False)
    date = Column(String(50), nullable=False)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(String(100), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(String(50), nullable=True)

    product = relationship("Product", back_populates="movements")
