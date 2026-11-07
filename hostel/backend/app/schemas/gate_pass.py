from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.gate_pass import PassStatus
from app.schemas.user import UserResponse


class GatePassBase(BaseModel):
    destination: str
    reason: str
    departure_time: datetime
    expected_return_time: datetime


class GatePassCreate(GatePassBase):
    pass


class GatePassUpdateStatus(BaseModel):
    status: PassStatus
    remarks: Optional[str] = None
    actual_return_time: Optional[datetime] = None


class GatePassResponse(GatePassBase):
    id: int
    student_id: int
    actual_return_time: Optional[datetime] = None
    status: PassStatus
    approved_by: Optional[str] = None
    parent_consent: str
    remarks: Optional[str] = None
    created_at: datetime
    student: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
