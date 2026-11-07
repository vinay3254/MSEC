from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    dashboard,
    rooms,
    students,
    allocations,
    complaints,
    gate_pass,
    fees,
    attendance,
    visitors,
    mess,
    inventory,
    reports,
    notices,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["Rooms & Blocks"])
api_router.include_router(students.router, prefix="/students", tags=["Students"])
api_router.include_router(allocations.router, prefix="/allocations", tags=["Allocations"])
api_router.include_router(complaints.router, prefix="/complaints", tags=["Complaints"])
api_router.include_router(gate_pass.router, prefix="/gate-pass", tags=["Gate Pass / Outpass"])
api_router.include_router(fees.router, prefix="/fees", tags=["Fees"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(visitors.router, prefix="/visitors", tags=["Visitors"])
api_router.include_router(mess.router, prefix="/mess", tags=["Mess"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(notices.router, prefix="/notices", tags=["Notices"])
