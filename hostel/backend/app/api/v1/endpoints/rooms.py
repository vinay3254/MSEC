from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.hostel import HostelBlock, Room, RoomStatus, RoomType
from app.schemas.hostel import (
    HostelBlockCreate,
    HostelBlockResponse,
    RoomCreate,
    RoomUpdate,
    RoomResponse,
)

router = APIRouter()


# Blocks
@router.get("/blocks", response_model=List[HostelBlockResponse])
def get_blocks(db: Session = Depends(get_db)):
    """List all hostel blocks."""
    blocks = db.query(HostelBlock).all()
    results = []
    for b in blocks:
        resp = HostelBlockResponse.model_validate(b)
        resp.total_rooms = len(b.rooms)
        results.append(resp)
    return results


@router.post("/blocks", response_model=HostelBlockResponse, status_code=status.HTTP_201_CREATED)
def create_block(block_in: HostelBlockCreate, db: Session = Depends(get_db)):
    """Create a new hostel block."""
    existing = db.query(HostelBlock).filter(HostelBlock.code == block_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Block code already exists")
    block = HostelBlock(**block_in.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    resp = HostelBlockResponse.model_validate(block)
    resp.total_rooms = 0
    return resp


# Rooms
@router.get("", response_model=List[RoomResponse])
def get_rooms(
    block_id: Optional[int] = Query(None, description="Filter by block ID"),
    status: Optional[RoomStatus] = Query(None, description="Filter by status"),
    room_type: Optional[RoomType] = Query(None, description="Filter by room type"),
    db: Session = Depends(get_db),
):
    """List rooms with optional block, status, and type filters."""
    query = db.query(Room)
    if block_id:
        query = query.filter(Room.block_id == block_id)
    if status:
        query = query.filter(Room.status == status)
    if room_type:
        query = query.filter(Room.room_type == room_type)

    rooms = query.order_by(Room.room_number).all()
    results = []
    for r in rooms:
        resp = RoomResponse.model_validate(r)
        if r.block:
            resp.block_name = r.block.name
        results.append(resp)
    return results


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(room_in: RoomCreate, db: Session = Depends(get_db)):
    """Create a new room in a block."""
    block = db.query(HostelBlock).filter(HostelBlock.id == room_in.block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Hostel block not found")

    existing = db.query(Room).filter(
        Room.block_id == room_in.block_id,
        Room.room_number == room_in.room_number,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Room number already exists in this block")

    room = Room(
        block_id=room_in.block_id,
        room_number=room_in.room_number,
        floor=room_in.floor,
        capacity=room_in.capacity,
        occupied_count=0,
        room_type=room_in.room_type,
        status=room_in.status,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    resp = RoomResponse.model_validate(room)
    resp.block_name = block.name
    return resp


@router.patch("/{room_id}", response_model=RoomResponse)
def update_room(room_id: int, room_in: RoomUpdate, db: Session = Depends(get_db)):
    """Update room capacity, status, or type."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    update_data = room_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(room, field, val)

    db.commit()
    db.refresh(room)
    resp = RoomResponse.model_validate(room)
    if room.block:
        resp.block_name = room.block.name
    return resp
