from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceBulkRequest,
    AttendanceResponse,
    AttendanceDailySummary,
)

router = APIRouter()


@router.get("", response_model=List[AttendanceResponse])
def get_attendance(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    status: Optional[AttendanceStatus] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
):
    """List attendance records with optional date and status filters."""
    query = db.query(AttendanceRecord)
    if date:
        query = query.filter(AttendanceRecord.date == date)
    if student_id:
        query = query.filter(AttendanceRecord.student_id == student_id)
    if status:
        query = query.filter(AttendanceRecord.status == status)

    return query.order_by(AttendanceRecord.date.desc(), AttendanceRecord.marked_time.desc()).all()


@router.get("/summary", response_model=AttendanceDailySummary)
def get_daily_summary(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    """Get high-level roll-call summary for a specific date."""
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    records = db.query(AttendanceRecord).filter(AttendanceRecord.date == target_date).all()

    present_count = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
    absent_count = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
    late_count = sum(1 for r in records if r.status == AttendanceStatus.LATE)
    leave_count = sum(1 for r in records if r.status == AttendanceStatus.ON_LEAVE)

    rate = 0.0
    if total_students > 0:
        rate = round((present_count / total_students) * 100, 1)

    return AttendanceDailySummary(
        date=target_date,
        total_students=total_students,
        present_count=present_count,
        absent_count=absent_count,
        late_count=late_count,
        leave_count=leave_count,
        attendance_rate=rate,
    )


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def mark_attendance(item: AttendanceCreate, db: Session = Depends(get_db)):
    """Mark attendance for an individual student."""
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == item.student_id,
        AttendanceRecord.date == item.date,
    ).first()

    if record:
        record.status = item.status
        if item.remarks:
            record.remarks = item.remarks
        record.marked_time = datetime.now(timezone.utc)
    else:
        record = AttendanceRecord(
            student_id=item.student_id,
            date=item.date,
            status=item.status,
            remarks=item.remarks,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record


@router.post("/bulk", status_code=status.HTTP_200_OK)
def mark_bulk_attendance(payload: AttendanceBulkRequest, db: Session = Depends(get_db)):
    """Mark daily attendance for multiple hostel residents in one batch."""
    for item in payload.records:
        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == item.student_id,
            AttendanceRecord.date == payload.date,
        ).first()

        if record:
            record.status = item.status
            if item.remarks:
                record.remarks = item.remarks
            record.marked_time = datetime.now(timezone.utc)
        else:
            record = AttendanceRecord(
                student_id=item.student_id,
                date=payload.date,
                status=item.status,
                remarks=item.remarks,
            )
            db.add(record)

    db.commit()
    return {"success": True, "message": f"Recorded attendance for {len(payload.records)} students."}
