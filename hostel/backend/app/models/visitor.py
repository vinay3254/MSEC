import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship as orm_relationship
from app.core.database import Base


class VisitorStatus(str, enum.Enum):
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    DENIED = "denied"


class VisitorRecord(Base):
    __tablename__ = "visitor_records"

    id = Column(Integer, primary_key=True, index=True)
    visitor_name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=False)
    relationship = Column(String(50), nullable=False)  # e.g., 'Parent', 'Sibling', 'Guardian', 'Friend'
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    purpose = Column(Text, nullable=False)
    id_proof_type = Column(String(50), default="Aadhar Card")
    id_proof_number = Column(String(50), nullable=True)
    entry_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    exit_time = Column(DateTime, nullable=True)
    status = Column(Enum(VisitorStatus), default=VisitorStatus.CHECKED_IN, nullable=False)
    remarks = Column(Text, nullable=True)

    student = orm_relationship("User")
