import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class AllocationStatus(str, enum.Enum):
    ACTIVE = "active"
    VACATED = "vacated"
    PENDING = "pending"


class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    bed_number = Column(String(10), nullable=False)  # e.g., 'Bed-A'
    academic_year = Column(String(20), nullable=False)  # e.g., '2025-2026'
    status = Column(Enum(AllocationStatus), default=AllocationStatus.ACTIVE)
    allocated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    vacated_at = Column(DateTime, nullable=True)

    student = relationship("User")
    room = relationship("Room", back_populates="allocations")
