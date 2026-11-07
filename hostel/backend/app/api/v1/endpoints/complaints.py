from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.complaint import Complaint, ComplaintStatus, ComplaintCategory
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintResponse

router = APIRouter()


@router.get("", response_model=List[ComplaintResponse])
def get_complaints(
    status: Optional[ComplaintStatus] = Query(None, description="Filter by status"),
    category: Optional[ComplaintCategory] = Query(None, description="Filter by category"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    db: Session = Depends(get_db),
):
    """List complaints with optional filters."""
    query = db.query(Complaint)
    if status:
        query = query.filter(Complaint.status == status)
    if category:
        query = query.filter(Complaint.category == category)
    if student_id:
        query = query.filter(Complaint.student_id == student_id)

    return query.order_by(Complaint.created_at.desc()).all()


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def file_complaint(
    complaint_in: ComplaintCreate,
    student_id: int = Query(..., description="Student filing the complaint"),
    db: Session = Depends(get_db),
):
    """File a new hostel complaint."""
    complaint = Complaint(
        student_id=student_id,
        room_id=complaint_in.room_id,
        title=complaint_in.title,
        description=complaint_in.description,
        category=complaint_in.category,
        priority=complaint_in.priority,
        status=ComplaintStatus.PENDING,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.patch("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(
    complaint_id: int,
    complaint_in: ComplaintUpdate,
    db: Session = Depends(get_db),
):
    """Update complaint status or resolution notes."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if complaint_in.status:
        complaint.status = complaint_in.status
        if complaint_in.status == ComplaintStatus.RESOLVED:
            complaint.resolved_at = datetime.now(timezone.utc)
    if complaint_in.priority:
        complaint.priority = complaint_in.priority
    if complaint_in.resolution_notes is not None:
        complaint.resolution_notes = complaint_in.resolution_notes

    db.commit()
    db.refresh(complaint)
    return complaint
