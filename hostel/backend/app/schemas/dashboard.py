from typing import List, Dict, Any
from pydantic import BaseModel
from app.schemas.notice import NoticeResponse


class DashboardStatsResponse(BaseModel):
    total_students: int
    total_blocks: int
    total_rooms: int
    occupied_rooms: int
    vacant_rooms: int
    total_beds: int
    occupied_beds: int
    occupancy_rate: float
    pending_complaints: int
    active_gate_passes: int
    pending_fees_amount: float
    today_attendance_rate: float = 95.0
    today_present_count: int = 0
    today_absent_count: int = 0
    active_visitors_count: int = 0
    notices: List[NoticeResponse] = []
    recent_activity: List[Dict[str, Any]] = []
