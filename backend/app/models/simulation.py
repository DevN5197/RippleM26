import uuid
from sqlalchemy import Column, String, Float, Text, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.database import Base

class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"

    id = Column(String(64), primary_key=True, default=lambda: f"scn_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_event_id = Column(String(64), nullable=True)
    change_type = Column(String(50), nullable=True) # "delay_payment" | "advance_payment" | "cancel_order" | "price_change"
    change_magnitude = Column(Float, nullable=True)
    controls_json = Column(Text, nullable=True) # JSON string of SimulatorControls
    result_json = Column(Text, nullable=True)   # JSON string of SimulatorResult
    created_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="simulation_scenarios")

class DependencyEdge(Base):
    __tablename__ = "dependency_edges"

    id = Column(String(64), primary_key=True, default=lambda: f"dep_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(64), nullable=False)
    source_type = Column(String(50), nullable=False)
    target_id = Column(String(64), nullable=False)
    target_type = Column(String(50), nullable=False)
    label = Column(String(255), nullable=False)
    lag_days = Column(Integer, default=0, nullable=False)
