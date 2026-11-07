import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class FeeType(str, enum.Enum):
    HOSTEL_FEE = "hostel_fee"
    MESS_FEE = "mess_fee"
    AMENITIES = "amenities"
    CAUTION_DEPOSIT = "caution_deposit"


class PaymentStatus(str, enum.Enum):
    PAID = "paid"
    PENDING = "pending"
    OVERDUE = "overdue"


class FeeRecord(Base):
    __tablename__ = "fee_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(String(20), nullable=False)
    fee_type = Column(Enum(FeeType), default=FeeType.HOSTEL_FEE, nullable=False)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    due_date = Column(DateTime, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    transaction_ref = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("User")
