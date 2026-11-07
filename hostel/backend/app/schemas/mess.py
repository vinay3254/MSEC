from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.mess import MealType
from app.schemas.user import UserResponse


class MessMenuBase(BaseModel):
    day_of_week: str
    meal_type: MealType
    items: str
    timings: str
    is_special: bool = False


class MessMenuCreate(MessMenuBase):
    pass


class MessMenuResponse(MessMenuBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class MessFeedbackBase(BaseModel):
    meal_type: MealType
    rating: int  # 1 to 5
    category: str = "quality"
    comments: str


class MessFeedbackCreate(MessFeedbackBase):
    student_id: int


class MessFeedbackResponse(MessFeedbackBase):
    id: int
    student_id: int
    created_at: datetime
    student: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
