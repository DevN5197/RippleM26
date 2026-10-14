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

class ScenarioRescue(Base):
    __tablename__ = "simulation_rescues"

    id = Column(String(64), primary_key=True, default=lambda: f"res_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    scenario_id = Column(String(64), nullable=True)
    rescue_type = Column(String(50), nullable=False) # "auto_phase" | "split_escrow"
    status = Column(String(20), default="active", nullable=False) # "active" | "reverted"
    target_supplier_id = Column(String(64), nullable=True)
    target_customer_id = Column(String(64), nullable=True)
    parent_order_id = Column(String(64), nullable=True)
    batch1_amount_paise = Column(Integer, nullable=True)
    batch1_date = Column(String(50), nullable=True)
    batch2_amount_paise = Column(Integer, nullable=True)
    batch2_date = Column(String(50), nullable=True)
    float_fee_paise = Column(Integer, nullable=True)
    net_proceeds_paise = Column(Integer, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(String(50), nullable=True)

class ScenarioStressTest(Base):
    __tablename__ = "simulation_stress_tests"

    id = Column(String(64), primary_key=True, default=lambda: f"stress_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    scenario_id = Column(String(64), nullable=True)
    baseline_min_paise = Column(Integer, nullable=False)
    stressed_min_paise = Column(Integer, nullable=False)
    additional_shortfall_paise = Column(Integer, nullable=False)
    most_fragile_node_id = Column(String(64), nullable=False)
    most_fragile_multiplier = Column(Float, nullable=False)
    created_at = Column(String(50), nullable=True)
