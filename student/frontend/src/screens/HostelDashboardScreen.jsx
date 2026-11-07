import React, { useState } from 'react';
import './hostel-dashboard.css';
import '../screens/onboarding.css';

const HOSTEL_TABS = [
  { id: 'overview', label: 'Overview & Room' },
  { id: 'rooms', label: 'Room Allocations' },
  { id: 'mess', label: 'Mess Timetable & Menu' },
  { id: 'outpass', label: 'Digital Out-Pass & Leaves' },
  { id: 'complaints', label: 'Complaints & Maintenance' },
  { id: 'dues', label: 'Fee Dues & Receipts' },
  { id: 'rules', label: 'Hostel Rules & Contacts' },
];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MESS_SCHEDULE = {
  Monday: {
    breakfast: 'Idli, Vada, Sambar, Coconut Chutney, Tea / Coffee',
    lunch: 'Steamed Rice, South Indian Dal, Paneer Butter Masala, Roti, Curd, Salad',
    snacks: 'Samosa / Veg Puff, Masala Chai',
    dinner: 'Chapati, Aloo Gobi Masala, Steamed Rice, Rasam, Gulab Jamun',
  },
  Tuesday: {
    breakfast: 'Puri, Aloo Masala Bhaji, Fresh Cut Fruit, Tea / Coffee',
    lunch: 'Jeera Rice, Yellow Dal Tadka, Mixed Veg Curry, Phulka, Butter Milk',
    snacks: 'Banana Cake / Biscuits, Filter Coffee',
    dinner: 'Veg Biryani / Chicken Biryani (Special), Onion Raita, Salan, Ice Cream',
  },
  Wednesday: {
    breakfast: 'Masala Dosa, Potato Sagu, Tomato Chutney, Milk / Coffee',
    lunch: 'Steamed Rice, Drumstick Sambar, Bhindi Fry, Phulka, Curd, Papad',
    snacks: 'Corn Chaat / Sundal, Green Tea / Chai',
    dinner: 'Roti, Rajma Masala, Steamed Basmati Rice, Curd, Semiya Kheer',
  },
  Thursday: {
    breakfast: 'Poha with Peanuts, Sev, Boiled Egg / Sprouts, Tea / Coffee',
    lunch: 'Curd Rice, Lemon Rice, Potato Roast, Sambar, Fresh Salad',
    snacks: 'Onion Pakoda, Ginger Tea',
    dinner: 'Tandoori Roti, Chana Masala, Jeera Pulao, Dal Makhani, Fruit Salad',
  },
  Friday: {
    breakfast: 'Set Dosa, Vegetable Kurma, Coconut Chutney, Tea / Coffee',
    lunch: 'South Indian Meals: Rice, Sambar, Rasam, Beetroot Poriyal, Curd, Appalam',
    snacks: 'Pav Bhaji / Bun Butter, Filter Coffee',
    dinner: 'Egg Curry / Paneer Tikka Masala, Parotta / Phulka, Ghee Rice, Rasgulla',
  },
  Saturday: {
    breakfast: 'Rava Upma / Khara Bath, Kesari Bath (Chow Chow Bath), Coffee',
    lunch: 'Veg Pulao, Palak Paneer, Phulka, Boondi Raita, Roasted Papad',
    snacks: 'Veg Cutlet, Masala Chai',
    dinner: 'Chapati, Methi Malai Matar, Steamed Rice, Tomato Rasam, Jalebi',
  },
  Sunday: {
    breakfast: 'Chole Bhature / Aloo Paratha, Curd, Pickle, Tea / Coffee',
    lunch: 'Grand Sunday Feast: Dum Biryani (Veg/Chicken), Mirchi Ka Salan, Raita, Sweet',
    snacks: 'Biscuits, Tea / Lemon Juice',
    dinner: 'Light Dinner: Khichdi, Kadhi, Phulka, Aloo Methi, Fruit Custard',
  },
};

