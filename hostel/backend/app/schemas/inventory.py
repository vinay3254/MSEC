from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.inventory import ItemCategory, ItemCondition


class InventoryBase(BaseModel):
    item_name: str
    category: ItemCategory = ItemCategory.FURNITURE
    block_id: Optional[int] = None
    room_number: Optional[str] = None
    quantity: int = 1
    condition: ItemCondition = ItemCondition.GOOD
    remarks: Optional[str] = None


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    quantity: Optional[int] = None
    condition: Optional[ItemCondition] = None
    room_number: Optional[str] = None
    remarks: Optional[str] = None


class InventoryResponse(InventoryBase):
    id: int
    last_inspected: datetime

    model_config = ConfigDict(from_attributes=True)
