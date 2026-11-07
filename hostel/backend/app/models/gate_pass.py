import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class PassStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED = "returned"


class GatePass(Base):
    __tablename__ = "gate_passes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    destination = Column(String(200), nullable=False)
    reason = Column(Text, nullable=False)
    departure_time = Column(DateTime, nullable=False)
    expected_return_time = Column(DateTime, nullable=False)
    actual_return_time = Column(DateTime, nullable=True)
    status = Column(Enum(PassStatus), default=PassStatus.PENDING, nullable=False)
    approved_by = Column(String(100), nullable=True)
    parent_consent = Column(String(50), default="Verified")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("User")
