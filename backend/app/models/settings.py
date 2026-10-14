import uuid
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class AppSettingsModel(Base):
    __tablename__ = "app_settings"

    id = Column(String(64), primary_key=True, default=lambda: f"set_{uuid.uuid4().hex[:12]}")
    business_id = Column(String(64), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    notification_preferences_json = Column(Text, nullable=True)
    app_preferences_json = Column(Text, nullable=True)
    updated_at = Column(String(50), nullable=True)

    business = relationship("Business", back_populates="settings")
