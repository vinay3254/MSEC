from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.gate_pass import GatePass, PassStatus
from app.schemas.gate_pass import GatePassCreate, GatePassUpdateStatus, GatePassResponse

router = APIRouter()


@router.get("", response_model=List[GatePassResponse])
def get_gate_passes(
    status: Optional[PassStatus] = Query(None, description="Filter by pass status"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    db: Session = Depends(get_db),
):
    """List gate passes / outpasses."""
    query = db.query(GatePass)
    if status:
        query = query.filter(GatePass.status == status)
    if student_id:
        query = query.filter(GatePass.student_id == student_id)

    return query.order_by(GatePass.created_at.desc()).all()


@router.post("", response_model=GatePassResponse, status_code=status.HTTP_201_CREATED)
def apply_gate_pass(
    pass_in: GatePassCreate,
    student_id: int = Query(..., description="Student applying for pass"),
    db: Session = Depends(get_db),
):
    """Apply for a hostel gate pass / outpass."""
    gate_pass = GatePass(
        student_id=student_id,
        destination=pass_in.destination,
        reason=pass_in.reason,
        departure_time=pass_in.departure_time,
        expected_return_time=pass_in.expected_return_time,
        status=PassStatus.PENDING,
    )
    db.add(gate_pass)
    db.commit()
    db.refresh(gate_pass)
    return gate_pass


@router.patch("/{pass_id}/status", response_model=GatePassResponse)
def update_gate_pass_status(
    pass_id: int,
    update_data: GatePassUpdateStatus,
    approved_by: Optional[str] = Query(None, description="Warden/Admin name"),
    db: Session = Depends(get_db),
):
    """Approve, reject, or mark return for a gate pass."""
    gate_pass = db.query(GatePass).filter(GatePass.id == pass_id).first()
    if not gate_pass:
        raise HTTPException(status_code=404, detail="Gate pass not found")

    gate_pass.status = update_data.status
    if approved_by:
        gate_pass.approved_by = approved_by
    if update_data.remarks:
        gate_pass.remarks = update_data.remarks
    if update_data.status == PassStatus.RETURNED:
        gate_pass.actual_return_time = update_data.actual_return_time or datetime.now(timezone.utc)

    db.commit()
    db.refresh(gate_pass)
    return gate_pass
