import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class ComplaintCategory(str, enum.Enum):
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    CARPENTRY = "carpentry"
    CLEANLINESS = "cleanliness"
    WIFI = "wifi"
    MESS = "mess"
    OTHER = "other"


class ComplaintPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ComplaintStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Enum(ComplaintCategory), default=ComplaintCategory.OTHER, nullable=False)
    priority = Column(Enum(ComplaintPriority), default=ComplaintPriority.MEDIUM, nullable=False)
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.PENDING, nullable=False)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    student = relationship("User")
    room = relationship("Room")
