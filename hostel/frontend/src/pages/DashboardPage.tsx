import React, { useEffect, useState } from 'react';
import { dashboardService } from '../services/dashboardService';
import { DashboardStats } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Loader } from '../components/common/Loader';
import {
  Users,
  BedDouble,
  Clock,
  AlertTriangle,
  Bookmark,
  Receipt,
  FileText,
  RotateCw,
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setRefreshing(true);
    dashboardService
      .getStats()
      .then((data) => setStats(data))
      .catch((err) => console.error('Failed to load dashboard metrics:', err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <Loader message="Loading MSEC Hostel dashboard metrics..." />;
  }

  const availableBeds = Math.max(0, (stats?.total_beds ?? 23) - (stats?.occupied_beds ?? 6));

  return (
    <div className="space-y-6 font-body">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1523] font-heading">
            Dashboard Overview
          </h1>
          <p className="text-xs text-[#5C5468] mt-1 font-body">
            Real-time hostel operations, resident tracking, and facility capacity.
          </p>
        </div>

        {/* Action Controls matching reference screenshot */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF8FC] border border-[#E3DEE9] text-[#1A1523] rounded-xl text-xs font-semibold transition shadow-2xs font-body disabled:opacity-60"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#5C5468] ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/allocations"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-xs font-semibold transition shadow-2xs font-body"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Issue / Allocate
          </Link>
          <Link
            to="/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EDE4F5] hover:bg-[#4E2478] hover:text-white text-[#4E2478] rounded-xl text-xs font-semibold transition shadow-2xs font-body"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Resident
          </Link>
        </div>
      </div>

      {/* 8 Stat Cards in 2 rows of 4 matching reference screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1 */}
        <StatCard
          title="TOTAL RESIDENTS"
          value={stats?.total_students ?? 39}
          subtitle="All residential occupants"
          icon={Users}
          iconBg="bg-[#EDE4F5]"
          iconColor="text-[#4E2478]"
          iconBorder="border-[#EDE4F5]"
        />
        <StatCard
          title="AVAILABLE BEDS"
          value={availableBeds}
          subtitle="Ready for allocation"
          icon={CheckSquare}
          iconBg="bg-[#E8F5EF]"
          iconColor="text-[#1C8A5C]"
          iconBorder="border-[#b5e2ce]"
        />
        <StatCard
          title="ACTIVELY OCCUPIED"
          value={stats?.occupied_rooms ?? 2}
          subtitle="In resident possession"
          icon={Clock}
          iconBg="bg-[#E9F0F8]"
          iconColor="text-[#2563A6]"
          iconBorder="border-[#c5daf0]"
        />
        <StatCard
          title="OVERDUE DUES"
          value="1"
          subtitle="Immediate action required"
          icon={AlertTriangle}
          iconBg="bg-[#FDE2E7]"
          iconColor="text-[#F30137]"
          iconBorder="border-[#f8bcc7]"
        />

        {/* Row 2 */}
        <StatCard
          title="REGISTERED PATRONS"
          value="5"
          subtitle="3 Students • 2 Wardens"
          icon={Users}
          iconBg="bg-[#FAF8FC]"
          iconColor="text-[#5C5468]"
          iconBorder="border-[#E3DEE9]"
        />
        <StatCard
          title="ACTIVE OUTPASSES"
          value={stats?.active_gate_passes ?? 1}
          subtitle="Pending return clearance"
          icon={Bookmark}
          iconBg="bg-[#FCF3E6]"
          iconColor="text-[#D98B16]"
          iconBorder="border-[#fae3be]"
        />
        <StatCard
          title="PENDING FINES & DUES"
          value={`₹${((stats?.pending_fees_amount ?? 26000) / 1000).toFixed(0)}k`}
          subtitle="₹15k total collected"
          icon={Receipt}
          iconBg="bg-[#FDE2E7]"
          iconColor="text-[#F30137]"
          iconBorder="border-[#f8bcc7]"
        />
        <StatCard
          title="FACILITY & CARE LOGS"
          value={stats?.pending_complaints ?? 4}
          subtitle="Open maintenance tickets"
          icon={FileText}
          iconBg="bg-[#E6F4F1]"
          iconColor="text-[#0E7490]"
          iconBorder="border-[#bce3dc]"
        />
      </div>

      {/* Main Bottom Section: Daily Activities & Wing Occupancy matching reference screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Daily Activities Ledger (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E3DEE9] p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#E3DEE9]">
            <div>
              <h2 className="text-sm font-bold text-[#1A1523] font-heading">
                Daily Hostel Activities
              </h2>
              <p className="text-xs text-[#5C5468] mt-0.5 font-body">
                Live operational ledger of hostel desk actions
              </p>
            </div>
            <Link
              to="/attendance"
              className="text-xs font-semibold text-[#4E2478] hover:text-[#38195A] inline-flex items-center gap-1 font-body"
            >
              Circulation <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#E3DEE9] mt-3">
            {/* Activity 1: Outpass */}
            <div className="py-3.5 first:pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#1A1523] font-heading">
                    Outpass Issued to Student
                  </h3>
                  <Badge variant="primary">OUTPASS</Badge>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-[#5C5468] block">Warden Desk A</span>
                  <span className="text-[10px] text-[#5C5468]/70 font-mono">02:45 pm</span>
                </div>
              </div>
              <p className="text-xs text-[#5C5468] mt-1 leading-relaxed font-body">
                City Library permission checked out to Priya Dharshini (USN: 1ME23IS027) with expected return 06:00 pm.
              </p>
            </div>

            {/* Activity 2: Return */}
            <div className="py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#1A1523] font-heading">
                    Hostel Return Processed
                  </h3>
                  <Badge variant="success">RETURN</Badge>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-[#5C5468] block">Warden Desk B</span>
                  <span className="text-[10px] text-[#5C5468]/70 font-mono">08:10 pm</span>
                </div>
              </div>
              <p className="text-xs text-[#5C5468] mt-1 leading-relaxed font-body">
                Weekend home leave return verified for Rahul Sharma (USN: 1ME21CS045) Kaveri Boys Block.
              </p>
            </div>

            {/* Activity 3: Maintenance Ticket */}
            <div className="py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#1A1523] font-heading">
                    Room Maintenance Ticket Raised
                  </h3>
                  <Badge variant="warning">MAINT</Badge>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-[#5C5468] block">Caretaker Desk</span>
                  <span className="text-[10px] text-[#5C5468]/70 font-mono">11:20 am</span>
                </div>
              </div>
              <p className="text-xs text-[#5C5468] mt-1 leading-relaxed font-body">
                Bathroom faucet continuous water leakage reported in Room 101 (Bhavani Girls Block). Plumber assigned.
              </p>
            </div>

            {/* Activity 4: Visitor Check-In */}
            <div className="py-3.5 last:pb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#1A1523] font-heading">
                    Campus Visitor Check-In Logged
                  </h3>
                  <Badge variant="info">VISITOR</Badge>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-[#5C5468] block">Security Gate 1</span>
                  <span className="text-[10px] text-[#5C5468]/70 font-mono">09:15 am</span>
                </div>
              </div>
              <p className="text-xs text-[#5C5468] mt-1 leading-relaxed font-body">
                Ramesh Sharma (Father) verified with Aadhar ID to visit resident Rahul Sharma (Room 101, Kaveri Block) in lounge.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Occupancy by Wing matching screenshot Catalog by Category */}
        <div className="bg-white rounded-2xl border border-[#E3DEE9] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E3DEE9]">
              <div>
                <h2 className="text-sm font-bold text-[#1A1523] font-heading">
                  Occupancy by Block
                </h2>
                <p className="text-xs text-[#5C5468] mt-0.5 font-body">
                  Holdings distribution across disciplines
                </p>
              </div>
              <Link
                to="/rooms"
                className="text-xs font-semibold text-[#4E2478] hover:text-[#38195A] inline-flex items-center gap-1 font-body"
              >
                Browse <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Wing Progress Bars matching the sample image styling */}
            <div className="space-y-4 mt-5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#1A1523] mb-1.5 font-body">
                  <span>Kaveri Boys Block</span>
                  <span className="font-heading font-bold text-[#1A1523]">18</span>
                </div>
                <div className="w-full h-2 bg-[#FAF8FC] rounded-full overflow-hidden border border-[#E3DEE9]">
                  <div className="h-full bg-[#4E2478] rounded-full" style={{ width: '75%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#1A1523] mb-1.5 font-body">
                  <span>Bhavani Girls Block</span>
                  <span className="font-heading font-bold text-[#1A1523]">12</span>
                </div>
                <div className="w-full h-2 bg-[#FAF8FC] rounded-full overflow-hidden border border-[#E3DEE9]">
                  <div className="h-full bg-[#4E2478] rounded-full" style={{ width: '50%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#1A1523] mb-1.5 font-body">
                  <span>Vaigai Scholars Block</span>
                  <span className="font-heading font-bold text-[#1A1523]">7</span>
                </div>
                <div className="w-full h-2 bg-[#FAF8FC] rounded-full overflow-hidden border border-[#E3DEE9]">
                  <div className="h-full bg-[#4E2478] rounded-full" style={{ width: '30%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#1A1523] mb-1.5 font-body">
                  <span>Krishna Deluxe Wing</span>
                  <span className="font-heading font-bold text-[#1A1523]">5</span>
                </div>
                <div className="w-full h-2 bg-[#FAF8FC] rounded-full overflow-hidden border border-[#E3DEE9]">
                  <div className="h-full bg-[#4E2478] rounded-full" style={{ width: '20%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E3DEE9] flex items-center justify-between text-xs text-[#5C5468] font-body">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1C8A5C]" /> Central Residence
            </span>
            <span className="font-semibold text-[#1A1523]">42 Total Capacity</span>
          </div>
        </div>
      </div>
    </div>
  );
};
