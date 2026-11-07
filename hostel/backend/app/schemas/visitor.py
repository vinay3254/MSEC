from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.visitor import VisitorStatus
from app.schemas.user import UserResponse


class VisitorBase(BaseModel):
    visitor_name: str
    phone: str
    relationship: str
    student_id: int
    purpose: str
    id_proof_type: str = "Aadhar Card"
    id_proof_number: Optional[str] = None
    remarks: Optional[str] = None


class VisitorCreate(VisitorBase):
    pass


class VisitorUpdate(BaseModel):
    exit_time: Optional[datetime] = None
    status: Optional[VisitorStatus] = None
    remarks: Optional[str] = None


class VisitorResponse(VisitorBase):
    id: int
    entry_time: datetime
    exit_time: Optional[datetime] = None
    status: VisitorStatus
    student: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
