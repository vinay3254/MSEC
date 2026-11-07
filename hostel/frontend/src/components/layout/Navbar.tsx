import React, { useState, useRef, useEffect } from 'react';
import { useAuth, PRESET_ACCOUNTS } from '../../context/AuthContext';
import {
  Bell,
  Clock,
  ChevronDown,
  User as UserIcon,
  Settings,
  Users,
  LogOut,
  X,
  Check,
  ShieldCheck,
  Mail,
  Phone,
  Building,
  MapPin,
  Heart,
  Save,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const Navbar: React.FC = () => {
  const { user, switchAccount, updateUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | 'switch' | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Profile Edit State
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [editEmergency, setEditEmergency] = useState(user.emergency_contact || '');
  const [editAddress, setEditAddress] = useState(user.address || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // Settings State
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Calculate dynamic academic year: 2026–27
  const getDynamicAcademicYear = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0 = Jan, 5 = June
    const startYear = month >= 5 ? year : year - 1;
    const endYearShort = String(startYear + 1).slice(-2);
    return `${startYear}–${endYearShort}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'SK';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync edit state when user changes
  useEffect(() => {
    setEditPhone(user.phone || '');
    setEditEmergency(user.emergency_contact || '');
    setEditAddress(user.address || '');
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      phone: editPhone,
      emergency_contact: editEmergency,
      address: editAddress,
    });
    setProfileSaved(true);
    showToast('Profile information updated successfully');
    setTimeout(() => {
      setProfileSaved(false);
      setActiveModal(null);
    }, 900);
  };

  const handleSaveSettings = () => {
    setSettingsSaved(true);
    showToast('Hostel dashboard preferences saved');
    setTimeout(() => {
      setSettingsSaved(false);
      setActiveModal(null);
    }, 900);
  };

  const handleSwitchUser = (account: typeof user) => {
    switchAccount(account);
    setActiveModal(null);
    setDropdownOpen(false);
    showToast(`Switched active account to ${account.full_name}`);
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    showToast('Session refreshed • Switched to default Chief Warden account');
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E3DEE9] px-6 flex items-center justify-between z-20 shadow-2xs select-none">
        {/* Left: Dynamic Academic Year Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF8FC] border border-[#E3DEE9] text-xs font-body text-[#5C5468] hover:border-[#4E2478]/30 transition-colors">
            <Clock className="w-3.5 h-3.5 text-[#5C5468]" />
            <span>Academic Year {getDynamicAcademicYear()} • M.S. Engineering College</span>
          </div>
        </div>

        {/* Right Controls: Notifications & User Profile */}
        <div className="flex items-center gap-4">
          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative p-2 text-[#5C5468] hover:text-[#4E2478] rounded-xl hover:bg-[#EDE4F5]/60 transition-colors"
              title="Campus Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#F30137] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                2
              </span>
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-[#E3DEE9] shadow-lg py-3 z-30 font-body">
                <div className="px-4 pb-2 border-b border-[#E3DEE9] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#1A1523] font-heading">Hostel Notices & Alerts</h4>
                  <span className="text-[10px] text-[#4E2478] font-semibold bg-[#EDE4F5] px-2 py-0.5 rounded-full">
                    2 New
                  </span>
                </div>
                <div className="divide-y divide-[#E3DEE9]/60 max-h-64 overflow-y-auto">
                  <div className="p-3 hover:bg-[#FAF8FC] transition-colors cursor-pointer">
                    <p className="text-xs font-semibold text-[#1A1523]">Outpass Roll-Call Due</p>
                    <p className="text-[11px] text-[#5C5468] mt-0.5">
                      Evening gate-pass verification pending for 1ME23IS027.
                    </p>
                    <span className="text-[10px] text-[#5C5468]/70 mt-1 block font-mono">10 mins ago</span>
                  </div>
                  <div className="p-3 hover:bg-[#FAF8FC] transition-colors cursor-pointer">
                    <p className="text-xs font-semibold text-[#1A1523]">Water Sump Maintenance</p>
                    <p className="text-[11px] text-[#5C5468] mt-0.5">
                      Kaveri Block plumbing service scheduled tomorrow at 9:00 AM.
                    </p>
                    <span className="text-[10px] text-[#5C5468]/70 mt-1 block font-mono">1 hour ago</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-[#E3DEE9]" />

          {/* User Profile Area with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 p-1 rounded-xl hover:bg-[#FAF8FC] transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-[#4E2478] text-white flex items-center justify-center font-bold text-xs font-heading shadow-2xs">
                {getInitials(user.full_name)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-[#1A1523] leading-tight font-heading flex items-center gap-1">
                  {user.full_name}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#5C5468] transition-transform duration-150 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </p>
                <p className="text-[11px] text-[#5C5468] font-body mt-0.5">
                  <span className="font-medium text-[#4E2478]">{user.designation || 'Chief Warden'}</span> •{' '}
                  <span className="text-[#5C5468]">{user.email}</span>
                </p>
              </div>
            </button>

            {/* Functional Profile Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#E3DEE9] shadow-lg py-2 z-30 font-body">
                {/* Header item inside dropdown */}
                <div className="px-4 py-2.5 border-b border-[#E3DEE9] bg-[#FAF8FC]/50">
                  <p className="text-xs font-bold text-[#1A1523] font-heading">{user.full_name}</p>
                  <p className="text-[11px] text-[#5C5468] mt-0.5 truncate">{user.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1C8A5C]" />
                    <span className="text-[10px] font-semibold text-[#1C8A5C] uppercase tracking-wide">
                      {user.designation || user.role}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  {/* 1. My Profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setActiveModal('profile');
                    }}
                    className="w-full px-4 py-2 text-xs text-[#1A1523] hover:bg-[#EDE4F5]/60 hover:text-[#4E2478] flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <UserIcon className="w-4 h-4 text-[#5C5468]" />
                    <span>My Profile</span>
                  </button>

                  {/* 2. Account Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setActiveModal('settings');
                    }}
                    className="w-full px-4 py-2 text-xs text-[#1A1523] hover:bg-[#EDE4F5]/60 hover:text-[#4E2478] flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <Settings className="w-4 h-4 text-[#5C5468]" />
                    <span>Account Settings</span>
                  </button>

                  {/* 3. Switch Account */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setActiveModal('switch');
                    }}
                    className="w-full px-4 py-2 text-xs text-[#1A1523] hover:bg-[#EDE4F5]/60 hover:text-[#4E2478] flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <Users className="w-4 h-4 text-[#5C5468]" />
                    <span>Switch Account</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-[#E3DEE9]">
                  {/* 4. Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-xs text-[#F30137] hover:bg-[#FDE2E7] flex items-center gap-2.5 transition-colors font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout (Reset Session)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1A1523] text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 font-body border border-white/10 animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-[#1C8A5C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL 1: My Profile Modal */}
      {activeModal === 'profile' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E3DEE9] max-w-lg w-full overflow-hidden shadow-2xl font-body">
            <div className="px-6 py-4 border-b border-[#E3DEE9] bg-[#FAF8FC] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1523] font-heading">Official Member Profile</h3>
                <p className="text-xs text-[#5C5468] mt-0.5">
                  MSEC Central Hostel Residential Administration Record
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-[#5C5468] hover:text-[#1A1523] hover:bg-[#E3DEE9]/50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {/* Header Card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FAF8FC] border border-[#E3DEE9]">
                <div className="w-14 h-14 rounded-2xl bg-[#4E2478] text-white font-bold text-lg flex items-center justify-center font-heading shadow-xs shrink-0">
                  {getInitials(user.full_name)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[#1A1523] font-heading">{user.full_name}</h4>
                  <p className="text-xs font-semibold text-[#4E2478]">{user.designation || 'Hostel Official'}</p>
                  <p className="text-[11px] text-[#5C5468] mt-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#5C5468]" /> {user.email}
                  </p>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-[#E3DEE9] bg-white">
                  <span className="text-[10px] uppercase font-bold text-[#5C5468] flex items-center gap-1.5">
                    <Building className="w-3 h-3 text-[#4E2478]" /> Department / Branch
                  </span>
                  <p className="font-semibold text-[#1A1523] mt-1">{user.department || 'Hostel Administration'}</p>
                </div>

                <div className="p-3 rounded-xl border border-[#E3DEE9] bg-white">
                  <span className="text-[10px] uppercase font-bold text-[#5C5468] flex items-center gap-1.5">
                    <Heart className="w-3 h-3 text-[#F30137]" /> Blood Group & Status
                  </span>
                  <p className="font-semibold text-[#1A1523] mt-1 flex items-center gap-2">
                    <Badge variant="accent">{user.blood_group || 'O+'}</Badge>
                    <span className="text-[#1C8A5C] font-semibold text-[11px]">Active Clearance</span>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1A1523] mb-1">
                    Official Mobile Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E3DEE9] rounded-xl bg-[#FAF8FC] focus:bg-white focus:border-[#4E2478] outline-none"
                    placeholder="+91 94432 18901"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1A1523] mb-1">
                    Emergency Contact Number
                  </label>
                  <input
                    type="text"
                    value={editEmergency}
                    onChange={(e) => setEditEmergency(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E3DEE9] rounded-xl bg-[#FAF8FC] focus:bg-white focus:border-[#4E2478] outline-none"
                    placeholder="+91 94432 18900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#1A1523] mb-1">
                    Campus Residence / Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E3DEE9] rounded-xl bg-[#FAF8FC] focus:bg-white focus:border-[#4E2478] outline-none"
                    placeholder="Staff Quarters B-04, MSEC Campus"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-[#E3DEE9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#5C5468] hover:bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#4E2478] hover:bg-[#38195A] rounded-xl inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {profileSaved ? 'Saved!' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Account Settings Modal */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E3DEE9] max-w-md w-full overflow-hidden shadow-2xl font-body">
            <div className="px-6 py-4 border-b border-[#E3DEE9] bg-[#FAF8FC] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1523] font-heading">Account & System Settings</h3>
                <p className="text-xs text-[#5C5468] mt-0.5">Control notifications and administrative preferences</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-[#5C5468] hover:text-[#1A1523] hover:bg-[#E3DEE9]/50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5468]">
                  Notification Channels
                </h4>

                <label className="flex items-center justify-between p-3 rounded-xl border border-[#E3DEE9] bg-[#FAF8FC] cursor-pointer">
                  <div>
                    <span className="font-bold text-[#1A1523] block">Instant SMS Gate-Pass Alerts</span>
                    <span className="text-[11px] text-[#5C5468]">
                      Trigger SMS when students generate city outpasses or leave passes
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsAlerts}
                    onChange={(e) => setSmsAlerts(e.target.checked)}
                    className="w-4 h-4 accent-[#4E2478]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-[#E3DEE9] bg-[#FAF8FC] cursor-pointer">
                  <div>
                    <span className="font-bold text-[#1A1523] block">Daily Attendance Nightly Digest</span>
                    <span className="text-[11px] text-[#5C5468]">
                      Receive automated summary of absent residents after 9:30 PM roll call
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailDigest}
                    onChange={(e) => setEmailDigest(e.target.checked)}
                    className="w-4 h-4 accent-[#4E2478]"
                  />
                </label>
              </div>

              <div className="space-y-3 pt-2 border-t border-[#E3DEE9]">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5468]">
                  Operational Polling
                </h4>

                <label className="flex items-center justify-between p-3 rounded-xl border border-[#E3DEE9] bg-[#FAF8FC] cursor-pointer">
                  <div>
                    <span className="font-bold text-[#1A1523] block">Real-time Metrics Polling (60s)</span>
                    <span className="text-[11px] text-[#5C5468]">
                      Keep stat cards and daily activities updated in real-time
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 accent-[#4E2478]"
                  />
                </label>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-[#E3DEE9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#5C5468] hover:bg-[#FAF8FC] rounded-xl border border-[#E3DEE9]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#4E2478] hover:bg-[#38195A] rounded-xl shadow-2xs"
                >
                  {settingsSaved ? 'Saved!' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Switch Account Modal */}
      {activeModal === 'switch' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E3DEE9] max-w-lg w-full overflow-hidden shadow-2xl font-body">
            <div className="px-6 py-4 border-b border-[#E3DEE9] bg-[#FAF8FC] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1523] font-heading">Switch Active Account</h3>
                <p className="text-xs text-[#5C5468] mt-0.5">
                  Select an authorized personnel or resident session
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-[#5C5468] hover:text-[#1A1523] hover:bg-[#E3DEE9]/50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {PRESET_ACCOUNTS.map((acc) => {
                const isCurrent = acc.email === user.email;
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSwitchUser(acc)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'border-[#4E2478] bg-[#EDE4F5]/40 shadow-xs ring-1 ring-[#4E2478]'
                        : 'border-[#E3DEE9] hover:border-[#4E2478]/40 hover:bg-[#FAF8FC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#4E2478] text-white flex items-center justify-center font-bold text-xs font-heading shrink-0">
                        {getInitials(acc.full_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#1A1523] font-heading">{acc.full_name}</p>
                          {acc.register_number && (
                            <span className="font-mono text-[10px] bg-[#FAF8FC] px-1.5 py-0.5 rounded border border-[#E3DEE9] text-[#4E2478]">
                              {acc.register_number}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#4E2478] font-semibold">{acc.designation}</p>
                        <p className="text-[10px] text-[#5C5468] mt-0.5">{acc.email}</p>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1C8A5C] bg-[#E8F5EF] px-2.5 py-1 rounded-full border border-[#b5e2ce]">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#4E2478] bg-white border border-[#E3DEE9] hover:bg-[#EDE4F5] px-3 py-1.5 rounded-xl transition"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t border-[#E3DEE9] bg-[#FAF8FC] text-right">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold text-[#5C5468] hover:bg-white rounded-xl border border-[#E3DEE9]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
