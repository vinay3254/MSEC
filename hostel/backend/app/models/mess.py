import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class MealType(str, enum.Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    SNACKS = "snacks"
    DINNER = "dinner"


class MessMenu(Base):
    __tablename__ = "mess_menus"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(String(15), nullable=False, index=True)  # Monday, Tuesday...
    meal_type = Column(Enum(MealType), nullable=False)
    items = Column(Text, nullable=False)  # comma separated or description
    timings = Column(String(50), nullable=False)  # e.g., '07:30 AM - 09:00 AM'
    is_special = Column(Boolean, default=False)


class MessFeedback(Base):
    __tablename__ = "mess_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    meal_type = Column(Enum(MealType), nullable=False)
    rating = Column(Integer, nullable=False)  # 1 to 5
    category = Column(String(50), default="quality")  # quality, cleanliness, quantity, timings, other
    comments = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("User")
