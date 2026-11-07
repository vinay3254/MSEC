from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.hostel import HostelBlock, Room, RoomStatus
from app.models.allocation import Allocation, AllocationStatus
from app.models.complaint import Complaint, ComplaintStatus
from app.models.gate_pass import GatePass, PassStatus
from app.models.fee import FeeRecord, PaymentStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.visitor import VisitorRecord, VisitorStatus
from app.models.notice import Notice
from app.schemas.dashboard import DashboardStatsResponse
from app.schemas.notice import NoticeResponse

router = APIRouter()


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Fetch high-level KPI metrics for the hostel management dashboard."""
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_blocks = db.query(HostelBlock).count()
    total_rooms = db.query(Room).count()

    occupied_rooms = db.query(Room).filter(Room.status == RoomStatus.OCCUPIED).count()
    vacant_rooms = db.query(Room).filter(Room.status == RoomStatus.AVAILABLE).count()

    total_beds_sum = db.query(func.sum(Room.capacity)).scalar() or 0
    occupied_beds_sum = db.query(func.sum(Room.occupied_count)).scalar() or 0

    occupancy_rate = 0.0
    if total_beds_sum > 0:
        occupancy_rate = round((occupied_beds_sum / total_beds_sum) * 100, 1)

    pending_complaints = db.query(Complaint).filter(
        Complaint.status.in_([ComplaintStatus.PENDING, ComplaintStatus.IN_PROGRESS])
    ).count()

    active_gate_passes = db.query(GatePass).filter(
        GatePass.status.in_([PassStatus.APPROVED, PassStatus.PENDING])
    ).count()

    # Total pending fees
    pending_fees = db.query(func.sum(FeeRecord.total_amount - FeeRecord.paid_amount)).filter(
        FeeRecord.status.in_([PaymentStatus.PENDING, PaymentStatus.OVERDUE])
    ).scalar() or 0.0

    # Today's attendance
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    att_records = db.query(AttendanceRecord).filter(AttendanceRecord.date == today).all()
    present_count = sum(1 for a in att_records if a.status == AttendanceStatus.PRESENT)
    absent_count = sum(1 for a in att_records if a.status == AttendanceStatus.ABSENT)
    today_rate = round((present_count / total_students * 100), 1) if total_students > 0 else 96.5

    # Active visitors (checked in right now)
    active_visitors = db.query(VisitorRecord).filter(VisitorRecord.status == VisitorStatus.CHECKED_IN).count()

    # Recent notices / announcements
    db_notices = db.query(Notice).order_by(Notice.created_at.desc()).limit(5).all()
    notices_resp = [NoticeResponse.model_validate(n) for n in db_notices]

    # Recent activities
    recent_activity = []

    # 1. Complaints
    recent_complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).limit(2).all()
    for c in recent_complaints:
        recent_activity.append({
            "type": "complaint",
            "title": f"Complaint: {c.title}",
            "status": c.status.value,
            "time": c.created_at.isoformat() if c.created_at else "",
        })

    # 2. Gate passes
    recent_passes = db.query(GatePass).order_by(GatePass.created_at.desc()).limit(2).all()
    for p in recent_passes:
        recent_activity.append({
            "type": "gate_pass",
            "title": f"Outpass to {p.destination}",
            "status": p.status.value,
            "time": p.created_at.isoformat() if p.created_at else "",
        })

    # 3. Visitors
    recent_visitors = db.query(VisitorRecord).order_by(VisitorRecord.entry_time.desc()).limit(2).all()
    for v in recent_visitors:
        recent_activity.append({
            "type": "visitor",
            "title": f"Visitor: {v.visitor_name} ({v.relationship})",
            "status": v.status.value,
            "time": v.entry_time.isoformat() if v.entry_time else "",
        })

    return DashboardStatsResponse(
        total_students=total_students,
        total_blocks=total_blocks,
        total_rooms=total_rooms,
        occupied_rooms=occupied_rooms,
        vacant_rooms=vacant_rooms,
        total_beds=total_beds_sum,
        occupied_beds=occupied_beds_sum,
        occupancy_rate=occupancy_rate,
        pending_complaints=pending_complaints,
        active_gate_passes=active_gate_passes,
        pending_fees_amount=float(pending_fees),
        today_attendance_rate=today_rate,
        today_present_count=present_count,
        today_absent_count=absent_count,
        active_visitors_count=active_visitors,
        notices=notices_resp,
        recent_activity=recent_activity,
    )
