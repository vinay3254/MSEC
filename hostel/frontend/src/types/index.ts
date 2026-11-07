export type UserRole = 'admin' | 'warden' | 'student';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  designation?: string;
  phone?: string;
  register_number?: string;
  department?: string;
  year_of_study?: number;
  parent_name?: string;
  parent_phone?: string;
  emergency_contact?: string;
  blood_group?: string;
  address?: string;
  admission_date?: string;
  is_active: boolean;
  created_at: string;
}

export type BlockGender = 'boys' | 'girls';
export type RoomType = 'ac' | 'non_ac';
export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export interface HostelBlock {
  id: number;
  name: string;
  code: string;
  gender: BlockGender;
  total_floors: number;
  warden_name?: string;
  total_rooms?: number;
  created_at: string;
}

export interface Room {
  id: number;
  block_id: number;
  block_name?: string;
  room_number: string;
  floor: number;
  capacity: number;
  occupied_count: number;
  room_type: RoomType;
  status: RoomStatus;
  created_at: string;
}

export type AllocationStatus = 'active' | 'vacated' | 'pending';

export interface Allocation {
  id: number;
  student_id: number;
  room_id: number;
  bed_number: string;
  academic_year: string;
  status: AllocationStatus;
  allocated_at: string;
  vacated_at?: string;
  student?: User;
  room?: Room;
}

export type ComplaintCategory =
  | 'electrical'
  | 'plumbing'
  | 'carpentry'
  | 'cleanliness'
  | 'wifi'
  | 'mess'
  | 'other';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface Complaint {
  id: number;
  student_id: number;
  room_id?: number;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
  student?: User;
}

export type PassStatus = 'pending' | 'approved' | 'rejected' | 'returned';

export interface GatePass {
  id: number;
  student_id: number;
  destination: string;
  reason: string;
  departure_time: string;
  expected_return_time: string;
  actual_return_time?: string;
  status: PassStatus;
  approved_by?: string;
  parent_consent: string;
  remarks?: string;
  created_at: string;
  student?: User;
}

export type FeeType = 'hostel_fee' | 'mess_fee' | 'amenities' | 'caution_deposit';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface FeeRecord {
  id: number;
  student_id: number;
  academic_year: string;
  fee_type: FeeType;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  status: PaymentStatus;
  transaction_ref?: string;
  created_at: string;
  student?: User;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'on_leave';

export interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: AttendanceStatus;
  marked_time: string;
  remarks?: string;
  student?: User;
}

export interface AttendanceDailySummary {
  date: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  attendance_rate: number;
}

export type VisitorStatus = 'checked_in' | 'checked_out' | 'denied';

export interface VisitorRecord {
  id: number;
  visitor_name: string;
  phone: string;
  relationship: string;
  student_id: number;
  purpose: string;
  id_proof_type: string;
  id_proof_number?: string;
  entry_time: string;
  exit_time?: string;
  status: VisitorStatus;
  remarks?: string;
  student?: User;
}

export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export interface MessMenu {
  id: number;
  day_of_week: string;
  meal_type: MealType;
  items: string;
  timings: string;
  is_special: boolean;
}

export interface MessFeedback {
  id: number;
  student_id: number;
  meal_type: MealType;
  rating: number;
  category: string;
  comments: string;
  created_at: string;
  student?: User;
}

export type ItemCategory = 'furniture' | 'electrical' | 'plumbing' | 'facility' | 'supplies';
export type ItemCondition = 'good' | 'needs_repair' | 'damaged' | 'new';

export interface InventoryItem {
  id: number;
  item_name: string;
  category: ItemCategory;
  block_id?: number;
  room_number?: string;
  quantity: number;
  condition: ItemCondition;
  last_inspected: string;
  remarks?: string;
}

export type NoticePriority = 'normal' | 'high' | 'urgent';

export interface Notice {
  id: number;
  title: string;
  content: string;
  category: string;
  priority: NoticePriority;
  posted_by: string;
  created_at: string;
}

export interface DashboardStats {
  total_students: number;
  total_blocks: number;
  total_rooms: number;
  occupied_rooms: number;
  vacant_rooms: number;
  total_beds: number;
  occupied_beds: number;
  occupancy_rate: number;
  pending_complaints: number;
  active_gate_passes: number;
  pending_fees_amount: number;
  today_attendance_rate: number;
  today_present_count: number;
  today_absent_count: number;
  active_visitors_count: number;
  notices: Notice[];
  recent_activity: Array<{
    type: string;
    title: string;
    status: string;
    time: string;
  }>;
}

export interface OperationalReportsSummary {
  generated_at: string;
  occupancy: {
    total_rooms: number;
    occupied_rooms: number;
    available_rooms: number;
    maintenance_rooms: number;
    total_beds: number;
    occupied_beds: number;
    overall_occupancy_rate: number;
    blocks: Array<{
      block_name: string;
      code: string;
      gender: string;
      total_rooms: number;
      total_beds: number;
      occupied_beds: number;
      occupancy_rate: number;
    }>;
  };
  attendance: {
    date: string;
    total_students: number;
    present_count: number;
    absent_count: number;
    attendance_rate: number;
  };
  finances: {
    total_billed: number;
    total_collected: number;
    total_pending: number;
    overdue_count: number;
    collection_rate: number;
  };
  maintenance: {
    total_tickets: number;
    resolved: number;
    pending: number;
    in_progress: number;
    resolution_rate: number;
  };
  inventory: {
    total_items: number;
    serviceable_rate: number;
    repair_needed: number;
  };
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
