from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.inventory import InventoryItem, ItemCategory, ItemCondition
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse

router = APIRouter()


@router.get("", response_model=List[InventoryResponse])
def get_inventory(
    category: Optional[ItemCategory] = Query(None, description="Filter by category"),
    condition: Optional[ItemCondition] = Query(None, description="Filter by condition"),
    db: Session = Depends(get_db),
):
    """List hostel furniture, equipment, fixtures, and supplies."""
    query = db.query(InventoryItem)
    if category:
        query = query.filter(InventoryItem.category == category)
    if condition:
        query = query.filter(InventoryItem.condition == condition)

    return query.order_by(InventoryItem.item_name).all()


@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def add_inventory_item(item_in: InventoryCreate, db: Session = Depends(get_db)):
    """Add a new furniture or equipment item to inventory."""
    item = InventoryItem(**item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(item_id: int, item_in: InventoryUpdate, db: Session = Depends(get_db)):
    """Update item condition, quantity, or location."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(item, field, val)

    item.last_inspected = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item
