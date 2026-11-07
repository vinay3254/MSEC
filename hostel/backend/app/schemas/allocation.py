from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.allocation import AllocationStatus
from app.schemas.user import UserResponse
from app.schemas.hostel import RoomResponse


class AllocationBase(BaseModel):
    student_id: int
    room_id: int
    bed_number: str
    academic_year: str = "2025-2026"
    status: AllocationStatus = AllocationStatus.ACTIVE


class AllocationCreate(AllocationBase):
    pass


class AllocationTransfer(BaseModel):
    new_room_id: int
    new_bed_number: str
    remarks: Optional[str] = "Room transfer requested"


class AllocationResponse(AllocationBase):
    id: int
    allocated_at: datetime
    vacated_at: Optional[datetime] = None
    student: Optional[UserResponse] = None
    room: Optional[RoomResponse] = None

    model_config = ConfigDict(from_attributes=True)
