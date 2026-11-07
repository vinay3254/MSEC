import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text
from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    WARDEN = "warden"
    STUDENT = "student"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    phone = Column(String(20), nullable=True)
    register_number = Column(String(50), unique=True, index=True, nullable=True)
    department = Column(String(100), nullable=True)
    year_of_study = Column(Integer, nullable=True)
    
    # Extended Student Profile Info
    parent_name = Column(String(150), nullable=True)
    parent_phone = Column(String(20), nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    address = Column(Text, nullable=True)
    admission_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
