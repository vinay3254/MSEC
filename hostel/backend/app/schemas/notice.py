from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.notice import NoticePriority


class NoticeBase(BaseModel):
    title: str
    content: str
    category: str = "General"
    priority: NoticePriority = NoticePriority.NORMAL
    posted_by: str = "Hostel Warden"


class NoticeCreate(NoticeBase):
    pass


class NoticeResponse(NoticeBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
