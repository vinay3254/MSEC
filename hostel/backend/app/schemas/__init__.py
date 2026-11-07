from app.schemas.common import APIResponse, PaginatedResponse
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate, Token, TokenPayload
from app.schemas.hostel import (
    HostelBlockCreate,
    HostelBlockResponse,
    RoomCreate,
    RoomUpdate,
    RoomResponse,
)
from app.schemas.allocation import AllocationCreate, AllocationResponse, AllocationTransfer
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintResponse
from app.schemas.gate_pass import GatePassCreate, GatePassUpdateStatus, GatePassResponse
from app.schemas.fee import FeeCreate, FeeUpdatePayment, FeeResponse
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceBulkRequest,
    AttendanceResponse,
    AttendanceDailySummary,
)
from app.schemas.visitor import VisitorCreate, VisitorUpdate, VisitorResponse
from app.schemas.mess import (
    MessMenuCreate,
    MessMenuResponse,
    MessFeedbackCreate,
    MessFeedbackResponse,
)
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse
from app.schemas.notice import NoticeCreate, NoticeResponse
from app.schemas.dashboard import DashboardStatsResponse

__all__ = [
    "APIResponse",
    "PaginatedResponse",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "Token",
    "TokenPayload",
    "HostelBlockCreate",
    "HostelBlockResponse",
    "RoomCreate",
    "RoomUpdate",
    "RoomResponse",
    "AllocationCreate",
    "AllocationResponse",
    "AllocationTransfer",
    "ComplaintCreate",
    "ComplaintUpdate",
    "ComplaintResponse",
    "GatePassCreate",
    "GatePassUpdateStatus",
    "GatePassResponse",
    "FeeCreate",
    "FeeUpdatePayment",
    "FeeResponse",
    "AttendanceCreate",
    "AttendanceBulkRequest",
    "AttendanceResponse",
    "AttendanceDailySummary",
    "VisitorCreate",
    "VisitorUpdate",
    "VisitorResponse",
    "MessMenuCreate",
    "MessMenuResponse",
    "MessFeedbackCreate",
    "MessFeedbackResponse",
    "InventoryCreate",
    "InventoryUpdate",
    "InventoryResponse",
    "NoticeCreate",
    "NoticeResponse",
    "DashboardStatsResponse",
]
