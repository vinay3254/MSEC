import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  KeyRound,
  CalendarCheck,
  UserPlus,
  Receipt,
  AlertCircle,
  UtensilsCrossed,
  Boxes,
  Shield,
} from 'lucide-react';

interface NavGroup {
  section: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const navGroups: NavGroup[] = [
  {
    section: 'MAIN',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    section: 'RESIDENTS & ROOMS',
    items: [
      { name: 'Student Management', href: '/students', icon: Users },
      { name: 'Rooms & Wings', href: '/rooms', icon: Building2 },
      { name: 'Room Allocations', href: '/allocations', icon: KeyRound },
    ],
  },
  {
    section: 'CAMPUS MONITORING',
    items: [
      { name: 'Attendance & Outing', href: '/attendance', icon: CalendarCheck },
      { name: 'Visitor Management', href: '/visitors', icon: UserPlus },
      { name: 'Complaints & Maint.', href: '/complaints', icon: AlertCircle },
    ],
  },
  {
    section: 'FINANCE & SERVICES',
    items: [
      { name: 'Fee Management', href: '/fees', icon: Receipt },
      { name: 'Mess Management', href: '/mess', icon: UtensilsCrossed },
      { name: 'Inventory & Reports', href: '/inventory-reports', icon: Boxes },
    ],
  },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white text-[#1A1523] flex flex-col shrink-0 border-r border-[#E3DEE9] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[#E3DEE9] bg-white">
        <div className="w-9 h-9 rounded-xl bg-white border border-[#E3DEE9] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
          <img src="/msec-logo.jpeg" alt="MSEC Logo" className="w-full h-full object-contain p-0.5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-[#1A1523] text-sm tracking-tight font-heading truncate">
            MSEC Central Hostel
          </h1>
          <p className="text-[11px] text-[#5C5468] font-body truncate">M.S. Engineering College</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.section} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#5C5468] font-body">
              {group.section}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-body font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#EDE4F5] text-[#4E2478] font-semibold shadow-2xs'
                        : 'text-[#5C5468] hover:text-[#4E2478] hover:bg-[#FAF8FC]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute -left-3 top-1.5 bottom-1.5 w-1 bg-[#F30137] rounded-r-full" />
                      )}
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#4E2478]' : 'text-[#5C5468]'}`} />
                      <span className="truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Engine Status Footer */}
      <div className="p-3 border-t border-[#E3DEE9] bg-[#FAF8FC]">
        <div className="rounded-xl bg-white p-2.5 text-xs border border-[#E3DEE9] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1C8A5C]" />
            <span className="text-[11px] font-semibold text-[#1A1523] font-body">Hostel Engine</span>
          </div>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#EDE4F5] text-[#4E2478] border border-[#E3DEE9]">
            v2.4
          </span>
        </div>
      </div>
    </aside>
  );
};
