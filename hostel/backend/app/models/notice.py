import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime
from app.core.database import Base


class NoticePriority(str, enum.Enum):
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), default="General")  # General, Mess, Maintenance, Outing, Security
    priority = Column(Enum(NoticePriority), default=NoticePriority.NORMAL, nullable=False)
    posted_by = Column(String(100), default="Hostel Warden")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
