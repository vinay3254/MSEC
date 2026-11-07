import React, { useEffect, useState } from 'react';
import { hostelService } from '../services/hostelService';
import { studentService } from '../services/studentService';
import { Complaint, User } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import {
  AlertCircle,
  Plus,
  CheckCircle2,
  Wrench,
  X,
  Zap,
  Droplet,
  Sparkles,
  Wifi,
  Bed,
  Building2,
  Layers,
} from 'lucide-react';

export const ComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // New Ticket Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('electrical');
  const [priority, setPriority] = useState('medium');
  const [studentId, setStudentId] = useState<number | ''>('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      hostelService.getComplaints({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      }),
      studentService.getStudents(),
    ])
      .then(([complaintData, studentData]) => {
        setComplaints(complaintData);
        setStudents(studentData);
        if (studentData.length > 0 && !studentId) {
          setStudentId(studentData[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter]);

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    try {
      await hostelService.fileComplaint({
        student_id: Number(studentId),
        title,
        description,
        category,
        priority,
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to file complaint');
    }
  };

  const handleUpdateStatus = async (complaintId: number, newStatus: string) => {
    try {
      await hostelService.updateComplaint(complaintId, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update ticket status');
    }
  };

  const pendingCount = complaints.filter((c) => c.status === 'pending').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Complaints & Hostel Maintenance
          </h1>
          <p className="text-sm text-[#5C5468] mt-1 font-body">
            Manage repair tickets for electricity, plumbing, furniture, cleanliness, and room facilities.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F30137] hover:bg-[#C4012C] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
        >
          <Plus className="w-4 h-4" /> Raise Maintenance Ticket
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="PENDING ATTENTION"
          value={pendingCount}
          subtitle="New student complaints"
          icon={AlertCircle}
          iconBg="bg-[#FCF3E6]"
          iconColor="text-[#D98B16]"
          iconBorder="border-[#fae3be]"
        />
        <StatCard
          title="IN PROGRESS"
          value={inProgressCount}
          subtitle="Technician assigned"
          icon={Wrench}
          iconBg="bg-[#E9F0F8]"
          iconColor="text-[#2563A6]"
          iconBorder="border-[#c5daf0]"
        />
        <StatCard
          title="RESOLVED TICKETS"
          value={resolvedCount}
          subtitle="Completed repairs"
          icon={CheckCircle2}
          iconBg="bg-[#E8F5EF]"
          iconColor="text-[#1C8A5C]"
          iconBorder="border-[#b5e2ce]"
        />
      </div>

      {/* Category & Status Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E3DEE9] shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#5C5468] mr-2 font-body">Status:</span>
          {['', 'pending', 'in_progress', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition font-body ${
                statusFilter === st
                  ? 'bg-[#4E2478] text-white shadow-2xs'
                  : 'bg-[#FAF8FC] text-[#5C5468] border border-[#E3DEE9] hover:bg-[#EDE4F5]'
              }`}
            >
              {st ? st.replace('_', ' ') : 'All Statuses'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E3DEE9]/60">
          <span className="text-xs font-semibold text-[#5C5468] mr-2 font-body">Category:</span>
          {[
            { label: 'All Categories', val: '', icon: Layers },
            { label: 'Electricity', val: 'electrical', icon: Zap },
            { label: 'Plumbing', val: 'plumbing', icon: Droplet },
            { label: 'Furniture', val: 'carpentry', icon: Bed },
            { label: 'Cleanliness', val: 'cleanliness', icon: Sparkles },
            { label: 'Wi-Fi / Network', val: 'wifi', icon: Wifi },
            { label: 'Facilities', val: 'other', icon: Building2 },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.val}
                onClick={() => setCategoryFilter(cat.val)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition font-body ${
                  categoryFilter === cat.val
                    ? 'bg-[#EDE4F5] text-[#4E2478] font-bold border border-[#E3DEE9]'
                    : 'text-[#5C5468] hover:bg-[#FAF8FC]'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <Loader message="Loading maintenance tickets..." />
      ) : complaints.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-[#1C8A5C] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#1A1523] font-heading">No tickets found</h3>
          <p className="text-xs text-[#5C5468] mt-1 font-body">Everything is in good working order.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-[#E3DEE9] p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 font-body"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#5C5468]">#{c.id}</span>
                  <Badge variant="primary" className="capitalize font-semibold">
                    {c.category}
                  </Badge>
                  <Badge
                    variant={
                      c.priority === 'urgent' || c.priority === 'high'
                        ? 'danger'
                        : c.priority === 'medium'
                        ? 'warning'
                        : 'neutral'
                    }
                    className="capitalize font-semibold"
                  >
                    {c.priority} Priority
                  </Badge>
                  <Badge
                    variant={
                      c.status === 'resolved'
                        ? 'success'
                        : c.status === 'in_progress'
                        ? 'info'
                        : 'warning'
                    }
                    className="capitalize font-semibold"
                  >
                    {c.status.replace('_', ' ')}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-[#1A1523] font-heading">{c.title}</h3>
                <p className="text-xs text-[#5C5468] leading-relaxed">{c.description}</p>

                {c.resolution_notes && (
                  <p className="text-xs bg-[#FAF8FC] border border-[#E3DEE9] text-[#1A1523] p-2.5 rounded-xl font-mono">
                    <strong className="text-[#4E2478]">Warden resolution note:</strong> {c.resolution_notes}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-[#5C5468] pt-1 font-body">
                  <span>Student: <strong className="text-[#1A1523]">{c.student?.full_name || `#${c.student_id}`}</strong></span>
                  <span>•</span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Status Update Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={c.status}
                  onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                  className="text-xs font-semibold border border-[#E3DEE9] rounded-xl px-3 py-2 bg-[#FAF8FC] text-[#1A1523] focus:outline-none focus:border-[#4E2478] font-body"
                >
                  <option value="pending">Mark Pending</option>
                  <option value="in_progress">Mark In Progress</option>
                  <option value="resolved">Mark Resolved</option>
                  <option value="rejected">Mark Rejected</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raise Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DEE9]">
              <h3 className="text-base font-bold text-[#1A1523] font-heading">
                Raise Maintenance Ticket
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="mt-4 space-y-4 text-xs font-body">
              <div>
                <label className="block font-medium text-[#1A1523]">Resident Student</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(Number(e.target.value))}
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  required
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.register_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Issue Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Study desk chair wheel broken"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    <option value="electrical">Electricity</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="carpentry">Furniture</option>
                    <option value="cleanliness">Cleanliness</option>
                    <option value="wifi">Wi-Fi & Internet</option>
                    <option value="other">Facilities & Room</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Issue Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain exact problem and room location..."
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3DEE9]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-[#5C5468] hover:text-[#1A1523]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#F30137] hover:bg-[#C4012C] text-white rounded-xl font-semibold shadow-xs"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
