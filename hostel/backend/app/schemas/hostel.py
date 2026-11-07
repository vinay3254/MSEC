from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.hostel import BlockGender, RoomType, RoomStatus


class HostelBlockBase(BaseModel):
    name: str
    code: str
    gender: BlockGender
    total_floors: int = 4
    warden_name: Optional[str] = None


class HostelBlockCreate(HostelBlockBase):
    pass


class HostelBlockResponse(HostelBlockBase):
    id: int
    created_at: datetime
    total_rooms: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class RoomBase(BaseModel):
    block_id: int
    room_number: str
    floor: int
    capacity: int = 4
    room_type: RoomType = RoomType.NON_AC
    status: RoomStatus = RoomStatus.AVAILABLE


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    capacity: Optional[int] = None
    room_type: Optional[RoomType] = None
    status: Optional[RoomStatus] = None


class RoomResponse(RoomBase):
    id: int
    occupied_count: int
    created_at: datetime
    block_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
