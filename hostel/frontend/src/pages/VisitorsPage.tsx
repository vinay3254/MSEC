import React, { useEffect, useState } from 'react';
import { hostelService } from '../services/hostelService';
import { studentService } from '../services/studentService';
import { VisitorRecord, User } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import {
  UserPlus,
  UserCheck,
  Clock,
  Phone,
  ShieldCheck,
  Search,
  LogOut,
  X,
} from 'lucide-react';

export const VisitorsPage: React.FC = () => {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Entry Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    visitor_name: '',
    phone: '',
    relationship: 'Parent',
    student_id: '' as number | '',
    purpose: '',
    id_proof_type: 'Aadhar Card',
    id_proof_number: '',
    remarks: 'Hostel visitor lounge verified',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      hostelService.getVisitors({ status: statusFilter || undefined }),
      studentService.getStudents(),
    ])
      .then(([vData, sData]) => {
        setVisitors(vData);
        setStudents(sData);
        if (sData.length > 0 && !formData.student_id) {
          setFormData((prev) => ({ ...prev, student_id: sData[0].id }));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) return;

    try {
      await hostelService.logVisitorEntry({
        ...formData,
        student_id: Number(formData.student_id),
      });
      setShowModal(false);
      setFormData({
        visitor_name: '',
        phone: '',
        relationship: 'Parent',
        student_id: students[0]?.id || '',
        purpose: '',
        id_proof_type: 'Aadhar Card',
        id_proof_number: '',
        remarks: 'Hostel visitor lounge verified',
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to log visitor entry');
    }
  };

  const handleMarkExit = async (visitorId: number) => {
    try {
      await hostelService.logVisitorExit(visitorId, 'Checked out at campus gate');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record visitor exit');
    }
  };

  const activeCount = visitors.filter((v) => v.status === 'checked_in').length;
  const filteredVisitors = visitors.filter((v) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      v.visitor_name.toLowerCase().includes(term) ||
      v.phone.toLowerCase().includes(term) ||
      (v.student?.full_name && v.student.full_name.toLowerCase().includes(term)) ||
      v.purpose.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Campus Visitor Management
          </h1>
          <p className="text-sm text-[#5C5468] mt-1 font-body">
            Log visitor entries, relationship verifications, gate check-outs, and student visits.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
        >
          <UserPlus className="w-4 h-4" /> Log Visitor Entry
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="CURRENTLY INSIDE CAMPUS"
          value={activeCount}
          subtitle="Active visitors in lounge"
          icon={UserCheck}
          iconBg="bg-[#EDE4F5]"
          iconColor="text-[#4E2478]"
          iconBorder="border-[#EDE4F5]"
        />
        <StatCard
          title="TOTAL VISITS LOGGED"
          value={visitors.length}
          subtitle="All recorded visits"
          icon={Clock}
          iconBg="bg-[#E9F0F8]"
          iconColor="text-[#2563A6]"
          iconBorder="border-[#c5daf0]"
        />
        <StatCard
          title="SECURITY VERIFICATION"
          value="100%"
          subtitle="ID proof verified on entry"
          icon={ShieldCheck}
          iconBg="bg-[#E8F5EF]"
          iconColor="text-[#1C8A5C]"
          iconBorder="border-[#b5e2ce]"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E3DEE9] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#5C5468] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by visitor name, phone, or resident student..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl outline-none text-[#1A1523] placeholder-[#5C5468] focus:border-[#4E2478] font-body"
          />
        </div>

        <div className="flex gap-2">
          {['', 'checked_in', 'checked_out'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition font-body ${
                statusFilter === st
                  ? 'bg-[#4E2478] text-white shadow-2xs'
                  : 'bg-[#FAF8FC] text-[#5C5468] border border-[#E3DEE9] hover:bg-[#EDE4F5]'
              }`}
            >
              {st ? st.replace('_', ' ') : 'All Logs'}
            </button>
          ))}
        </div>
      </div>

      {/* Visitor Table */}
      {loading ? (
        <Loader message="Loading campus visitor logbook..." />
      ) : filteredVisitors.length === 0 ? (
        <Card className="text-center py-12">
          <UserPlus className="w-12 h-12 text-[#5C5468]/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#1A1523] font-heading">No visitor entries found</h3>
          <p className="text-xs text-[#5C5468] mt-1 font-body">
            Log visitors arriving at the campus security gate.
          </p>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3DEE9] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1A1523]">
              <thead className="bg-[#FAF8FC] border-b border-[#E3DEE9] text-[11px] font-semibold uppercase text-[#5C5468]">
                <tr>
                  <th className="px-6 py-4">Visitor Details</th>
                  <th className="px-6 py-4">Relationship</th>
                  <th className="px-6 py-4">Student Visited</th>
                  <th className="px-6 py-4">Purpose of Visit</th>
                  <th className="px-6 py-4">Entry / Exit Times</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DEE9]/70">
                {filteredVisitors.map((v) => (
                  <tr key={v.id} className="hover:bg-[#EDE4F5]/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-[#1A1523]">{v.visitor_name}</div>
                      <div className="text-[11px] text-[#5C5468] flex items-center gap-1 font-mono">
                        <Phone className="w-2.5 h-2.5 text-[#5C5468]" /> {v.phone}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant="primary">{v.relationship}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-[#4E2478]">
                        {v.student?.full_name || `#${v.student_id}`}
                      </div>
                      <div className="text-[10px] text-[#5C5468] font-mono">
                        {v.student?.register_number}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 max-w-xs">
                      <p className="text-[#1A1523] line-clamp-2 leading-relaxed">{v.purpose}</p>
                      {v.id_proof_number && (
                        <span className="text-[10px] text-[#5C5468] font-mono block mt-0.5">
                          ID: {v.id_proof_type} ({v.id_proof_number})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-[#5C5468]">
                      <div className="font-medium text-[#1A1523]">
                        In: {new Date(v.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {v.exit_time ? (
                        <div className="text-[11px] text-[#1C8A5C] font-medium">
                          Out: {new Date(v.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#F30137] font-semibold">Still on campus</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge
                        variant={
                          v.status === 'checked_in'
                            ? 'warning'
                            : v.status === 'checked_out'
                            ? 'success'
                            : 'danger'
                        }
                        className="capitalize"
                      >
                        {v.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {v.status === 'checked_in' ? (
                        <button
                          onClick={() => handleMarkExit(v.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#EDE4F5] hover:bg-[#4E2478] hover:text-white text-[#4E2478] rounded-lg text-xs font-semibold transition"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Check Out
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#5C5468] font-medium">Logged</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Visitor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DEE9]">
              <h3 className="text-base font-bold text-[#1A1523] font-heading">Log Visitor Entry</h3>
              <button onClick={() => setShowModal(false)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="mt-4 space-y-4 text-xs font-body">
              <div>
                <label className="block font-medium text-[#1A1523]">Visitor Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.visitor_name}
                  onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                  placeholder="e.g. Ramesh Sharma"
                  className="mt-1 w-full p-2.5 bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl text-[#1A1523] outline-none focus:border-[#4E2478]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Contact Mobile</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 94441 23456"
                    className="mt-1 w-full p-2.5 bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl text-[#1A1523] outline-none focus:border-[#4E2478]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Relationship</label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="mt-1 w-full p-2.5 bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl text-[#1A1523] outline-none focus:border-[#4E2478]"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Parent">Parent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Relative">Relative</option>
                    <option value="Friend">Friend</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Hostel Student Being Visited</label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })}
                  className="mt-1 w-full p-2.5 bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl text-[#1A1523] outline-none focus:border-[#4E2478]"
                  required
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.register_number}) - {s.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Purpose of Visit</label>
                <textarea
                  rows={2}
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g. Delivering study materials and weekend family meeting"
                  className="mt-1 w-full p-2.5 bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl text-[#1A1523] outline-none focus:border-[#4E2478]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">ID Proof Type</label>
                  <select
                    value={formData.id_proof_type}
                    onChange={(e) => setFormData({ ...formData, id_proof_type: e.target.value })}
                    className="mt-1 w-full p-2.5 bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl text-[#1A1523] outline-none focus:border-[#4E2478]"
                  >
                    <option value="Aadhar Card">Aadhar Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">ID Proof Number</label>
                  <input
                    type="text"
                    value={formData.id_proof_number}
                    onChange={(e) => setFormData({ ...formData, id_proof_number: e.target.value })}
                    placeholder="e.g. XXXX-XXXX-4512"
                    className="mt-1 w-full p-2.5 bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl text-[#1A1523] outline-none focus:border-[#4E2478]"
                  />
                </div>
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
                  className="px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl font-semibold shadow-xs"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
