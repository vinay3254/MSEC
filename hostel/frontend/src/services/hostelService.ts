import api from './api';
import {
  HostelBlock,
  Room,
  Allocation,
  Complaint,
  GatePass,
  FeeRecord,
  AttendanceRecord,
  AttendanceDailySummary,
  VisitorRecord,
  MessMenu,
  MessFeedback,
  InventoryItem,
  Notice,
  OperationalReportsSummary,
} from '../types';

export const hostelService = {
  // Blocks & Rooms
  async getBlocks(): Promise<HostelBlock[]> {
    const response = await api.get<HostelBlock[]>('/rooms/blocks');
    return response.data;
  },

  async createBlock(data: Partial<HostelBlock>): Promise<HostelBlock> {
    const response = await api.post<HostelBlock>('/rooms/blocks', data);
    return response.data;
  },

  async getRooms(params?: { block_id?: number; status?: string; room_type?: string }): Promise<Room[]> {
    const response = await api.get<Room[]>('/rooms', { params });
    return response.data;
  },

  async createRoom(data: Partial<Room>): Promise<Room> {
    const response = await api.post<Room>('/rooms', data);
    return response.data;
  },

  async updateRoom(roomId: number, data: Partial<Room>): Promise<Room> {
    const response = await api.patch<Room>(`/rooms/${roomId}`, data);
    return response.data;
  },

  // Allocations & Room Transfers
  async getAllocations(): Promise<Allocation[]> {
    const response = await api.get<Allocation[]>('/allocations');
    return response.data;
  },

  async allocateRoom(data: {
    student_id: number;
    room_id: number;
    bed_number: string;
    academic_year?: string;
  }): Promise<Allocation> {
    const response = await api.post<Allocation>('/allocations', data);
    return response.data;
  },

  async transferRoom(
    allocationId: number,
    data: { new_room_id: number; new_bed_number: string; remarks?: string }
  ): Promise<Allocation> {
    const response = await api.post<Allocation>(`/allocations/${allocationId}/transfer`, data);
    return response.data;
  },

  async vacateRoom(allocationId: number): Promise<Allocation> {
    const response = await api.put<Allocation>(`/allocations/${allocationId}/vacate`);
    return response.data;
  },

  // Attendance & Outings
  async getAttendance(params?: { date?: string; student_id?: number; status?: string }): Promise<AttendanceRecord[]> {
    const response = await api.get<AttendanceRecord[]>('/attendance', { params });
    return response.data;
  },

  async getAttendanceSummary(date?: string): Promise<AttendanceDailySummary> {
    const response = await api.get<AttendanceDailySummary>('/attendance/summary', { params: { date } });
    return response.data;
  },

  async markAttendance(data: { student_id: number; date: string; status: string; remarks?: string }): Promise<AttendanceRecord> {
    const response = await api.post<AttendanceRecord>('/attendance', data);
    return response.data;
  },

  async markBulkAttendance(date: string, records: Array<{ student_id: number; status: string; remarks?: string }>): Promise<any> {
    const response = await api.post('/attendance/bulk', { date, records });
    return response.data;
  },

  // Gate Passes / Outpasses / Leave
  async getGatePasses(params?: { status?: string; student_id?: number }): Promise<GatePass[]> {
    const response = await api.get<GatePass[]>('/gate-pass', { params });
    return response.data;
  },

  async applyGatePass(
    studentId: number,
    data: { destination: string; reason: string; departure_time: string; expected_return_time: string }
  ): Promise<GatePass> {
    const response = await api.post<GatePass>('/gate-pass', data, {
      params: { student_id: studentId },
    });
    return response.data;
  },

  async updateGatePassStatus(
    passId: number,
    data: { status: string; remarks?: string },
    approvedBy?: string
  ): Promise<GatePass> {
    const response = await api.patch<GatePass>(`/gate-pass/${passId}/status`, data, {
      params: { approved_by: approvedBy },
    });
    return response.data;
  },

  // Visitor Management
  async getVisitors(params?: { status?: string; student_id?: number }): Promise<VisitorRecord[]> {
    const response = await api.get<VisitorRecord[]>('/visitors', { params });
    return response.data;
  },

  async logVisitorEntry(data: {
    visitor_name: string;
    phone: string;
    relationship: string;
    student_id: number;
    purpose: string;
    id_proof_type?: string;
    id_proof_number?: string;
    remarks?: string;
  }): Promise<VisitorRecord> {
    const response = await api.post<VisitorRecord>('/visitors', data);
    return response.data;
  },

  async logVisitorExit(visitorId: number, remarks?: string): Promise<VisitorRecord> {
    const response = await api.patch<VisitorRecord>(`/visitors/${visitorId}/exit`, null, {
      params: { remarks },
    });
    return response.data;
  },

  // Fees
  async getFees(params?: { status?: string; fee_type?: string }): Promise<FeeRecord[]> {
    const response = await api.get<FeeRecord[]>('/fees', { params });
    return response.data;
  },

  async recordFeePayment(
    feeId: number,
    data: { paid_amount: number; transaction_ref?: string }
  ): Promise<FeeRecord> {
    const response = await api.post<FeeRecord>(`/fees/${feeId}/pay`, data);
    return response.data;
  },

  // Complaints & Maintenance
  async getComplaints(params?: { status?: string; category?: string }): Promise<Complaint[]> {
    const response = await api.get<Complaint[]>('/complaints', { params });
    return response.data;
  },

  async fileComplaint(data: {
    student_id: number;
    title: string;
    description: string;
    category: string;
    priority: string;
    room_id?: number;
  }): Promise<Complaint> {
    const response = await api.post<Complaint>('/complaints', data, {
      params: { student_id: data.student_id },
    });
    return response.data;
  },

  async updateComplaint(
    complaintId: number,
    data: { status?: string; priority?: string; resolution_notes?: string }
  ): Promise<Complaint> {
    const response = await api.patch<Complaint>(`/complaints/${complaintId}`, data);
    return response.data;
  },

  // Mess Management
  async getMessMenu(params?: { day?: string; meal_type?: string }): Promise<MessMenu[]> {
    const response = await api.get<MessMenu[]>('/mess/menu', { params });
    return response.data;
  },

  async saveMessMenu(data: {
    day_of_week: string;
    meal_type: string;
    items: string;
    timings: string;
    is_special?: boolean;
  }): Promise<MessMenu> {
    const response = await api.post<MessMenu>('/mess/menu', data);
    return response.data;
  },

  async getMessFeedback(params?: { category?: string; meal_type?: string }): Promise<MessFeedback[]> {
    const response = await api.get<MessFeedback[]>('/mess/feedback', { params });
    return response.data;
  },

  async submitMessFeedback(data: {
    student_id: number;
    meal_type: string;
    rating: number;
    category: string;
    comments: string;
  }): Promise<MessFeedback> {
    const response = await api.post<MessFeedback>('/mess/feedback', data);
    return response.data;
  },

  // Inventory
  async getInventory(params?: { category?: string; condition?: string }): Promise<InventoryItem[]> {
    const response = await api.get<InventoryItem[]>('/inventory', { params });
    return response.data;
  },

  async addInventoryItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await api.post<InventoryItem>('/inventory', data);
    return response.data;
  },

  async updateInventoryItem(itemId: number, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await api.patch<InventoryItem>(`/inventory/${itemId}`, data);
    return response.data;
  },

  // Reports
  async getReportsSummary(): Promise<OperationalReportsSummary> {
    const response = await api.get<OperationalReportsSummary>('/reports/summary');
    return response.data;
  },

  // Notices / Announcements
  async getNotices(): Promise<Notice[]> {
    const response = await api.get<Notice[]>('/notices');
    return response.data;
  },

  async createNotice(data: { title: string; content: string; category?: string; priority?: string }): Promise<Notice> {
    const response = await api.post<Notice>('/notices', data);
    return response.data;
  },
};
