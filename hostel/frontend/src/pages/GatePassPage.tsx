import React, { useEffect, useState } from 'react';
import { hostelService } from '../services/hostelService';
import { studentService } from '../services/studentService';
import { GatePass, User } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Loader } from '../components/common/Loader';
import { FileCheck2, Plus, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

export const GatePassPage: React.FC = () => {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [studentId, setStudentId] = useState<number | ''>('');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [expectedReturnTime, setExpectedReturnTime] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([hostelService.getGatePasses(), studentService.getStudents()])
      .then(([passData, studentData]) => {
        setPasses(passData);
        setStudents(studentData);
        if (studentData.length > 0 && !studentId) {
          setStudentId(studentData[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    try {
      await hostelService.applyGatePass(Number(studentId), {
        destination,
        reason,
        departure_time: new Date(departureTime).toISOString(),
        expected_return_time: new Date(expectedReturnTime).toISOString(),
      });
      setShowModal(false);
      setDestination('');
      setReason('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit gate pass request');
    }
  };

  const handleStatusChange = async (passId: number, status: string) => {
    try {
      await hostelService.updateGatePassStatus(passId, { status }, 'Warden Office');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update pass');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Digital Gate Pass & Outpass
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Outpass applications, warden approval workflow, and campus return tracking.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Request Outpass
        </button>
      </div>

      {loading ? (
        <Loader message="Loading gate pass records..." />
      ) : passes.length === 0 ? (
        <Card className="text-center py-12">
          <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No gate passes issued</h3>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Destination & Reason</th>
                <th className="px-6 py-4">Out Time</th>
                <th className="px-6 py-4">Expected Return</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {passes.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {p.student?.full_name || `#${p.student_id}`}
                    <span className="block text-xs font-normal text-slate-400">
                      {p.student?.register_number}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{p.destination}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{p.reason}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {new Date(p.departure_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {new Date(p.expected_return_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        p.status === 'approved'
                          ? 'success'
                          : p.status === 'pending'
                          ? 'warning'
                          : p.status === 'returned'
                          ? 'info'
                          : 'danger'
                      }
                      className="capitalize"
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(p.id, 'approved')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Approve Pass"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.id, 'rejected')}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Reject Pass"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {p.status === 'approved' && (
                        <button
                          onClick={() => handleStatusChange(p.id, 'returned')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Mark In
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Pass Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">New Outpass Request</h2>
            <form onSubmit={handleApplyPass} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Student</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(Number(e.target.value))}
                  className="mt-1 w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50"
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
                <label className="block text-xs font-medium text-slate-700">Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Chennai Central Railway Station"
                  className="mt-1 w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Reason for Leaving Campus
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Going home for semester holidays"
                  className="mt-1 w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Departure Time</label>
                  <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Expected Return
                  </label>
                  <input
                    type="datetime-local"
                    value={expectedReturnTime}
                    onChange={(e) => setExpectedReturnTime(e.target.value)}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  Submit Outpass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
