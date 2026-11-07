from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.attendance import AttendanceStatus
from app.schemas.user import UserResponse


class AttendanceBase(BaseModel):
    student_id: int
    date: str  # YYYY-MM-DD
    status: AttendanceStatus = AttendanceStatus.PRESENT
    remarks: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceBulkItem(BaseModel):
    student_id: int
    status: AttendanceStatus
    remarks: Optional[str] = None


class AttendanceBulkRequest(BaseModel):
    date: str
    records: List[AttendanceBulkItem]


class AttendanceResponse(AttendanceBase):
    id: int
    marked_time: datetime
    student: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceDailySummary(BaseModel):
    date: str
    total_students: int
    present_count: int
    absent_count: int
    late_count: int
    leave_count: int
    attendance_rate: float
