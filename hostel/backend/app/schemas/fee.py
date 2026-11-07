from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.fee import FeeType, PaymentStatus
from app.schemas.user import UserResponse


class FeeBase(BaseModel):
    student_id: int
    academic_year: str = "2025-2026"
    fee_type: FeeType = FeeType.HOSTEL_FEE
    total_amount: float
    due_date: datetime


class FeeCreate(FeeBase):
    pass


class FeeUpdatePayment(BaseModel):
    paid_amount: float
    transaction_ref: Optional[str] = None
    status: Optional[PaymentStatus] = None


class FeeResponse(FeeBase):
    id: int
    paid_amount: float
    status: PaymentStatus
    transaction_ref: Optional[str] = None
    created_at: datetime
    student: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
