from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserCreate, UserUpdate

router = APIRouter()


@router.get("", response_model=List[UserResponse])
def get_students(
    search: Optional[str] = Query(None, description="Search by name, email or reg number"),
    department: Optional[str] = Query(None, description="Filter by department"),
    year: Optional[int] = Query(None, description="Filter by year of study"),
    db: Session = Depends(get_db),
):
    """List registered hostel students with optional filters."""
    query = db.query(User).filter(User.role == UserRole.STUDENT)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(pattern))
            | (User.email.ilike(pattern))
            | (User.register_number.ilike(pattern))
        )
    if department:
        query = query.filter(User.department == department)
    if year:
        query = query.filter(User.year_of_study == year)

    return query.order_by(User.full_name).all()


@router.get("/{student_id}", response_model=UserResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    """Get single student profile with emergency and parent details."""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_student(student_in: UserCreate, db: Session = Depends(get_db)):
    """Hostel admission enrollment: create new student profile."""
    existing_user = db.query(User).filter(User.email == student_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Student with this email already exists")

    if student_in.register_number:
        existing_reg = db.query(User).filter(User.register_number == student_in.register_number).first()
        if existing_reg:
            raise HTTPException(status_code=400, detail="Student with this register number already exists")

    student = User(
        email=student_in.email,
        hashed_password=get_password_hash(student_in.password),
        full_name=student_in.full_name,
        role=UserRole.STUDENT,
        phone=student_in.phone,
        register_number=student_in.register_number,
        department=student_in.department,
        year_of_study=student_in.year_of_study,
        parent_name=student_in.parent_name,
        parent_phone=student_in.parent_phone,
        emergency_contact=student_in.emergency_contact,
        blood_group=student_in.blood_group,
        address=student_in.address,
        is_active=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.patch("/{student_id}", response_model=UserResponse)
def update_student(student_id: int, student_in: UserUpdate, db: Session = Depends(get_db)):
    """Update student personal, parent, or emergency contact details."""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = student_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(student, field, val)

    db.commit()
    db.refresh(student)
    return student
