from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.notice import Notice
from app.schemas.notice import NoticeCreate, NoticeResponse

router = APIRouter()


@router.get("", response_model=List[NoticeResponse])
def get_notices(db: Session = Depends(get_db)):
    """List all active hostel announcements and important updates."""
    return db.query(Notice).order_by(Notice.created_at.desc()).limit(10).all()


@router.post("", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
def create_notice(notice_in: NoticeCreate, db: Session = Depends(get_db)):
    """Post a new hostel notice or urgent update."""
    notice = Notice(**notice_in.model_dump())
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice
