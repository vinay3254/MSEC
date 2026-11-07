import React, { useEffect, useState } from 'react';
import { hostelService } from '../services/hostelService';
import { HostelBlock, Room } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Loader } from '../components/common/Loader';
import { Building2, Plus, Filter, BedDouble, Wind, X } from 'lucide-react';

export const RoomsPage: React.FC = () => {
  const [blocks, setBlocks] = useState<HostelBlock[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newFloor, setNewFloor] = useState(1);
  const [newCapacity, setNewCapacity] = useState(4);
  const [newRoomType, setNewRoomType] = useState<'ac' | 'non_ac'>('non_ac');
  const [newBlockId, setNewBlockId] = useState<number>(1);

  const fetchRooms = () => {
    setLoading(true);
    Promise.all([
      hostelService.getBlocks(),
      hostelService.getRooms({
        block_id: selectedBlockId,
        status: statusFilter || undefined,
      }),
    ])
      .then(([blocksData, roomsData]) => {
        setBlocks(blocksData);
        setRooms(roomsData);
        if (blocksData.length > 0 && !newBlockId) {
          setNewBlockId(blocksData[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedBlockId, statusFilter]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hostelService.createRoom({
        block_id: newBlockId,
        room_number: newRoomNumber,
        floor: newFloor,
        capacity: newCapacity,
        room_type: newRoomType,
        status: 'available',
      });
      setShowAddModal(false);
      setNewRoomNumber('');
      fetchRooms();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create room');
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Hostel Rooms & Wing Matrix
          </h1>
          <p className="text-sm text-[#5C5468] mt-1 font-body">
            Manage bed capacities, live vacancies, and AC/Non-AC room configurations.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
        >
          <Plus className="w-4 h-4" /> Add New Room
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#E3DEE9] shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[#5C5468] text-xs font-medium">
          <Filter className="w-4 h-4 text-[#4E2478]" /> Filter Wings:
        </div>

        {/* Block Selector */}
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedBlockId(undefined)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedBlockId === undefined
                ? 'bg-[#4E2478] text-white shadow-2xs'
                : 'bg-[#FAF8FC] text-[#5C5468] border border-[#E3DEE9] hover:bg-[#EDE4F5]'
            }`}
          >
            All Wings
          </button>
          {blocks.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBlockId(b.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedBlockId === b.id
                  ? 'bg-[#4E2478] text-white shadow-2xs'
                  : 'bg-[#FAF8FC] text-[#5C5468] border border-[#E3DEE9] hover:bg-[#EDE4F5]'
              }`}
            >
              {b.name} ({b.code})
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ml-auto text-xs border border-[#E3DEE9] rounded-xl px-3 py-1.5 bg-[#FAF8FC] text-[#1A1523] focus:outline-none focus:border-[#4E2478]"
        >
          <option value="">All Statuses</option>
          <option value="available">Available Rooms</option>
          <option value="occupied">Fully Occupied</option>
          <option value="maintenance">Under Maintenance</option>
        </select>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <Loader message="Loading hostel rooms matrix..." />
      ) : rooms.length === 0 ? (
        <Card className="text-center py-12">
          <Building2 className="w-12 h-12 text-[#5C5468]/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#1A1523] font-heading">No rooms found</h3>
          <p className="text-xs text-[#5C5468] mt-1">
            Try adjusting your block or status filters.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isFull = room.occupied_count >= room.capacity;
            const availableBeds = Math.max(0, room.capacity - room.occupied_count);

            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-[#E3DEE9] p-5 shadow-2xs hover:border-[#4E2478]/50 transition-all hover:shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#FAF8FC] border border-[#E3DEE9] text-[#5C5468]">
                      Floor {room.floor}
                    </span>
                    <Badge
                      variant={
                        room.status === 'available'
                          ? 'success'
                          : room.status === 'occupied'
                          ? 'primary'
                          : 'danger'
                      }
                    >
                      {room.status}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold text-[#1A1523] font-heading">
                      Room {room.room_number}
                    </h3>
                    <div className="text-xs font-semibold text-[#5C5468]">
                      {room.room_type === 'ac' ? (
                        <span className="flex items-center gap-1 text-[#2563A6] bg-[#E9F0F8] px-2 py-0.5 rounded-full border border-[#c5daf0]">
                          <Wind className="w-3 h-3" /> AC
                        </span>
                      ) : (
                        <span className="text-[#5C5468] bg-[#FAF8FC] px-2 py-0.5 rounded-full border border-[#E3DEE9]">
                          Non-AC
                        </span>
                      )}
                    </div>
                  </div>

                  {room.block_name && (
                    <p className="text-xs text-[#5C5468] mt-1 font-body">{room.block_name}</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#E3DEE9]">
                  <div className="flex justify-between items-center text-xs font-semibold text-[#1A1523] mb-2 font-body">
                    <span className="flex items-center gap-1.5 text-[#5C5468]">
                      <BedDouble className="w-3.5 h-3.5 text-[#4E2478]" />
                      Bed Capacity:
                    </span>
                    <span>
                      {room.occupied_count} / {room.capacity}
                    </span>
                  </div>

                  {/* Bed Capacity Bar */}
                  <div className="w-full h-2 bg-[#FAF8FC] rounded-full overflow-hidden border border-[#E3DEE9]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFull ? 'bg-[#4E2478]' : 'bg-[#1C8A5C]'
                      }`}
                      style={{ width: `${(room.occupied_count / room.capacity) * 100}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-[#5C5468] mt-2 text-right">
                    {availableBeds > 0 ? (
                      <span className="text-[#1C8A5C] font-semibold">{availableBeds} bed(s) vacant</span>
                    ) : (
                      <span className="text-[#F30137] font-semibold">Fully booked</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DEE9]">
              <h2 className="text-base font-bold text-[#1A1523] font-heading">Create Room Entry</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#5C5468] mt-1 font-body">
              Add a residential room to an MSEC hostel wing.
            </p>

            <form onSubmit={handleCreateRoom} className="mt-4 space-y-4 text-xs font-body">
              <div>
                <label className="block font-medium text-[#1A1523]">Hostel Block</label>
                <select
                  value={newBlockId}
                  onChange={(e) => setNewBlockId(Number(e.target.value))}
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  required
                >
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Room Number</label>
                  <input
                    type="text"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder="e.g. 301"
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Floor</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newFloor}
                    onChange={(e) => setNewFloor(Number(e.target.value))}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Bed Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Room Type</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value as any)}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] focus:border-[#4E2478] outline-none"
                  >
                    <option value="non_ac">Non-AC</option>
                    <option value="ac">Air Conditioned (AC)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3DEE9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-[#5C5468] hover:text-[#1A1523]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl font-semibold shadow-xs"
                >
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
