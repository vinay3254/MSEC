from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.mess import MessMenu, MessFeedback, MealType
from app.models.user import User, UserRole
from app.schemas.mess import (
    MessMenuCreate,
    MessMenuResponse,
    MessFeedbackCreate,
    MessFeedbackResponse,
)

router = APIRouter()


# Menu
@router.get("/menu", response_model=List[MessMenuResponse])
def get_mess_menu(
    day: Optional[str] = Query(None, description="Filter by day e.g., 'Monday'"),
    meal_type: Optional[MealType] = Query(None, description="Filter by meal type"),
    db: Session = Depends(get_db),
):
    """Get weekly mess meal menu."""
    query = db.query(MessMenu)
    if day:
        query = query.filter(MessMenu.day_of_week.ilike(day))
    if meal_type:
        query = query.filter(MessMenu.meal_type == meal_type)

    return query.all()


@router.post("/menu", response_model=MessMenuResponse, status_code=status.HTTP_201_CREATED)
def set_menu_item(menu_in: MessMenuCreate, db: Session = Depends(get_db)):
    """Create or update a meal menu schedule."""
    existing = db.query(MessMenu).filter(
        MessMenu.day_of_week.ilike(menu_in.day_of_week),
        MessMenu.meal_type == menu_in.meal_type,
    ).first()

    if existing:
        existing.items = menu_in.items
        existing.timings = menu_in.timings
        existing.is_special = menu_in.is_special
        db.commit()
        db.refresh(existing)
        return existing

    item = MessMenu(**menu_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# Feedback & Complaints
@router.get("/feedback", response_model=List[MessFeedbackResponse])
def get_mess_feedback(
    category: Optional[str] = Query(None, description="Filter by category"),
    meal_type: Optional[MealType] = Query(None, description="Filter by meal type"),
    db: Session = Depends(get_db),
):
    """List student mess feedback, ratings, and food complaints."""
    query = db.query(MessFeedback)
    if category:
        query = query.filter(MessFeedback.category == category)
    if meal_type:
        query = query.filter(MessFeedback.meal_type == meal_type)

    return query.order_by(MessFeedback.created_at.desc()).all()


@router.post("/feedback", response_model=MessFeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_mess_feedback(fb_in: MessFeedbackCreate, db: Session = Depends(get_db)):
    """Submit student meal review, rating, or mess complaint."""
    student = db.query(User).filter(User.id == fb_in.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    feedback = MessFeedback(
        student_id=fb_in.student_id,
        meal_type=fb_in.meal_type,
        rating=fb_in.rating,
        category=fb_in.category,
        comments=fb_in.comments,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