export default function HostelDashboardScreen({ user, onSwitchPortal }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [alertMsg, setAlertMsg] = useState('');

  // Outpass state
  const [showOutpassModal, setShowOutpassModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(null);
  const [outpassList, setOutpassList] = useState([
    {
      id: 'OP-2026-104',
      type: 'Local City Out-Pass',
      destination: 'Yelahanka Central Market & Books',
      outTime: '2026-11-07 04:30 PM',
      inTime: '2026-11-07 08:30 PM',
      reason: 'Academic textbooks & stationery procurement',
      status: 'Approved',
      wardenApprovedBy: 'Dr. P. Ramesh (Deputy Warden)',
    },
    {
      id: 'OP-2026-089',
      type: 'Weekend Home Leave',
      destination: 'Home Residence (Sadahalli Post)',
      outTime: '2026-10-31 06:00 PM',
      inTime: '2026-11-02 08:00 AM',
      reason: 'Family festival gathering',
      status: 'Completed',
      wardenApprovedBy: 'Dr. K. M. Gowda (Chief Warden)',
    },
  ]);

  const [newOutpass, setNewOutpass] = useState({
    type: 'Local City Out-Pass',
    destination: '',
    outTime: '',
    inTime: '',
    reason: '',
    parentPhone: user?.profile?.emergency_contact || '+91 98765 43210',
  });

  // Complaints state
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintList, setComplaintList] = useState([
    {
      id: 'TKT-884',
      category: 'Wi-Fi / High-Speed Internet',
      room: 'Room 304, Block B',
      description: 'Corridor access point router has high latency in late evenings.',
      date: '05 Nov 2026',
      status: 'In Progress',
      technician: 'Mr. Satish (Network Team)',
    },
    {
      id: 'TKT-821',
      category: 'Electrical & Lighting',
      room: 'Room 304, Block B',
      description: 'Study desk LED tube light flickering.',
      date: '02 Nov 2026',
      status: 'Resolved',
      technician: 'Mr. Suresh (Electrician)',
    },
  ]);

  const [newComplaint, setNewComplaint] = useState({
    category: 'Electrical & Lighting',
    room: 'Room 304, Block B',
    description: '',
    priority: 'Normal',
  });

  const showAlert = (msg) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(''), 4500);
  };

  const handleApplyOutpass = (e) => {
    e.preventDefault();
    if (!newOutpass.destination.trim() || !newOutpass.outTime || !newOutpass.inTime) {
      showAlert('Please fill destination, out-time, and in-time.');
      return;
    }

    const created = {
      id: `OP-2026-${Math.floor(100 + Math.random() * 900)}`,
      type: newOutpass.type,
      destination: newOutpass.destination.trim(),
      outTime: newOutpass.outTime,
      inTime: newOutpass.inTime,
      reason: newOutpass.reason || 'General permission request',
      status: 'Approved', // instant test approval for student convenience
      wardenApprovedBy: 'Dr. P. Ramesh (Deputy Warden)',
    };

    setOutpassList([created, ...outpassList]);
    setShowOutpassModal(false);
    showAlert('✓ Out-Pass approved by Resident Warden. Show QR pass at security gate.');
  };

  const handleCreateComplaint = (e) => {
    e.preventDefault();
    if (!newComplaint.description.trim()) {
      showAlert('Please describe the maintenance issue.');
      return;
    }

    const created = {
      id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
      category: newComplaint.category,
      room: newComplaint.room,
      description: newComplaint.description.trim(),
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'In Progress',
      technician: 'Maintenance Desk Assigned',
    };

    setComplaintList([created, ...complaintList]);
    setShowComplaintModal(false);
    showAlert('✓ Complaint ticket logged. Technician assigned within 2 business hours.');
  };

  return (
    <div className="hostel-dash">
      {/* Alert toast */}
      {alertMsg && (
        <div style={{
          background: '#dcfce7',
          color: '#166534',
          border: '1px solid #86efac',
          borderRadius: '8px',
          padding: '10px 16px',
          fontWeight: 700,
          fontSize: '13px'
        }}>
          {alertMsg}
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="hostel-dash__header">
        <div className="hostel-dash__welcome">
          <h1>MSEC Campus Residences</h1>
          <p>
            Welcome, <strong>{user?.name || 'Resident Scholar'}</strong> (USN: {user?.identifier || '1ME23CS108'}) • Sir M. Visvesvaraya Residence Block B
          </p>
        </div>

        <div className="hostel-dash__quick-pills">
          <div className="hostel-dash__pill">🏢 Room: 304 (3rd Floor)</div>
          <div className="hostel-dash__pill">🛏️ Bed: #02 (Double AC)</div>
          <div className="hostel-dash__pill">🔒 Gate Closes: 09:00 PM</div>
        </div>
      </div>

      {/* 4-Stat Box Grid */}
      <div className="hostel-dash__stats-grid">
        <div className="hostel-dash__stat-card">
          <span className="hostel-dash__stat-title">My Residence Allotment</span>
          <span className="hostel-dash__stat-val">Room 304</span>
          <span className="hostel-dash__stat-sub">Aryabhata Wing • Block B (Double AC)</span>
        </div>

        <div className="hostel-dash__stat-card">
          <span className="hostel-dash__stat-title">Active Out-Passes</span>
          <span className="hostel-dash__stat-val">{outpassList.filter(o => o.status === 'Approved').length} Active</span>
          <span className="hostel-dash__stat-sub">Warden Authorized Gate Pass</span>
        </div>

        <div className="hostel-dash__stat-card">
          <span className="hostel-dash__stat-title">Today's Mess Status</span>
          <span className="hostel-dash__stat-val">Operational</span>
          <span className="hostel-dash__stat-sub">North & South Indian Central Mess</span>
        </div>

        <div className="hostel-dash__stat-card">
          <span className="hostel-dash__stat-title">Maintenance Tickets</span>
          <span className="hostel-dash__stat-val">{complaintList.filter(c => c.status === 'In Progress').length} Pending</span>
          <span className="hostel-dash__stat-sub">24x7 Facility Support Desk</span>
        </div>
      </div>

      {/* Feature Tabs Bar */}
      <div className="hostel-dash__tabs">
        {HOSTEL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`hostel-dash__tab-btn ${activeTab === tab.id ? 'hostel-dash__tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & ROOM */}
      {activeTab === 'overview' && (
        <section className="hostel-dash__module">
          <div className="hostel-dash__module-head">
            <h2 className="hostel-dash__module-title">Residence Allocation & Roommate Details</h2>
            <button
              type="button"
              className="hostel-dash__btn-primary"
              onClick={() => setShowOutpassModal(true)}
            >
              + Apply for Out-Pass
            </button>
          </div>

          <div className="hostel-dash__room-grid">
            <div className="hostel-dash__room-card">
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>
                Allotted Room
              </span>
              <div className="hostel-dash__room-number">ROOM 304</div>
              <div className="hostel-dash__room-meta">
                <span className="hostel-dash__chip">Block B (Boys PG/Senior)</span>
                <span className="hostel-dash__chip">Floor 3</span>
                <span className="hostel-dash__chip">Bed #02</span>
                <span className="hostel-dash__chip">Double Sharing</span>
                <span className="hostel-dash__chip">AC & Attached Bath</span>
              </div>
              <p style={{ fontSize: '13px', color: '#7c2d12', margin: '8px 0 0', lineHeight: 1.4 }}>
                Keycard Access Enabled. Housekeeping schedule: Tuesday & Friday (10:00 AM - 12:00 PM).
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', marginBottom: '10px' }}>
                Roommate Directory
              </h3>
              <div className="hostel-dash__table-wrap">
                <table className="hostel-dash__table">
                  <thead>
                    <tr>
                      <th>Resident Name</th>
                      <th>USN</th>
                      <th>Branch & Year</th>
                      <th>Bed</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Reshma Banu</strong> (You)</td>
                      <td>{user?.identifier || '1ME23CS108'}</td>
                      <td>CSE • 4th Year</td>
                      <td>Bed #02</td>
                      <td>{user?.profile?.phone || '+91 79890 00329'}</td>
                    </tr>
                    <tr>
                      <td><strong>Priya Sharma</strong></td>
                      <td>1MS23CS045</td>
                      <td>CSE • 4th Year</td>
                      <td>Bed #01</td>
                      <td>+91 98450 11223</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '16px', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '10px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>Warden on Duty:</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                  Dr. P. Ramesh (Deputy Warden, Block B) • Mobile: +91 98450 99882 • Office: Ground Floor Warden Cabin
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: ROOM ALLOCATIONS */}
      {activeTab === 'rooms' && (
        <section className="hostel-dash__module">
          <div className="hostel-dash__module-head">
            <h2 className="hostel-dash__module-title">Campus Residential Blocks & Bed Occupancy</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '18px', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>Sir M.V. Block A</strong>
                <span className="hostel-dash__status-badge status-badge--approved">Senior Boys</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '6px 0 12px' }}>
                Floors: 4 • Total Rooms: 90 • Occupancy: 172 / 180 Beds (95%)
              </p>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--ink)' }}>
                <span>✓ High-speed optical LAN ports in every room</span>
                <span>✓ Dedicated silent study hall on 2nd floor</span>
              </div>
            </div>

            <div style={{ border: '1px solid #ea580c', borderRadius: '12px', padding: '18px', background: '#fff7ed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '16px', color: '#9a3412' }}>Sir M.V. Block B (Your Block)</strong>
                <span className="hostel-dash__status-badge status-badge--approved">Aryabhata Wing</span>
              </div>
              <p style={{ fontSize: '13px', color: '#9a3412', margin: '6px 0 12px' }}>
                Floors: 4 • Total Rooms: 80 • Occupancy: 148 / 160 Beds (92%)
              </p>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#9a3412' }}>
                <span>✓ Room 304 Allotted to you (Floor 3)</span>
                <span>✓ Solar water heater, washing machines on 1st & 3rd floor</span>
              </div>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '18px', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>Mother Teresa Block C</strong>
                <span className="hostel-dash__status-badge status-badge--resolved">Girls Residence</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '6px 0 12px' }}>
                Floors: 5 • Total Rooms: 100 • Occupancy: 185 / 200 Beds (92%)
              </p>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--ink)' }}>
                <span>✓ Biometric turnstile entry with 24x7 female security</span>
                <span>✓ In-house gymnasium and recreation court</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: MESS TIMETABLE & MENU */}
      {activeTab === 'mess' && (
        <section className="hostel-dash__module">
          <div className="hostel-dash__module-head">
            <div>
              <h2 className="hostel-dash__module-title">Central Dining & Mess Timetable</h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Nutritious South Indian and North Indian meal rotations prepared under FSSAI certified hygiene.
              </p>
            </div>
            <button
              type="button"
              className="hostel-dash__btn-ghost"
              onClick={() => showAlert('✓ Meal feedback recorded! Thank you for helping us maintain food quality.')}
            >
              ★ Rate Today's Food
            </button>
          </div>

          <div className="hostel-dash__mess-days">
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className={`hostel-dash__day-pill ${selectedDay === day ? 'hostel-dash__day-pill--active' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="hostel-dash__meals-grid">
            <div className="hostel-dash__meal-card">
              <div className="hostel-dash__meal-header">
                <span className="hostel-dash__meal-title">🥞 Breakfast</span>
                <span className="hostel-dash__meal-time">07:30 AM - 09:30 AM</span>
              </div>
              <p className="hostel-dash__meal-items">{MESS_SCHEDULE[selectedDay].breakfast}</p>
            </div>

            <div className="hostel-dash__meal-card">
              <div className="hostel-dash__meal-header">
                <span className="hostel-dash__meal-title">🍛 Lunch</span>
                <span className="hostel-dash__meal-time">12:30 PM - 02:30 PM</span>
              </div>
              <p className="hostel-dash__meal-items">{MESS_SCHEDULE[selectedDay].lunch}</p>
            </div>

            <div className="hostel-dash__meal-card">
              <div className="hostel-dash__meal-header">
                <span className="hostel-dash__meal-title">☕ High Tea & Snacks</span>
                <span className="hostel-dash__meal-time">05:00 PM - 06:00 PM</span>
              </div>
              <p className="hostel-dash__meal-items">{MESS_SCHEDULE[selectedDay].snacks}</p>
            </div>

            <div className="hostel-dash__meal-card">
              <div className="hostel-dash__meal-header">
                <span className="hostel-dash__meal-title">🍲 Dinner</span>
                <span className="hostel-dash__meal-time">07:45 PM - 09:45 PM</span>
              </div>
              <p className="hostel-dash__meal-items">{MESS_SCHEDULE[selectedDay].dinner}</p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: DIGITAL OUT-PASS & LEAVES */}
      {activeTab === 'outpass' && (
        <section className="hostel-dash__module">
          <div className="hostel-dash__module-head">
            <div>
              <h2 className="hostel-dash__module-title">Digital Out-Pass & Weekend Leave Requests</h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Generate QR-verified electronic passes for city permissions or weekend home leaves.
              </p>
            </div>
            <button
              type="button"
              className="hostel-dash__btn-primary"
              onClick={() => setShowOutpassModal(true)}
            >
              + Apply for New Out-Pass
            </button>
          </div>

          <div className="hostel-dash__table-wrap">
            <table className="hostel-dash__table">
              <thead>
                <tr>
                  <th>Pass ID</th>
                  <th>Type</th>
                  <th>Destination & Reason</th>
                  <th>Out Time</th>
                  <th>In Time</th>
                  <th>Status</th>
                  <th>Warden Approval</th>
                  <th>Gate Pass</th>
                </tr>
              </thead>
              <tbody>
                {outpassList.map((op) => (
                  <tr key={op.id}>
                    <td><strong>{op.id}</strong></td>
                    <td>{op.type}</td>
                    <td>
                      <div><strong>{op.destination}</strong></div>
                      <small style={{ color: 'var(--muted)' }}>{op.reason}</small>
                    </td>
                    <td>{op.outTime}</td>
                    <td>{op.inTime}</td>
                    <td>
                      <span className={`hostel-dash__status-badge ${op.status === 'Approved' ? 'status-badge--approved' : 'status-badge--pending'}`}>
                        {op.status}
                      </span>
                    </td>
                    <td>{op.wardenApprovedBy}</td>
                    <td>
                      <button
                        type="button"
                        className="hostel-dash__btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => setShowQrModal(op)}
                      >
                        View QR Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: COMPLAINTS & MAINTENANCE */}
      {activeTab === 'complaints' && (
        <section className="hostel-dash__module">
          <div className="hostel-dash__module-head">
            <div>
              <h2 className="hostel-dash__module-title">Maintenance Tickets & Room Complaints</h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Electrical, plumbing, carpentry, Wi-Fi, and housekeeping issue resolution tracking.
              </p>
            </div>
            <button
              type="button"
              className="hostel-dash__btn-primary"
              onClick={() => setShowComplaintModal(true)}
            >
              + Report Maintenance Issue
            </button>
          </div>

          <div className="hostel-dash__table-wrap">
            <table className="hostel-dash__table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Description</th>
                  <th>Logged Date</th>
                  <th>Status</th>
                  <th>Assigned Staff</th>
                </tr>
              </thead>
              <tbody>
                {complaintList.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.id}</strong></td>
                    <td>{c.category}</td>
                    <td>{c.room}</td>
                    <td>{c.description}</td>
                    <td>{c.date}</td>
                    <td>
                      <span className={`hostel-dash__status-badge ${c.status === 'Resolved' ? 'status-badge--resolved' : 'status-badge--pending'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{c.technician}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 6: FEE DUES & RECEIPTS */}
      {activeTab === 'dues' && (
        <section className="hostel-dash__module">
          <div className="hostel-dash__module-head">
            <h2 className="hostel-dash__module-title">Hostel Dues & Payment Ledger</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', background: 'var(--surface)' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Annual Residence Rent (2026-27)</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0' }}>₹75,000</div>
              <span className="hostel-dash__status-badge status-badge--approved">Paid in Full ✓</span>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', background: 'var(--surface)' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Mess Advance (Odd Sem)</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0' }}>₹35,000</div>
              <span className="hostel-dash__status-badge status-badge--approved">Settled ✓</span>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', background: 'var(--surface)' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Caution Deposit (Refundable)</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0' }}>₹10,000</div>
              <span className="hostel-dash__status-badge status-badge--approved">Secured in Escrow</span>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid var(--line)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--ink)' }}>Official Clearance</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              No outstanding dues detected. You are in good standing with the Accounts and Hostel Administration.
            </p>
          </div>
        </section>
      )}

      {/* TAB 7: HOSTEL RULES & CONTACTS */}
      {activeTab === 'rules' && (
        <section className="hostel-dash__module">
          <div className="hostel-dash__module-head">
            <h2 className="hostel-dash__module-title">Hostel Code of Conduct & Emergency Desk</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.6 }}>
              <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px' }}>
                <strong>1. Main Gate Timings:</strong> Gates lock strictly at <strong>09:00 PM</strong>. Entry after 09:00 PM requires prior written approval from the Chief Warden.
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px' }}>
                <strong>2. Study & Silence Hours:</strong> 10:00 PM to 06:00 AM. Loud music or corridor disturbance is strictly prohibited.
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px' }}>
                <strong>3. Guest Policy:</strong> Parents and visitors are permitted only in the Ground Floor Reception Lounge between 04:00 PM and 07:00 PM.
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px' }}>
                <strong>4. Zero Tolerance Anti-Ragging:</strong> Ragging is a cognizable criminal offense under Supreme Court guidelines.
              </div>
            </div>

            <div style={{ border: '1px solid var(--line)', padding: '16px', borderRadius: '12px', background: 'var(--surface)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 12px', color: 'var(--ink)' }}>
                Emergency Directory
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div>
                  <strong>Chief Warden:</strong>
                  <div>Dr. K. M. Gowda (+91 98450 99881)</div>
                </div>
                <div>
                  <strong>Block B Deputy Warden:</strong>
                  <div>Dr. P. Ramesh (+91 98450 99882)</div>
                </div>
                <div>
                  <strong>Girls Hostel Warden:</strong>
                  <div>Prof. Anusuya Devi (+91 98450 99883)</div>
                </div>
                <div>
                  <strong>Campus Health Center & Ambulance:</strong>
                  <div>+91 80 2846 1234 / Ext 108</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MODAL 1: Outpass Application */}
      {showOutpassModal && (
        <div className="onboarding-overlay">
          <div className="onboarding-modal" style={{ maxWidth: '520px' }}>
            <button
              type="button"
              className="onboarding-modal__close"
              onClick={() => setShowOutpassModal(false)}
            >
              ×
            </button>
            <div className="onboarding-modal__head">
              <span className="onboarding-modal__badge" style={{ background: '#ffedd5', color: '#c2410c' }}>
                Digital Gate Permission
              </span>
              <h2 className="onboarding-modal__title">Apply for Electronic Out-Pass</h2>
              <p className="onboarding-modal__sub">
                Submit destination and return details. A verifiable QR pass will be issued upon approval.
              </p>
            </div>

            <form onSubmit={handleApplyOutpass} className="onboarding-form">
              <div className="onboarding-field">
                <label>Pass Type</label>
                <select
                  className="onboarding-select"
                  value={newOutpass.type}
                  onChange={(e) => setNewOutpass({ ...newOutpass, type: e.target.value })}
                >
                  <option value="Local City Out-Pass">Local City Out-Pass (Return by 08:30 PM)</option>
                  <option value="Weekend Home Leave">Weekend Home Leave (Multi-Day)</option>
                  <option value="Emergency Medical Out-Pass">Emergency Medical Out-Pass</option>
                </select>
              </div>

              <div className="onboarding-field">
                <label>Destination & Address *</label>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="e.g. Yelahanka Town / Home Address"
                  value={newOutpass.destination}
                  onChange={(e) => setNewOutpass({ ...newOutpass, destination: e.target.value })}
                  required
                />
              </div>

              <div className="hostel-modal-grid">
                <div className="onboarding-field">
                  <label>Leaving Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="onboarding-input"
                    value={newOutpass.outTime}
                    onChange={(e) => setNewOutpass({ ...newOutpass, outTime: e.target.value })}
                    required
                  />
                </div>
                <div className="onboarding-field">
                  <label>Expected Return Time *</label>
                  <input
                    type="datetime-local"
                    className="onboarding-input"
                    value={newOutpass.inTime}
                    onChange={(e) => setNewOutpass({ ...newOutpass, inTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label>Reason for Leave</label>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="Academic work, grocery, family visit..."
                  value={newOutpass.reason}
                  onChange={(e) => setNewOutpass({ ...newOutpass, reason: e.target.value })}
                />
              </div>

              <div className="onboarding-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="onboarding-btn onboarding-btn--cancel"
                  onClick={() => setShowOutpassModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="onboarding-btn onboarding-btn--primary onboarding-btn--orange"
                >
                  Submit & Issue Gate Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QR Pass View */}
      {showQrModal && (
        <div className="onboarding-overlay">
          <div className="onboarding-modal" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <button
              type="button"
              className="onboarding-modal__close"
              onClick={() => setShowQrModal(null)}
            >
              ×
            </button>
            <div className="onboarding-modal__head">
              <span className="onboarding-modal__badge status-badge--approved">
                Gate Clearance Verified
              </span>
              <h2 className="onboarding-modal__title">MSEC Security Gate Pass</h2>
              <p className="onboarding-modal__sub">
                Pass ID: <strong>{showQrModal.id}</strong>
              </p>
            </div>

            <div style={{ margin: '16px auto', padding: '16px', background: '#ffffff', border: '2px solid #000', borderRadius: '12px', display: 'inline-block' }}>
              {/* Clean SVG Mock QR */}
              <svg width="150" height="150" viewBox="0 0 29 29" shapeRendering="crispEdges">
                <path fill="#000" d="M0 0h7v7H0zm2 2h3v3H2zm8 0h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm7-2h7v7h-7zm2 2h3v3h-3zm-14 6h1v1h-1zm4 0h1v1h-1zm5 0h1v1h-1zm-9 2h7v1h-7zm9 0h2v1h-2zm-9 2h1v1h-1zm8 0h1v1h-1zm-8 2h7v7H0zm2 2h3v3H2zm8-2h1v1h-1zm4 0h1v1h-1zm-4 2h1v1h-1zm3 0h2v1h-2zm-3 2h1v1h-1zm4 0h1v1h-1zm-4 2h2v1h-2zm4 0h1v1h-1zm7-7h7v7h-7zm2 2h3v3h-3zm-9 6h1v1h-1zm4 0h1v1h-1zm3 0h2v1h-2z"/>
              </svg>
              <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '8px', letterSpacing: '0.05em' }}>
                SCAN AT SECURITY BOOTH
              </div>
            </div>

            <div style={{ fontSize: '13px', textAlign: 'left', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '8px' }}>
              <div><strong>Resident:</strong> {user?.name || 'Reshma Banu'} ({user?.identifier || '1ME23CS108'})</div>
              <div><strong>Room:</strong> 304, Block B</div>
              <div><strong>Destination:</strong> {showQrModal.destination}</div>
              <div><strong>In-Time:</strong> {showQrModal.inTime}</div>
              <div><strong>Signed by:</strong> {showQrModal.wardenApprovedBy}</div>
            </div>

            <button
              type="button"
              className="onboarding-btn onboarding-btn--primary onboarding-btn--orange"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => setShowQrModal(null)}
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Complaint Form */}
      {showComplaintModal && (
        <div className="onboarding-overlay">
          <div className="onboarding-modal" style={{ maxWidth: '520px' }}>
            <button
              type="button"
              className="onboarding-modal__close"
              onClick={() => setShowComplaintModal(false)}
            >
              ×
            </button>
            <div className="onboarding-modal__head">
              <span className="onboarding-modal__badge" style={{ background: '#ffedd5', color: '#c2410c' }}>
                Maintenance Ticket
              </span>
              <h2 className="onboarding-modal__title">Report Room / Facility Issue</h2>
              <p className="onboarding-modal__sub">
                Technicians are dispatched within 2 hours for standard repairs.
              </p>
            </div>

            <form onSubmit={handleCreateComplaint} className="onboarding-form">
              <div className="onboarding-field">
                <label>Category</label>
                <select
                  className="onboarding-select"
                  value={newComplaint.category}
                  onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                >
                  <option value="Electrical & Lighting">Electrical (Fan, Light, Switch socket)</option>
                  <option value="Plumbing & Bathroom">Plumbing (Tap, Shower, Geyser, Drain)</option>
                  <option value="Wi-Fi / High-Speed Internet">Wi-Fi & LAN Network issue</option>
                  <option value="Carpentry & Furniture">Furniture (Bed, Study desk, Wardrobe lock)</option>
                  <option value="Housekeeping & Cleaning">Housekeeping & Sanitization</option>
                </select>
              </div>

              <div className="hostel-modal-grid">
                <div className="onboarding-field">
                  <label>Room / Location</label>
                  <input
                    type="text"
                    className="onboarding-input"
                    value={newComplaint.room}
                    onChange={(e) => setNewComplaint({ ...newComplaint, room: e.target.value })}
                    required
                  />
                </div>
                <div className="onboarding-field">
                  <label>Urgency Level</label>
                  <select
                    className="onboarding-select"
                    value={newComplaint.priority}
                    onChange={(e) => setNewComplaint({ ...newComplaint, priority: e.target.value })}
                  >
                    <option value="Normal">Normal (Within 24 hrs)</option>
                    <option value="Urgent">Urgent (Immediate attention)</option>
                  </select>
                </div>
              </div>

              <div className="onboarding-field">
                <label>Issue Description *</label>
                <textarea
                  className="onboarding-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe the problem in detail..."
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                  required
                />
              </div>

              <div className="onboarding-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="onboarding-btn onboarding-btn--cancel"
                  onClick={() => setShowComplaintModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="onboarding-btn onboarding-btn--primary onboarding-btn--orange"
                >
                  Log Maintenance Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
