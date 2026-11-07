import React, { useEffect, useState } from 'react';
import { hostelService } from '../services/hostelService';
import { studentService } from '../services/studentService';
import { Allocation, Room, User } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Loader } from '../components/common/Loader';
import { KeyRound, Plus, LogOut, ArrowRightLeft, X } from 'lucide-react';

export const AllocationsPage: React.FC = () => {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New Allocation Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');
  const [bedNumber, setBedNumber] = useState('Bed-A');

  // Room Transfer Modal
  const [transferAlloc, setTransferAlloc] = useState<Allocation | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<number | ''>('');
  const [targetBedNumber, setTargetBedNumber] = useState('Bed-A');
  const [transferRemarks, setTransferRemarks] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      hostelService.getAllocations(),
      hostelService.getRooms({ status: 'available' }),
      studentService.getStudents(),
    ])
      .then(([allocData, roomData, studentData]) => {
        setAllocations(allocData);
        setRooms(roomData);
        setStudents(studentData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedRoomId) return;

    try {
      await hostelService.allocateRoom({
        student_id: Number(selectedStudentId),
        room_id: Number(selectedRoomId),
        bed_number: bedNumber,
      });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to allocate bed');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAlloc || !targetRoomId) return;

    try {
      await hostelService.transferRoom(transferAlloc.id, {
        new_room_id: Number(targetRoomId),
        new_bed_number: targetBedNumber,
        remarks: transferRemarks,
      });
      setTransferAlloc(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to transfer room');
    }
  };

  const handleVacate = async (allocationId: number) => {
    if (!window.confirm('Confirm student check-out and vacate this bed?')) return;
    try {
      await hostelService.vacateRoom(allocationId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to vacate room');
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Room Allocations & Bed Transfers
          </h1>
          <p className="text-sm text-[#5C5468] mt-1 font-body">
            Manage bed assignments, room transfers, and check-in/check-out records.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
        >
          <Plus className="w-4 h-4" /> New Bed Allocation
        </button>
      </div>

      {loading ? (
        <Loader message="Loading room allocations & check-in files..." />
      ) : allocations.length === 0 ? (
        <Card className="text-center py-12">
          <KeyRound className="w-12 h-12 text-[#5C5468]/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#1A1523] font-heading">No active allocations found</h3>
          <p className="text-xs text-[#5C5468] mt-1">Allocate students to available beds.</p>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3DEE9] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1A1523]">
              <thead className="bg-[#FAF8FC] border-b border-[#E3DEE9] text-[11px] font-semibold uppercase text-[#5C5468]">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Reg Number</th>
                  <th className="px-6 py-4">Assigned Wing & Room</th>
                  <th className="px-6 py-4">Bed Unit</th>
                  <th className="px-6 py-4">Check-In Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DEE9]/70">
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-[#EDE4F5]/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-[#1A1523]">
                        {alloc.student?.full_name || `Student #${alloc.student_id}`}
                      </div>
                      <div className="text-[11px] text-[#5C5468]">{alloc.student?.department}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs font-medium text-[#1A1523]">
                      {alloc.student?.register_number || 'N/A'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-[#4E2478]">
                        Room {alloc.room?.room_number || alloc.room_id}
                      </span>
                      {alloc.room?.block_name && (
                        <span className="block text-[11px] text-[#5C5468]">{alloc.room.block_name}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant="primary" className="font-semibold">
                        {alloc.bed_number}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-[#5C5468]">
                      {alloc.allocated_at ? new Date(alloc.allocated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setTransferAlloc(alloc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#EDE4F5] hover:bg-[#4E2478] hover:text-white text-[#4E2478] rounded-lg text-xs font-semibold transition"
                          title="Transfer Room"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                        </button>
                        <button
                          onClick={() => handleVacate(alloc.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FDE2E7] hover:bg-[#F30137] hover:text-white text-[#F30137] rounded-lg text-xs font-semibold transition"
                          title="Check-Out / Vacate"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Check-Out
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Transfer Modal */}
      {transferAlloc && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DEE9]">
              <h3 className="text-base font-bold text-[#1A1523] font-heading flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#4E2478]" /> Room Transfer Request
              </h3>
              <button onClick={() => setTransferAlloc(null)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#5C5468] mt-1 font-body">
              Transfer <strong>{transferAlloc.student?.full_name}</strong> from current Room{' '}
              {transferAlloc.room?.room_number} to a new vacant bed.
            </p>

            <form onSubmit={handleTransfer} className="mt-4 space-y-4 text-xs font-body">
              <div>
                <label className="block font-medium text-[#1A1523]">Select Destination Room</label>
                <select
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(Number(e.target.value))}
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  required
                >
                  <option value="">Choose an available room...</option>
                  {rooms
                    .filter((r) => r.id !== transferAlloc.room_id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} ({r.block_name}) — {r.capacity - r.occupied_count} beds free
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Bed Assignment</label>
                <select
                  value={targetBedNumber}
                  onChange={(e) => setTargetBedNumber(e.target.value)}
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                >
                  <option value="Bed-A">Bed-A</option>
                  <option value="Bed-B">Bed-B</option>
                  <option value="Bed-C">Bed-C</option>
                  <option value="Bed-D">Bed-D</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Transfer Reason / Remarks</label>
                <textarea
                  rows={2}
                  value={transferRemarks}
                  onChange={(e) => setTransferRemarks(e.target.value)}
                  placeholder="e.g. Mutual room swap or wing discipline relocation"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3DEE9]">
                <button
                  type="button"
                  onClick={() => setTransferAlloc(null)}
                  className="px-4 py-2 text-[#5C5468] hover:text-[#1A1523]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl font-semibold shadow-xs"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Bed Allocation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DEE9]">
              <h3 className="text-base font-bold text-[#1A1523] font-heading">
                Allocate Student to Bed
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#5C5468] mt-1 font-body">
              Assign an admitted resident to an available hostel room bed.
            </p>

            <form onSubmit={handleAllocate} className="mt-4 space-y-4 text-xs font-body">
              <div>
                <label className="block font-medium text-[#1A1523]">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  required
                >
                  <option value="">Choose resident student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.register_number || s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Select Available Room</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  required
                >
                  <option value="">Choose available room...</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} ({r.block_name}) — {r.capacity - r.occupied_count} beds free
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Bed Identifier</label>
                <select
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                >
                  <option value="Bed-A">Bed-A</option>
                  <option value="Bed-B">Bed-B</option>
                  <option value="Bed-C">Bed-C</option>
                  <option value="Bed-D">Bed-D</option>
                </select>
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
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
