from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.complaint import ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.schemas.user import UserResponse


class ComplaintBase(BaseModel):
    title: str
    description: str
    category: ComplaintCategory = ComplaintCategory.OTHER
    priority: ComplaintPriority = ComplaintPriority.MEDIUM


class ComplaintCreate(ComplaintBase):
    room_id: Optional[int] = None


class ComplaintUpdate(BaseModel):
    status: Optional[ComplaintStatus] = None
    priority: Optional[ComplaintPriority] = None
    resolution_notes: Optional[str] = None


class ComplaintResponse(ComplaintBase):
    id: int
    student_id: int
    room_id: Optional[int] = None
    status: ComplaintStatus
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    student: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
