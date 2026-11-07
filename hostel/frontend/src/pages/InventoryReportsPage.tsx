import React, { useEffect, useState } from 'react';
import { hostelService } from '../services/hostelService';
import { InventoryItem, OperationalReportsSummary } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import {
  Boxes,
  Plus,
  Printer,
  CheckCircle,
  AlertTriangle,
  Search,
  X,
  FileText,
} from 'lucide-react';

export const InventoryReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'reports'>('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reports, setReports] = useState<OperationalReportsSummary | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'furniture',
    room_number: 'All Rooms',
    quantity: 1,
    condition: 'good',
    remarks: '',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      hostelService.getInventory({
        category: categoryFilter || undefined,
        condition: conditionFilter || undefined,
      }),
      hostelService.getReportsSummary(),
    ])
      .then(([invData, repData]) => {
        setItems(invData);
        setReports(repData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, conditionFilter]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hostelService.addInventoryItem({
        ...formData,
        quantity: Number(formData.quantity),
      } as any);
      setShowAddModal(false);
      setFormData({
        item_name: '',
        category: 'furniture',
        room_number: 'All Rooms',
        quantity: 1,
        condition: 'good',
        remarks: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add inventory item');
    }
  };

  const filteredItems = items.filter((i) => {
    if (!search) return true;
    return (
      i.item_name.toLowerCase().includes(search.toLowerCase()) ||
      (i.room_number && i.room_number.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalQuantity = items.reduce((acc, i) => acc + i.quantity, 0);
  const repairCount = items
    .filter((i) => i.condition === 'needs_repair' || i.condition === 'damaged')
    .reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Hostel Inventory & Operations Reports
          </h1>
          <p className="text-sm text-[#5C5468] mt-1 font-body">
            Track furniture, electrical equipment, supplies, and generate comprehensive operational reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'inventory' ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
            >
              <Plus className="w-4 h-4" /> Add Asset / Item
            </button>
          ) : (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
            >
              <Printer className="w-4 h-4" /> Print Full Operational Report
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E3DEE9] gap-6">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition relative font-body inline-flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'text-[#4E2478] border-b-2 border-[#F30137]'
              : 'text-[#5C5468] hover:text-[#1A1523]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Hostel Furniture & Equipment ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition relative font-body inline-flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'text-[#4E2478] border-b-2 border-[#F30137]'
              : 'text-[#5C5468] hover:text-[#1A1523]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Executive Operational Reports
        </button>
      </div>

      {/* TAB 1: INVENTORY TRACKING */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="TOTAL TRACKED ASSETS"
              value={totalQuantity}
              subtitle="Hostel cots, desks, fans, supplies"
              icon={Boxes}
              iconBg="bg-[#EDE4F5]"
              iconColor="text-[#4E2478]"
              iconBorder="border-[#EDE4F5]"
            />
            <StatCard
              title="SERVICEABLE ASSETS"
              value={totalQuantity - repairCount}
              subtitle="In good working order"
              icon={CheckCircle}
              iconBg="bg-[#E8F5EF]"
              iconColor="text-[#1C8A5C]"
              iconBorder="border-[#b5e2ce]"
            />
            <StatCard
              title="REPAIR / INSPECTION REQUIRED"
              value={repairCount}
              subtitle="Damaged or loose fittings"
              icon={AlertTriangle}
              iconBg="bg-[#FDE2E7]"
              iconColor="text-[#F30137]"
              iconBorder="border-[#f8bcc7]"
            />
          </div>

          {/* Search & Category Filter */}
          <div className="bg-white p-4 rounded-xl border border-[#E3DEE9] shadow-2xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#5C5468] absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search inventory assets by name or room location..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF8FC] border border-[#E3DEE9] rounded-xl outline-none text-[#1A1523] placeholder-[#5C5468] focus:border-[#4E2478] font-body"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-[#E3DEE9] rounded-xl px-3 py-2 bg-[#FAF8FC] text-[#1A1523] font-body focus:border-[#4E2478] outline-none"
              >
                <option value="">All Categories</option>
                <option value="furniture">Furniture</option>
                <option value="electrical">Electrical</option>
                <option value="facility">Facilities</option>
                <option value="supplies">Supplies</option>
              </select>

              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="text-xs border border-[#E3DEE9] rounded-xl px-3 py-2 bg-[#FAF8FC] text-[#1A1523] font-body focus:border-[#4E2478] outline-none"
              >
                <option value="">All Conditions</option>
                <option value="good">Good Condition</option>
                <option value="needs_repair">Needs Repair</option>
                <option value="damaged">Damaged</option>
                <option value="new">Brand New</option>
              </select>
            </div>
          </div>

          {/* Inventory Table */}
          {loading ? (
            <Loader message="Loading hostel inventory records..." />
          ) : filteredItems.length === 0 ? (
            <Card className="text-center py-12">
              <Boxes className="w-12 h-12 text-[#5C5468]/30 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-[#1A1523] font-heading">No items found</h3>
            </Card>
          ) : (
            <div className="bg-white rounded-xl border border-[#E3DEE9] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#1A1523] font-body">
                  <thead className="bg-[#FAF8FC] border-b border-[#E3DEE9] text-[11px] font-semibold uppercase text-[#5C5468]">
                    <tr>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Wing / Room Location</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Condition</th>
                      <th className="px-6 py-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3DEE9]/70">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#EDE4F5]/30 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-[#1A1523]">
                          {item.item_name}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant="primary" className="capitalize">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-[#5C5468] font-medium">
                          {item.room_number || 'Hostel Campus'}
                        </td>
                        <td className="px-6 py-3.5 font-bold font-heading text-[#1A1523]">
                          {item.quantity} Units
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge
                            variant={
                              item.condition === 'good' || item.condition === 'new'
                                ? 'success'
                                : item.condition === 'needs_repair'
                                ? 'warning'
                                : 'danger'
                            }
                            className="capitalize"
                          >
                            {item.condition.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-[#5C5468] text-[11px]">
                          {item.remarks || 'Standard asset verified'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OPERATIONAL REPORTS */}
      {activeTab === 'reports' && reports && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-[#E3DEE9] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[#5C5468] font-body">
                Generated on: <strong>{new Date(reports.generated_at).toLocaleString()}</strong>
              </p>
              <h3 className="text-base font-bold text-[#1A1523] font-heading mt-0.5">
                Consolidated MSEC Hostel Operations Report
              </h3>
            </div>
            <Badge variant="success">All Systems Operational</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Occupancy Report */}
            <Card title="1. Occupancy & Room Capacity Report" description="Wing-wise student residency">
              <div className="space-y-4 font-body">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#5C5468]">Overall Campus Occupancy:</span>
                  <span className="font-bold text-[#4E2478] font-heading text-sm">
                    {reports.occupancy.overall_occupancy_rate}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]">
                    <span className="text-[#5C5468] block">Occupied Rooms</span>
                    <span className="font-bold text-[#1A1523] font-heading text-base">
                      {reports.occupancy.occupied_rooms} / {reports.occupancy.total_rooms}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]">
                    <span className="text-[#5C5468] block">Vacant Rooms</span>
                    <span className="font-bold text-[#1C8A5C] font-heading text-base">
                      {reports.occupancy.available_rooms} Available
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E3DEE9]">
                  <p className="text-[11px] font-bold text-[#5C5468] uppercase">Wing Breakdown:</p>
                  {reports.occupancy.blocks.map((b) => (
                    <div key={b.code} className="flex justify-between text-xs py-1 border-b border-[#E3DEE9]">
                      <span className="font-medium text-[#1A1523]">{b.block_name} ({b.code})</span>
                      <span className="font-semibold text-[#4E2478]">{b.occupied_beds}/{b.total_beds} Beds ({b.occupancy_rate}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* 2. Attendance Report */}
            <Card title="2. Attendance & Resident Presence Report" description="Roll-call accountability">
              <div className="space-y-4 font-body">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#5C5468]">Daily Attendance Average:</span>
                  <span className="font-bold text-[#1C8A5C] font-heading text-sm">
                    {reports.attendance.attendance_rate}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[#E8F5EF] rounded-xl border border-[#b5e2ce]">
                    <span className="text-[#1C8A5C] block font-semibold">Present in Hostel</span>
                    <span className="font-bold text-[#1A1523] font-heading text-base">
                      {reports.attendance.present_count} Students
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#FDE2E7] rounded-xl border border-[#f8bcc7]">
                    <span className="text-[#F30137] block font-semibold">Absences Logged</span>
                    <span className="font-bold text-[#1A1523] font-heading text-base">
                      {reports.attendance.absent_count} Students
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#5C5468] bg-[#FAF8FC] p-3 rounded-xl border border-[#E3DEE9]">
                  Biometric attendance roll-call is captured nightly at 08:30 PM. All authorized weekend leaves are pre-cleared with parental SMS consent.
                </p>
              </div>
            </Card>

            {/* 3. Fee Finances Report */}
            <Card title="3. Financial & Fee Dues Collection Report" description="Hostel & dining revenues">
              <div className="space-y-4 font-body">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#5C5468]">Collection Efficiency:</span>
                  <span className="font-bold text-[#1C8A5C] font-heading text-sm">
                    {reports.finances.collection_rate}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]">
                    <span className="text-[#5C5468] block">Total Collected</span>
                    <span className="font-bold text-[#1C8A5C] font-heading text-base">
                      ₹{reports.finances.total_collected.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]">
                    <span className="text-[#5C5468] block">Pending Outstanding</span>
                    <span className="font-bold text-[#F30137] font-heading text-base">
                      ₹{reports.finances.total_pending.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-[#5C5468]">
                  <span>Overdue Student Accounts:</span>
                  <Badge variant="danger">{reports.finances.overdue_count} Overdue</Badge>
                </div>
              </div>
            </Card>

            {/* 4. Maintenance & Inventory Report */}
            <Card title="4. Maintenance SLA & Inventory Health" description="Repair resolution & asset status">
              <div className="space-y-4 font-body">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#5C5468]">Ticket Resolution Rate:</span>
                  <span className="font-bold text-[#1C8A5C] font-heading text-sm">
                    {reports.maintenance.resolution_rate}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9] text-center">
                    <span className="text-[#5C5468] text-[10px] block">Resolved</span>
                    <span className="font-bold text-[#1C8A5C] font-heading">{reports.maintenance.resolved}</span>
                  </div>
                  <div className="p-2 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9] text-center">
                    <span className="text-[#5C5468] text-[10px] block">In Progress</span>
                    <span className="font-bold text-[#2563A6] font-heading">{reports.maintenance.in_progress}</span>
                  </div>
                  <div className="p-2 bg-[#FAF8FC] rounded-xl border border-[#E3DEE9] text-center">
                    <span className="text-[#5C5468] text-[10px] block">Pending</span>
                    <span className="font-bold text-[#D98B16] font-heading">{reports.maintenance.pending}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#EDE4F5]/60 rounded-xl border border-[#E3DEE9] flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-[#4E2478] block">Asset Serviceability</span>
                    <span className="text-[11px] text-[#5C5468]">{reports.inventory.total_items} total tracked units</span>
                  </div>
                  <span className="text-base font-bold text-[#4E2478] font-heading">
                    {reports.inventory.serviceable_rate}% Good
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Add Inventory Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1A1523]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3DEE9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DEE9]">
              <h3 className="text-base font-bold text-[#1A1523] font-heading">Add Hostel Inventory Asset</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#5C5468] hover:text-[#F30137]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="mt-4 space-y-4 text-xs font-body">
              <div>
                <label className="block font-medium text-[#1A1523]">Item / Equipment Name</label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="e.g. Havells 400mm Wall Fan"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] outline-none focus:border-[#4E2478]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] outline-none focus:border-[#4E2478]"
                  >
                    <option value="furniture">Furniture</option>
                    <option value="electrical">Electrical</option>
                    <option value="facility">Facility</option>
                    <option value="supplies">Supplies</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] outline-none focus:border-[#4E2478]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1A1523]">Location / Room</label>
                  <input
                    type="text"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="e.g. Kaveri Wing / Room 201"
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] outline-none focus:border-[#4E2478]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1A1523]">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] outline-none focus:border-[#4E2478]"
                  >
                    <option value="good">Good Condition</option>
                    <option value="needs_repair">Needs Repair</option>
                    <option value="damaged">Damaged</option>
                    <option value="new">Brand New</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1A1523]">Remarks / Details</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Fitted with warranty card in maintenance register"
                  className="mt-1 w-full text-xs border border-[#E3DEE9] rounded-xl p-2.5 bg-[#FAF8FC] text-[#1A1523] outline-none focus:border-[#4E2478]"
                />
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
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
