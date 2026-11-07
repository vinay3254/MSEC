import React, { useEffect, useState } from 'react';
import { hostelService } from '../services/hostelService';
import { studentService } from '../services/studentService';
import { AttendanceRecord, AttendanceDailySummary, GatePass, User } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import {
  CalendarCheck,
  Clock,
  UserX,
  FileCheck2,
  Plus,
  CheckCircle,
  XCircle,
  RotateCcw,
  Calendar,
  X,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'outings'>('attendance');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<AttendanceDailySummary | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);

  // New Outpass Modal
  const [showOutingModal, setShowOutingModal] = useState(false);
  const [outingStudentId, setOutingStudentId] = useState<number | ''>('');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [expectedReturnTime, setExpectedReturnTime] = useState('');

  const loadAttendanceData = () => {
    setLoading(true);
    Promise.all([
      hostelService.getAttendanceSummary(selectedDate),
      hostelService.getAttendance({ date: selectedDate }),
      studentService.getStudents(),
      hostelService.getGatePasses(),
    ])
      .then(([summaryData, attData, studentData, passData]) => {
        setSummary(summaryData);
        setAttendanceList(attData);
        setStudents(studentData);
        setPasses(passData);
        if (studentData.length > 0 && !outingStudentId) {
          setOutingStudentId(studentData[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const handleMarkStatus = async (studentId: number, status: 'present' | 'absent' | 'late' | 'on_leave') => {
    try {
      await hostelService.markAttendance({
        student_id: studentId,
        date: selectedDate,
        status,
      });
      loadAttendanceData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record attendance');
    }
  };

  const handleApplyOuting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outingStudentId) return;

    try {
      await hostelService.applyGatePass(Number(outingStudentId), {
        destination,
        reason,
        departure_time: new Date(departureTime).toISOString(),
        expected_return_time: new Date(expectedReturnTime).toISOString(),
      });
      setShowOutingModal(false);
      setDestination('');
      setReason('');
      loadAttendanceData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit outing application');
    }
  };

  const handlePassStatus = async (passId: number, status: string) => {
    try {
      await hostelService.updateGatePassStatus(passId, { status }, 'Warden Office');
      loadAttendanceData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update outing permission');
    }
  };

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Attendance & Outing Permissions
          </h1>
          <p className="text-sm text-[#5C5468] mt-1 font-body">
            Daily roll-call attendance, student absences, late arrivals, and digital outpass records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'outings' ? (
            <button
              onClick={() => setShowOutingModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
            >
              <Plus className="w-4 h-4" /> Apply Leave / Outing
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E3DEE9] shadow-2xs">
              <Calendar className="w-4 h-4 text-[#4E2478]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold text-[#1A1523] bg-transparent outline-none font-body"
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher matching crimson indicator */}
      <div className="flex border-b border-[#E3DEE9] gap-6">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition relative font-body ${
            activeTab === 'attendance'
              ? 'text-[#4E2478] border-b-2 border-[#F30137]'
              : 'text-[#5C5468] hover:text-[#1A1523]'
          }`}
        >
          Daily Roll-Call Attendance
        </button>
        <button
          onClick={() => setActiveTab('outings')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition relative font-body ${
            activeTab === 'outings'
              ? 'text-[#4E2478] border-b-2 border-[#F30137]'
              : 'text-[#5C5468] hover:text-[#1A1523]'
          }`}
        >
          Outings & Weekend Leave ({passes.length})
        </button>
      </div>

      {/* TAB 1: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="PRESENT IN HOSTEL"
              value={summary?.present_count ?? 3}
              subtitle={`${summary?.attendance_rate ?? 75}% roll call turnout`}
              icon={CalendarCheck}
              iconBg="bg-[#E8F5EF]"
              iconColor="text-[#1C8A5C]"
              iconBorder="border-[#b5e2ce]"
            />
            <StatCard
              title="LATE ENTRIES"
              value={summary?.late_count ?? 1}
              subtitle="After 08:30 PM curfew"
              icon={Clock}
              iconBg="bg-[#FCF3E6]"
              iconColor="text-[#D98B16]"
              iconBorder="border-[#fae3be]"
            />
            <StatCard
              title="UNAUTHORIZED ABSENCE"
              value={summary?.absent_count ?? 0}
              subtitle="Unreported absences"
              icon={UserX}
              iconBg="bg-[#FDE2E7]"
              iconColor="text-[#F30137]"
              iconBorder="border-[#f8bcc7]"
            />
            <StatCard
              title="APPROVED LEAVE"
              value={summary?.leave_count ?? 0}
              subtitle="With parent confirmation"
              icon={FileCheck2}
              iconBg="bg-[#E9F0F8]"
              iconColor="text-[#2563A6]"
              iconBorder="border-[#c5daf0]"
            />
          </div>

          {loading ? (
            <Loader message="Loading attendance roll-call records..." />
          ) : (
            <div className="bg-white rounded-xl border border-[#E3DEE9] shadow-2xs overflow-hidden">
              <div className="p-4 bg-[#FAF8FC] border-b border-[#E3DEE9] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1523] font-heading">
                    Resident Roll-Call Sheet ({selectedDate})
                  </h3>
                  <p className="text-[11px] text-[#5C5468]">
                    Click any status tag below to instantly record or update student presence.
                  </p>
                </div>
                <Badge variant="primary">
                  {students.length} Total Registered
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#1A1523]">
                  <thead className="bg-[#FAF8FC] border-b border-[#E3DEE9] text-[11px] font-semibold uppercase text-[#5C5468]">
                    <tr>
                      <th className="px-6 py-3.5">Student Details</th>
                      <th className="px-6 py-3.5">Register Number</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Current Status</th>
                      <th className="px-6 py-3.5 text-right">Quick Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3DEE9]/70">
                    {students.map((student) => {
                      const record = attendanceList.find((a) => a.student_id === student.id);
                      const currentStatus = record?.status || 'unmarked';

                      return (
                        <tr key={student.id} className="hover:bg-[#EDE4F5]/30 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-[#1A1523]">{student.full_name}</div>
                            <div className="text-[11px] text-[#5C5468]">{student.email}</div>
                          </td>
                          <td className="px-6 py-3.5 font-mono text-xs font-medium text-[#1A1523]">
                            {student.register_number || 'N/A'}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="font-medium text-[#1A1523]">{student.department}</span>
                            <span className="block text-[10px] text-[#5C5468]">
                              Year {student.year_of_study}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <Badge
                              variant={
                                currentStatus === 'present'
                                  ? 'success'
                                  : currentStatus === 'late'
                                  ? 'warning'
                                  : currentStatus === 'absent'
                                  ? 'danger'
                                  : currentStatus === 'on_leave'
                                  ? 'info'
                                  : 'neutral'
                              }
                              className="capitalize font-semibold"
                            >
                              {currentStatus.replace('_', ' ')}
                            </Badge>
                            {record?.remarks && (
                              <span className="block text-[10px] text-[#5C5468] mt-0.5">
                                {record.remarks}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="inline-flex rounded-lg border border-[#E3DEE9] p-0.5 bg-[#FAF8FC] gap-0.5">
                              <button
                                onClick={() => handleMarkStatus(student.id, 'present')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                                  currentStatus === 'present'
                                    ? 'bg-[#1C8A5C] text-white shadow-xs'
                                    : 'text-[#1C8A5C] hover:bg-[#E8F5EF]'
                                }`}
                              >
                                <CheckCircle className="w-3 h-3" /> Present
                              </button>
                              <button
                                onClick={() => handleMarkStatus(student.id, 'late')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                                  currentStatus === 'late'
                                    ? 'bg-[#D98B16] text-white shadow-xs'
                                    : 'text-[#D98B16] hover:bg-[#FCF3E6]'
                                }`}
                              >
                                <Clock className="w-3 h-3" /> Late
                              </button>
                              <button
                                onClick={() => handleMarkStatus(student.id, 'on_leave')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                                  currentStatus === 'on_leave'
                                    ? 'bg-[#2563A6] text-white shadow-xs'
                                    : 'text-[#2563A6] hover:bg-[#E9F0F8]'
                                }`}
                              >
                                <Calendar className="w-3 h-3" /> Leave
                              </button>
                              <button
                                onClick={() => handleMarkStatus(student.id, 'absent')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                                  currentStatus === 'absent'
                                    ? 'bg-[#F30137] text-white shadow-xs'
                                    : 'text-[#F30137] hover:bg-[#FDE2E7]'
                                }`}
                              >
                                <XCircle className="w-3 h-3" /> Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OUTINGS & LEAVE */}
      {activeTab === 'outings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E3DEE9] shadow-2xs overflow-hidden">
            <div className="p-4 bg-[#FAF8FC] border-b border-[#E3DEE9]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1523] font-heading">
                Outpass & Weekend Leave Records
              </h3>
              <p className="text-[11px] text-[#5C5468]">
                Student outpass approval, parent consent verification, and gate log returns.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1A1523]">
                <thead className="bg-[#FAF8FC] border-b border-[#E3DEE9] text-[11px] font-semibold uppercase text-[#5C5468]">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Destination & Reason</th>
                    <th className="px-6 py-4">Departure Time</th>
                    <th className="px-6 py-4">Expected Return</th>
                    <th className="px-6 py-4">Parent Consent</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3DEE9]/70">
                  {passes.map((p) => (
                    <tr key={p.id} className="hover:bg-[#EDE4F5]/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-[#1A1523]">
                          {p.student?.full_name || `Student #${p.student_id}`}
                        </div>
                        <span className="text-[10px] text-[#5C5468] font-mono">
                          {p.student?.register_number}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-[#1A1523]">{p.destination}</p>
                        <p className="text-[11px] text-[#5C5468] line-clamp-1">{p.reason}</p>
                      </td>
                      <td className="px-6 py-3.5 text-[#5C5468]">
                        {new Date(p.departure_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-[#5C5468]">
                        {new Date(p.expected_return_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-[11px] font-semibold text-[#1C8A5C] bg-[#E8F5EF] px-2 py-0.5 rounded-md border border-[#b5e2ce]">
                          {p.parent_consent}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            p.status === 'approved'
                              ? 'success'
                              : p.status === 'pending'
                              ? 'accent'
                              : p.status === 'returned'
                              ? 'info'
                              : 'danger'
                          }
                          className="capitalize"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handlePassStatus(p.id, 'approved')}
                                className="p-1.5 text-[#1C8A5C] hover:bg-[#E8F5EF] rounded-lg transition"
                                title="Approve Leave"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePassStatus(p.id, 'rejected')}
                                className="p-1.5 text-[#F30137] hover:bg-[#FDE2E7] rounded-lg transition"
                                title="Reject Leave"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {p.status === 'approved' && (
                            <button
                              onClick={() => handlePassStatus(p.id, 'returned')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#4E2478] bg-[#EDE4F5] hover:bg-[#4E2478] hover:text-white rounded-lg transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Mark Returned
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Outing Modal */}
      {showOutingModal && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DEE9]">
              <h3 className="text-base font-bold text-[#1A1523] font-heading">
                New Leave & Outing Permission Request
              </h3>
              <button onClick={() => setShowOutingModal(false)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyOuting} className="mt-4 space-y-4 text-xs font-body">
              <div>
                <label className="block font-medium text-[#1A1523]">Resident Student</label>
                <select
                  value={outingStudentId}
                  onChange={(e) => setOutingStudentId(Number(e.target.value))}
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
                <label className="block font-medium text-[#1A1523]">Destination / Home Location</label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Coimbatore Residence"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Reason for Outing / Leave</label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Family festival visit and weekend stay"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Departure Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Expected Return</label>
                  <input
                    type="datetime-local"
                    required
                    value={expectedReturnTime}
                    onChange={(e) => setExpectedReturnTime(e.target.value)}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3DEE9]">
                <button
                  type="button"
                  onClick={() => setShowOutingModal(false)}
                  className="px-4 py-2 text-[#5C5468] hover:text-[#1A1523]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl font-semibold shadow-xs"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
