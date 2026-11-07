from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fee import FeeRecord, PaymentStatus, FeeType
from app.schemas.fee import FeeCreate, FeeUpdatePayment, FeeResponse

router = APIRouter()


@router.get("", response_model=List[FeeResponse])
def get_fees(
    status: Optional[PaymentStatus] = Query(None, description="Filter by payment status"),
    fee_type: Optional[FeeType] = Query(None, description="Filter by fee type"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    db: Session = Depends(get_db),
):
    """List fee dues and payment records."""
    query = db.query(FeeRecord)
    if status:
        query = query.filter(FeeRecord.status == status)
    if fee_type:
        query = query.filter(FeeRecord.fee_type == fee_type)
    if student_id:
        query = query.filter(FeeRecord.student_id == student_id)

    return query.order_by(FeeRecord.due_date.asc()).all()


@router.post("", response_model=FeeResponse, status_code=status.HTTP_201_CREATED)
def create_fee_record(fee_in: FeeCreate, db: Session = Depends(get_db)):
    """Create a new fee record for a student."""
    fee = FeeRecord(
        student_id=fee_in.student_id,
        academic_year=fee_in.academic_year,
        fee_type=fee_in.fee_type,
        total_amount=fee_in.total_amount,
        paid_amount=0.0,
        due_date=fee_in.due_date,
        status=PaymentStatus.PENDING,
    )
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return fee


@router.post("/{fee_id}/pay", response_model=FeeResponse)
def record_payment(
    fee_id: int,
    payment_in: FeeUpdatePayment,
    db: Session = Depends(get_db),
):
    """Record payment towards a fee record."""
    fee = db.query(FeeRecord).filter(FeeRecord.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found")

    fee.paid_amount += payment_in.paid_amount
    if payment_in.transaction_ref:
        fee.transaction_ref = payment_in.transaction_ref

    if fee.paid_amount >= fee.total_amount:
        fee.status = PaymentStatus.PAID
    elif payment_in.status:
        fee.status = payment_in.status

    db.commit()
    db.refresh(fee)
    return fee
