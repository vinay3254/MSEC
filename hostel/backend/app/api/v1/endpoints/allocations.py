from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.allocation import Allocation, AllocationStatus
from app.models.hostel import Room, RoomStatus
from app.models.user import User, UserRole
from app.schemas.allocation import AllocationCreate, AllocationResponse, AllocationTransfer

router = APIRouter()


@router.get("", response_model=List[AllocationResponse])
def get_allocations(db: Session = Depends(get_db)):
    """List all room allocations."""
    return db.query(Allocation).filter(Allocation.status == AllocationStatus.ACTIVE).all()


@router.post("", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED)
def allocate_room(alloc_in: AllocationCreate, db: Session = Depends(get_db)):
    """Allocate a bed in a room to a student."""
    student = db.query(User).filter(User.id == alloc_in.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    active_alloc = db.query(Allocation).filter(
        Allocation.student_id == alloc_in.student_id,
        Allocation.status == AllocationStatus.ACTIVE,
    ).first()
    if active_alloc:
        raise HTTPException(status_code=400, detail="Student already has an active room allocation")

    room = db.query(Room).filter(Room.id == alloc_in.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.occupied_count >= room.capacity:
        raise HTTPException(status_code=400, detail="Room is already at full capacity")

    allocation = Allocation(
        student_id=alloc_in.student_id,
        room_id=alloc_in.room_id,
        bed_number=alloc_in.bed_number,
        academic_year=alloc_in.academic_year,
        status=AllocationStatus.ACTIVE,
    )
    db.add(allocation)

    room.occupied_count += 1
    if room.occupied_count >= room.capacity:
        room.status = RoomStatus.OCCUPIED

    db.commit()
    db.refresh(allocation)
    return allocation


@router.post("/{allocation_id}/transfer", response_model=AllocationResponse)
def transfer_room(
    allocation_id: int,
    transfer_in: AllocationTransfer,
    db: Session = Depends(get_db),
):
    """Transfer an allocated student to a new room and bed."""
    current_alloc = db.query(Allocation).filter(
        Allocation.id == allocation_id,
        Allocation.status == AllocationStatus.ACTIVE,
    ).first()
    if not current_alloc:
        raise HTTPException(status_code=404, detail="Active allocation not found")

    new_room = db.query(Room).filter(Room.id == transfer_in.new_room_id).first()
    if not new_room:
        raise HTTPException(status_code=404, detail="Target room not found")

    if new_room.occupied_count >= new_room.capacity:
        raise HTTPException(status_code=400, detail="Target room is full")

    # Free old room bed
    old_room = db.query(Room).filter(Room.id == current_alloc.room_id).first()
    if old_room and old_room.occupied_count > 0:
        old_room.occupied_count -= 1
        if old_room.status == RoomStatus.OCCUPIED and old_room.occupied_count < old_room.capacity:
            old_room.status = RoomStatus.AVAILABLE

    # Mark old allocation vacated
    current_alloc.status = AllocationStatus.VACATED
    current_alloc.vacated_at = datetime.now(timezone.utc)

    # Create new allocation
    new_alloc = Allocation(
        student_id=current_alloc.student_id,
        room_id=transfer_in.new_room_id,
        bed_number=transfer_in.new_bed_number,
        academic_year=current_alloc.academic_year,
        status=AllocationStatus.ACTIVE,
    )
    db.add(new_alloc)

    # Increment new room
    new_room.occupied_count += 1
    if new_room.occupied_count >= new_room.capacity:
        new_room.status = RoomStatus.OCCUPIED

    db.commit()
    db.refresh(new_alloc)
    return new_alloc


@router.put("/{allocation_id}/vacate", response_model=AllocationResponse)
def vacate_allocation(allocation_id: int, db: Session = Depends(get_db)):
    """Mark an allocation as vacated and free up bed in the room."""
    alloc = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    if alloc.status == AllocationStatus.VACATED:
        raise HTTPException(status_code=400, detail="Room is already vacated")

    alloc.status = AllocationStatus.VACATED
    alloc.vacated_at = datetime.now(timezone.utc)

    room = db.query(Room).filter(Room.id == alloc.room_id).first()
    if room and room.occupied_count > 0:
        room.occupied_count -= 1
        if room.status == RoomStatus.OCCUPIED and room.occupied_count < room.capacity:
            room.status = RoomStatus.AVAILABLE

    db.commit()
    db.refresh(alloc)
    return alloc
