from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.hostel import HostelBlock, Room, RoomStatus
from app.models.allocation import Allocation, AllocationStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.fee import FeeRecord, PaymentStatus
from app.models.complaint import Complaint, ComplaintStatus
from app.models.inventory import InventoryItem, ItemCondition

router = APIRouter()


@router.get("/summary")
def get_operational_reports_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Generate consolidated analytics reports on occupancy, attendance, fees, complaints, and inventory."""
    # 1. Occupancy
    total_rooms = db.query(Room).count()
    occupied_rooms = db.query(Room).filter(Room.status == RoomStatus.OCCUPIED).count()
    available_rooms = db.query(Room).filter(Room.status == RoomStatus.AVAILABLE).count()
    maint_rooms = db.query(Room).filter(Room.status == RoomStatus.MAINTENANCE).count()
    total_beds = db.query(func.sum(Room.capacity)).scalar() or 0
    occupied_beds = db.query(func.sum(Room.occupied_count)).scalar() or 0

    blocks_report = []
    blocks = db.query(HostelBlock).all()
    for b in blocks:
        b_rooms = db.query(Room).filter(Room.block_id == b.id).all()
        b_beds = sum(r.capacity for r in b_rooms)
        b_occ = sum(r.occupied_count for r in b_rooms)
        blocks_report.append({
            "block_name": b.name,
            "code": b.code,
            "gender": b.gender.value,
            "total_rooms": len(b_rooms),
            "total_beds": b_beds,
            "occupied_beds": b_occ,
            "occupancy_rate": round((b_occ / b_beds * 100), 1) if b_beds > 0 else 0,
        })

    # 2. Attendance (today)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    att_records = db.query(AttendanceRecord).filter(AttendanceRecord.date == today).all()
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    present_today = sum(1 for a in att_records if a.status == AttendanceStatus.PRESENT)
    absent_today = sum(1 for a in att_records if a.status == AttendanceStatus.ABSENT)
    attendance_rate = round((present_today / total_students * 100), 1) if total_students > 0 else 96.5

    # 3. Fees
    total_fees_billed = db.query(func.sum(FeeRecord.total_amount)).scalar() or 0.0
    total_fees_collected = db.query(func.sum(FeeRecord.paid_amount)).scalar() or 0.0
    total_fees_pending = total_fees_billed - total_fees_collected
    overdue_count = db.query(FeeRecord).filter(FeeRecord.status == PaymentStatus.OVERDUE).count()

    # 4. Complaints
    total_complaints = db.query(Complaint).count()
    resolved_complaints = db.query(Complaint).filter(Complaint.status == ComplaintStatus.RESOLVED).count()
    pending_complaints = db.query(Complaint).filter(Complaint.status == ComplaintStatus.PENDING).count()
    in_progress_complaints = db.query(Complaint).filter(Complaint.status == ComplaintStatus.IN_PROGRESS).count()
    resolution_rate = round((resolved_complaints / total_complaints * 100), 1) if total_complaints > 0 else 100.0

    # 5. Inventory Health
    total_inventory_items = db.query(func.sum(InventoryItem.quantity)).scalar() or 0
    repair_needed_count = db.query(func.sum(InventoryItem.quantity)).filter(
        InventoryItem.condition.in_([ItemCondition.NEEDS_REPAIR, ItemCondition.DAMAGED])
    ).scalar() or 0

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "occupancy": {
            "total_rooms": total_rooms,
            "occupied_rooms": occupied_rooms,
            "available_rooms": available_rooms,
            "maintenance_rooms": maint_rooms,
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "overall_occupancy_rate": round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0,
            "blocks": blocks_report,
        },
        "attendance": {
            "date": today,
            "total_students": total_students,
            "present_count": present_today,
            "absent_count": absent_today,
            "attendance_rate": attendance_rate,
        },
        "finances": {
            "total_billed": float(total_fees_billed),
            "total_collected": float(total_fees_collected),
            "total_pending": float(total_fees_pending),
            "overdue_count": overdue_count,
            "collection_rate": round((total_fees_collected / total_fees_billed * 100), 1) if total_fees_billed > 0 else 0,
        },
        "maintenance": {
            "total_tickets": total_complaints,
            "resolved": resolved_complaints,
            "pending": pending_complaints,
            "in_progress": in_progress_complaints,
            "resolution_rate": resolution_rate,
        },
        "inventory": {
            "total_items": total_inventory_items,
            "serviceable_rate": round(((total_inventory_items - repair_needed_count) / total_inventory_items * 100), 1) if total_inventory_items > 0 else 100,
            "repair_needed": repair_needed_count,
        },
    }
