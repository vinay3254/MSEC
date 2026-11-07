from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.visitor import VisitorRecord, VisitorStatus
from app.models.user import User, UserRole
from app.schemas.visitor import VisitorCreate, VisitorUpdate, VisitorResponse

router = APIRouter()


@router.get("", response_model=List[VisitorResponse])
def get_visitors(
    status: Optional[VisitorStatus] = Query(None, description="Filter by status"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    db: Session = Depends(get_db),
):
    """List visitor entries with optional filters."""
    query = db.query(VisitorRecord)
    if status:
        query = query.filter(VisitorRecord.status == status)
    if student_id:
        query = query.filter(VisitorRecord.student_id == student_id)

    return query.order_by(VisitorRecord.entry_time.desc()).all()


@router.post("", response_model=VisitorResponse, status_code=status.HTTP_201_CREATED)
def log_visitor_entry(visitor_in: VisitorCreate, db: Session = Depends(get_db)):
    """Log a new visitor entry for a resident student."""
    student = db.query(User).filter(User.id == visitor_in.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    record = VisitorRecord(
        visitor_name=visitor_in.visitor_name,
        phone=visitor_in.phone,
        relationship=visitor_in.relationship,
        student_id=visitor_in.student_id,
        purpose=visitor_in.purpose,
        id_proof_type=visitor_in.id_proof_type,
        id_proof_number=visitor_in.id_proof_number,
        status=VisitorStatus.CHECKED_IN,
        remarks=visitor_in.remarks,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{visitor_id}/exit", response_model=VisitorResponse)
def log_visitor_exit(
    visitor_id: int,
    remarks: Optional[str] = Query(None, description="Optional checkout remarks"),
    db: Session = Depends(get_db),
):
    """Record visitor departure time and mark as checked-out."""
    record = db.query(VisitorRecord).filter(VisitorRecord.id == visitor_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Visitor entry not found")

    record.exit_time = datetime.now(timezone.utc)
    record.status = VisitorStatus.CHECKED_OUT
    if remarks:
        record.remarks = remarks

    db.commit()
    db.refresh(record)
    return record
