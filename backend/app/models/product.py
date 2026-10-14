import uuid
from sqlalchemy import Column, String, BigInteger, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True, default=lambda: f"prod_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    unit_cost_paise = Column(BigInteger, default=0, nullable=False)
    unit_price_paise = Column(BigInteger, default=0, nullable=False)
    reorder_point = Column(Integer, default=10, nullable=False)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    unit_of_measure = Column(String(50), nullable=True)
    preferred_supplier_id = Column(String(64), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    currency = Column(String(3), default="INR", nullable=False)
    created_at = Column(String(50), nullable=True)
    updated_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="products")
    preferred_supplier = relationship("Supplier")
    inventory = relationship("InventoryItem", back_populates="product", uselist=False, cascade="all, delete-orphan")
    movements = relationship("InventoryMovement", back_populates="product", cascade="all, delete-orphan")
