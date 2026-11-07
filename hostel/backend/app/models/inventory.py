import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime
from app.core.database import Base


class ItemCategory(str, enum.Enum):
    FURNITURE = "furniture"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    FACILITY = "facility"
    SUPPLIES = "supplies"


class ItemCondition(str, enum.Enum):
    GOOD = "good"
    NEEDS_REPAIR = "needs_repair"
    DAMAGED = "damaged"
    NEW = "new"


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(150), nullable=False)
    category = Column(Enum(ItemCategory), default=ItemCategory.FURNITURE, nullable=False)
    block_id = Column(Integer, ForeignKey("hostel_blocks.id", ondelete="SET NULL"), nullable=True)
    room_number = Column(String(50), nullable=True)  # Room 101, Common Hall, Mess Hall...
    quantity = Column(Integer, default=1, nullable=False)
    condition = Column(Enum(ItemCondition), default=ItemCondition.GOOD, nullable=False)
    last_inspected = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    remarks = Column(Text, nullable=True)
