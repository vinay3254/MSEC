from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.STUDENT
    phone: Optional[str] = None
    register_number: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[int] = None
    
    # Extended Profile
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    admission_date: Optional[datetime] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[int] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
