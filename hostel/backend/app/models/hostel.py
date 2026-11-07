import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class BlockGender(str, enum.Enum):
    BOYS = "boys"
    GIRLS = "girls"


class RoomType(str, enum.Enum):
    AC = "ac"
    NON_AC = "non_ac"


class RoomStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"


class HostelBlock(Base):
    __tablename__ = "hostel_blocks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., 'Kaveri Block', 'Bhavani Block'
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g., 'KB-1'
    gender = Column(Enum(BlockGender), nullable=False)
    total_floors = Column(Integer, default=4)
    warden_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    rooms = relationship("Room", back_populates="block", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("hostel_blocks.id", ondelete="CASCADE"), nullable=False)
    room_number = Column(String(20), nullable=False, index=True)  # e.g., '101'
    floor = Column(Integer, nullable=False)
    capacity = Column(Integer, default=4)
    occupied_count = Column(Integer, default=0)
    room_type = Column(Enum(RoomType), default=RoomType.NON_AC)
    status = Column(Enum(RoomStatus), default=RoomStatus.AVAILABLE)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    block = relationship("HostelBlock", back_populates="rooms")
    allocations = relationship("Allocation", back_populates="room")
