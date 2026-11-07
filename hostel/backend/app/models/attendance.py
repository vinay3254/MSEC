import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    ON_LEAVE = "on_leave"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), index=True, nullable=False)  # YYYY-MM-DD
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    marked_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    remarks = Column(String(255), nullable=True)

    student = relationship("User")
