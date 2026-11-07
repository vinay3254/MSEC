import React, { useState, useEffect } from 'react';
import { apiRequest, apiUrl, openExternal } from '../../api';
import PasswordSection from '../PasswordSection';
import ProfilePhoto from '../ProfilePhoto';

// ==========================================================
// 9. STUDENT PROFILE AND DIGITAL ID MODULE
// ==========================================================
export function StudentProfileView({ userRole }) {
  const [profile, setProfile] = useState(null);
  const [digitalId, setDigitalId] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'digital_id'
  const [editForm, setEditForm] = useState({
    phone: '',
    email: '',
    emergency_contact: '',
    blood_group: 'O+',
    address: '',
    department: '',
    semester: 6,
    section: 'A'
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [showQrInspector, setShowQrInspector] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const loadData = async () => {
    try {
      const pRes = await apiRequest('/profile');
      setProfile(pRes.profile);
      setEditForm({
        phone: pRes.profile.phone || '',
        email: pRes.profile.email || '',
        emergency_contact: pRes.profile.emergency_contact || '',
        blood_group: pRes.profile.blood_group || 'O+',
        address: pRes.profile.address || '',
        department: pRes.profile.department || '',
        semester: pRes.profile.semester || 6,
        section: pRes.profile.section || 'A'
      });

      const idRes = await apiRequest('/profile/digital-id');
      setDigitalId(idRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setProfile(res.profile);
      setMsg('Profile and permitted contact records successfully updated in the official database.');
      const idRes = await apiRequest('/profile/digital-id');
      setDigitalId(idRes);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/profile/photo'), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Photo upload failed');

      setMsg('Profile photograph successfully updated.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Photo upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCredential = async () => {
    if (!profile?.usn) return;
    setVerifyLoading(true);
    try {
      const res = await apiRequest(`/profile/verify/${profile.usn}`);
      setVerifyResult(res);
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handlePrintFrontId = () => {
    document.body.classList.remove('print-badge-only');
    document.body.classList.add('printing-id-card', 'print-card-only');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handlePrintBackBadge = () => {
    document.body.classList.remove('print-card-only');
    document.body.classList.add('printing-id-card', 'print-badge-only');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  useEffect(() => {
    if (activeTab === 'digital_id') {
      document.body.classList.add('digital-id-tab-active');
    } else {
      document.body.classList.remove('digital-id-tab-active');
    }

    const handleBeforePrint = () => {
      if (activeTab === 'digital_id') {
        document.body.classList.add('printing-id-card');
      }
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-id-card', 'print-card-only', 'print-badge-only');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      document.body.classList.remove('digital-id-tab-active', 'printing-id-card', 'print-card-only', 'print-badge-only');
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [activeTab]);

  if (!profile) return <div style={{ padding: '20px' }}>Loading student profile...</div>;

  return (
    <div className={`student-profile-view ${activeTab === 'digital_id' ? 'digital-id-active' : ''}`}>
      <div className="banner-card profile-screen-only">
        <div>
          <div className="banner-title">Student Profile & Digital Identification</div>
          <div className="banner-sub">
            Verified institutional registry, contact preferences, and official digital ID card with secure QR code.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success profile-screen-only" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger profile-screen-only" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Summary Profile Header Card */}
      <div className="panel-card profile-screen-only" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="id-photo-box" style={{ width: '90px', height: '100px' }}>
            <ProfilePhoto url={profile.photo_url} name={profile.name} />
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>{profile.name}</h2>
              <span className="status-pill status-neutral">USN: {profile.usn}</span>
              <span className="status-pill status-success">{profile.academic_status || 'Good Standing'}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
              {profile.department} | {profile.college_name || 'Apex Institute of Engineering & Technology'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              {profile.degree || 'Bachelor of Engineering (B.E.)'} - Semester {profile.semester} (Section {profile.section}) | Batch: {profile.admission_year || 2021} - {(profile.admission_year || 2021) + 4}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', borderLeft: '1px solid var(--line)', paddingLeft: '16px' }}>
            <div>
              <div className="stat-label">Current CGPA</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>{profile.cgpa}</div>
            </div>
            <div>
              <div className="stat-label">Attendance</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--good-ink)' }}>{profile.overall_attendance}%</div>
            </div>
            <div>
              <div className="stat-label">Earned Credits</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>{profile.credits_earned || 128}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Switcher */}
      <div className="panel-card profile-screen-only" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ padding: '8px 12px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{
              backgroundColor: activeTab === 'profile' ? 'var(--primary)' : '#ffffff',
              color: activeTab === 'profile' ? '#ffffff' : 'var(--ink)'
            }}
            onClick={() => setActiveTab('profile')}
          >
            Profile Information & Contact Settings
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{
              backgroundColor: activeTab === 'digital_id' ? 'var(--primary)' : '#ffffff',
              color: activeTab === 'digital_id' ? '#ffffff' : 'var(--ink)'
            }}
            onClick={() => setActiveTab('digital_id')}
          >
            Digital Student ID & Verified QR Badge
          </button>
        </div>
      </div>

      {/* TAB 1: PROFILE INFORMATION */}
      {activeTab === 'profile' && (
        <div className="dashboard-sections-grid">
          {/* Institutional Official Records (Locked) */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Official Institutional Records</h3>
              <span className="status-pill status-neutral">Registrar Master Copy</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="stat-label">University Seat Number (USN)</label>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{profile.usn}</div>
                </div>
                <div>
                  <label className="stat-label">Student Full Name</label>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{profile.name}</div>
                </div>
                <div>
                  <label className="stat-label">College / Institution</label>
                  <div style={{ color: 'var(--ink)' }}>{profile.college_name || 'Apex Institute of Engineering & Technology'}</div>
                </div>
                <div>
                  <label className="stat-label">Department / Branch</label>
                  <div style={{ color: 'var(--ink)' }}>{profile.department}</div>
                </div>
                <div>
                  <label className="stat-label">Academic Program</label>
                  <div style={{ color: 'var(--ink)' }}>{profile.degree || 'B.E. Computer Science'}</div>
                </div>
                <div>
                  <label className="stat-label">Current Semester & Section</label>
                  <div style={{ color: 'var(--ink)' }}>Semester {profile.semester} - Section {profile.section}</div>
                </div>
                <div>
                  <label className="stat-label">Admission Year</label>
                  <div style={{ color: 'var(--ink)' }}>{profile.admission_year || 2021}</div>
                </div>
                <div>
                  <label className="stat-label">ID Expiry / Valid Thru</label>
                  <div style={{ color: 'var(--ink)' }}>{profile.valid_thru || 'June 2027'}</div>
                </div>
                <div>
                  <label className="stat-label">Active Backlogs</label>
                  <div style={{ color: 'var(--good-ink)', fontWeight: 600 }}>{profile.backlogs || 0} Backlogs</div>
                </div>
                <div>
                  <label className="stat-label">Standing Status</label>
                  <div style={{ color: 'var(--good-ink)', fontWeight: 600 }}>{profile.academic_status || 'Good Standing'}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                <label className="stat-label" style={{ marginBottom: '6px' }}>Update Profile Photograph</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="form-input"
                    style={{ padding: '6px' }}
                    disabled={loading}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                  Supported formats: PNG, JPG, JPEG, WEBP. Photo is automatically updated on your Digital ID.
                </div>
              </div>
            </div>
          </div>

          {/* Permitted Editable Details Form */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Permitted Personal & Contact Details</h3>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Editable by Student</span>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label>Primary Phone Number</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Official Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.emergency_contact}
                    onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Blood Group</label>
                  <select
                    className="form-select"
                    value={editForm.blood_group}
                    onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Residential / Hostel Address</label>
                  <textarea
                    rows="3"
                    className="form-input"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>

                {userRole === 'admin' && (
                  <div style={{ background: 'var(--primary-tint)', padding: '10px', borderRadius: '4px', marginBottom: '14px', border: '1px solid var(--primary-tint)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', marginBottom: '6px' }}>
                      ADMINISTRATOR MASTER RECORD OVERRIDE:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px' }}>Department</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editForm.department}
                          onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px' }}>Semester</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.semester}
                          onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Permitted Contact Details'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL STUDENT ID CARD & QR CODE */}
      {activeTab === 'digital_id' && digitalId && (
        <div className="digital-id-container">
          <div className="profile-screen-only" style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--primary)' }}>
              Security & Credential Verification Notice
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              Each student is issued a unique dynamic QR code for campus identification, laboratory attendance, and institutional verification. Passwords, hashes, and sensitive authentication keys are never exposed in the QR credential.
            </div>
          </div>

          <div className="id-card-wrapper id-card-print-target" id="student-id-card-print">
            {/* Front Card */}
            <div className="id-card-badge id-card-front">
              <div className="id-card-header">
                <div className="id-card-header-college">{digitalId.digital_id.college_name}</div>
                <div className="id-card-header-sub">STUDENT IDENTITY CARD</div>
              </div>

              <div className="id-card-body">
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                  <div className="id-photo-box">
                    <ProfilePhoto url={digitalId.digital_id.photo_url} name={digitalId.digital_id.name} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div className="id-field-label">Student Name</div>
                    <div className="id-field-value" style={{ fontSize: '14px', color: 'var(--primary)' }}>{digitalId.digital_id.name}</div>

                    <div className="id-field-label" style={{ marginTop: '6px' }}>University Seat No (USN)</div>
                    <div className="id-field-value">{digitalId.digital_id.usn}</div>

                    <div className="id-field-label" style={{ marginTop: '6px' }}>Blood Group</div>
                    <div className="id-field-value">{digitalId.digital_id.blood_group}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid var(--line)', paddingTop: '10px', marginTop: 'auto' }}>
                  <div>
                    <div className="id-field-label">Branch</div>
                    <div className="id-field-value" style={{ fontSize: '11px' }}>{digitalId.digital_id.department}</div>
                  </div>
                  <div>
                    <div className="id-field-label">Semester & Sec</div>
                    <div className="id-field-value">Sem {digitalId.digital_id.semester} - Sec {digitalId.digital_id.section}</div>
                  </div>
                  <div>
                    <div className="id-field-label">Valid Thru</div>
                    <div className="id-field-value" style={{ color: 'var(--good-ink)' }}>{digitalId.digital_id.valid_thru}</div>
                  </div>
                  <div>
                    <div className="id-field-label">Emergency Tel</div>
                    <div className="id-field-value" style={{ fontSize: '11px' }}>{digitalId.digital_id.emergency_contact}</div>
                  </div>
                </div>
              </div>

              <div className="id-card-footer">
                <span>Registrar Seal Verified</span>
                <span style={{ fontWeight: 600 }}>Active Student</span>
              </div>
            </div>

            {/* Back Card with Unique QR Code */}
            <div className="id-card-badge id-card-back">
              <div className="id-card-header" style={{ background: 'var(--ink)' }}>
                <div className="id-card-header-college">INSTITUTIONAL DIGITAL CREDENTIAL</div>
                <div className="id-card-header-sub">OFFICIAL SCANNABLE VERIFICATION BADGE</div>
              </div>

              <div className="id-card-body" style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '6px', background: '#ffffff', border: '1px solid var(--line)', borderRadius: '4px' }}>
                  <img
                    src={digitalId.qr_code_image}
                    alt="Student ID QR Code"
                    style={{ width: '130px', height: '130px', display: 'block' }}
                  />
                </div>

                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', marginTop: '8px' }}>
                  UNIQUE SECURE QR CODE
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                  Scan with any camera or scanner to verify student credentials.
                </div>

                <div style={{ marginTop: '10px', padding: '8px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '4px', textAlign: 'left', fontSize: '10px', color: 'var(--muted)' }}>
                  <div><strong>Address:</strong> {digitalId.digital_id.address}</div>
                  <div><strong>Emergency Helpline:</strong> {digitalId.digital_id.emergency_contact}</div>
                  <div style={{ marginTop: '4px', color: 'var(--muted)', fontStyle: 'italic' }}>
                    If found, return to Registrar Office, Apex Institute of Engineering & Technology.
                  </div>
                </div>
              </div>

              <div className="id-card-footer">
                <span>Barcode Access: 1MS21CS084</span>
                <span>ISO/IEC 18004</span>
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="profile-screen-only" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            <button type="button" className="btn-primary" onClick={handlePrintFrontId}>
              Print Student ID Card
            </button>
            <button type="button" className="btn-primary" onClick={handlePrintBackBadge}>
              Print Official Scannable Verification Badge
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowQrInspector(true)}>
              Inspect QR Encoded Content
            </button>
            <button type="button" className="btn-secondary" onClick={handleVerifyCredential} disabled={verifyLoading}>
              {verifyLoading ? 'Verifying...' : 'Simulate External Scanner Verification'}
            </button>
          </div>

          {/* Verification Result Drawer */}
          {verifyResult && (
            <div className="profile-screen-only" style={{ marginTop: '16px', background: 'var(--good-tint)', border: '1px solid #86efac', padding: '16px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--good-ink)', fontSize: '14px' }}>
                  Official Registrar Verification Certificate
                </div>
                <button type="button" className="btn-secondary" style={{ fontSize: '11px' }} onClick={() => setVerifyResult(null)}>
                  Dismiss
                </button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--good-ink)', marginTop: '4px' }}>
                Status: <strong>{verifyResult.student.academic_status}</strong> | Authority: <strong>{verifyResult.verification_source}</strong> | Timestamp: {verifyResult.timestamp}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
                <div>Name: <strong>{verifyResult.student.name}</strong></div>
                <div>USN: <strong>{verifyResult.student.usn}</strong></div>
                <div>Institution: <strong>{verifyResult.student.college_name}</strong></div>
                <div>Department: <strong>{verifyResult.student.department}</strong></div>
                <div>Validity: <strong>{verifyResult.student.valid_thru}</strong></div>
              </div>
            </div>
          )}

          {/* Modal: QR Decoded Payload Inspector */}
          {showQrInspector && (
            <div className="profile-screen-only" style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '100%', maxWidth: '540px', margin: '20px' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">QR Code Decoded Content Inspector</h3>
                  <button type="button" className="btn-secondary" onClick={() => setShowQrInspector(false)}>Close</button>
                </div>
                <div className="panel-card-body">
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
                    The following exact text string is encoded inside the student's unique QR code. Notice that no passwords, private hashes, or security tokens are exposed:
                  </div>

                  <pre style={{
                    background: 'var(--ink)', color: 'var(--bg)', padding: '14px',
                    borderRadius: '4px', fontSize: '12px', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                  }}>
                    {digitalId.qr_payload_text}
                  </pre>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                    <button type="button" className="btn-secondary" onClick={() => setShowQrInspector(false)}>
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="profile-screen-only">
        <PasswordSection />
      </div>
    </div>
  );
}

// ==========================================================
// 15. COMMUNICATION & NOTIFICATIONS MODULE
// ==========================================================
export function NotificationsView({ userRole }) {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'appointments', 'directory'
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Admin Publish Modal
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({
    title: '',
    category: 'College Announcement',
    department: 'Office of Academic Affairs',
    content: '',
    priority: 'Normal',
    target_role: 'all'
  });

  // Faculty Appointments State
  const [appointments, setAppointments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptForm, setApptForm] = useState({
    faculty_name: 'Dr. Ramesh Rao (Head of Systems)',
    department: 'Computer Science & Engineering',
    purpose: '',
    requested_date: new Date().toISOString().split('T')[0],
    requested_slot: '10:30 AM - 11:00 AM'
  });

  const loadNotifications = async () => {
    try {
      setLoading(true);
      let url = '/notifications?';
      if (categoryFilter !== 'ALL') url += `category=${encodeURIComponent(categoryFilter)}&`;
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter.toLowerCase())}&`;
      const res = await apiRequest(url);
      setNotifs(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/communications/appointments?role=${userRole}`);
      setAppointments(res.appointments || []);
    } catch (err) {
      setError(err.message || 'Failed to load appointment requests.');
    } finally {
      setLoading(false);
    }
  };

  const loadFacultyDirectory = async () => {
    try {
      const res = await apiRequest('/communications/faculty-directory');
      setFacultyList(res.faculty || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'inbox') loadNotifications();
    else if (activeTab === 'appointments') {
      loadAppointments();
      loadFacultyDirectory();
    } else if (activeTab === 'directory') {
      loadFacultyDirectory();
    }
  }, [activeTab, categoryFilter, statusFilter]);

  const handleMarkAsRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to mark as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'POST' });
      setMsg('All circulars marked as read.');
      loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to mark all as read.');
    }
  };

  const handleDeleteNotif = async (id) => {
    if (!window.confirm('Delete this official announcement?')) return;
    try {
      await apiRequest(`/notifications/${id}`, { method: 'DELETE' });
      setMsg('Notification deleted.');
      loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to delete notification.');
    }
  };

  const handlePublishNotification = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/notifications', {
        method: 'POST',
        body: JSON.stringify(publishForm)
      });
      setMsg(res.message);
      setShowPublishModal(false);
      setPublishForm({
        title: '',
        category: 'College Announcement',
        department: 'Office of Academic Affairs',
        content: '',
        priority: 'Normal',
        target_role: 'all'
      });
      loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to publish notice.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAppointment = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/communications/appointments', {
        method: 'POST',
        body: JSON.stringify(apptForm)
      });
      setMsg(res.message);
      setShowApptModal(false);
      setApptForm({
        faculty_name: 'Dr. Ramesh Rao (Head of Systems)',
        department: 'Computer Science & Engineering',
        purpose: '',
        requested_date: new Date().toISOString().split('T')[0],
        requested_slot: '10:30 AM - 11:00 AM'
      });
      loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to book appointment.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApptStatus = async (id, status, remarks = '') => {
    try {
      const res = await apiRequest(`/communications/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, remarks })
      });
      setMsg(res.message);
      loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to update appointment status.');
    }
  };

  const filteredNotifs = notifs.filter(n => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.department.toLowerCase().includes(q);
  });

  const getCategoryBadgeClass = (cat) => {
    switch (cat) {
      case 'Examination': return 'status-primary';
      case 'Placement': return 'status-success';
      case 'Assignment Reminder': return 'status-warning';
      case 'Attendance Alert': return 'status-danger';
      default: return 'status-neutral';
    }
  };

  return (
    <div>
      {/* Banner */}
      <div className="banner-card">
        <div>
          <div className="banner-title">College Communications, Announcements & Faculty Connect</div>
          <div className="banner-sub">
            Institutional circulars, examination alerts, placement bulletins, attendance warnings, and faculty appointment bookings.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Tabs Switcher */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ padding: '8px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'inbox', label: `Notifications Inbox (${unreadCount} Unread)` },
            { id: 'appointments', label: `Faculty Appointments (${appointments.length})` },
            { id: 'directory', label: 'Faculty Directory & Office Hours' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className="btn-secondary"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--primary)' : '#ffffff',
                color: activeTab === tab.id ? '#ffffff' : 'var(--ink)'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: NOTIFICATIONS INBOX */}
      {activeTab === 'inbox' && (
        <div>
          {/* Top Metric Cards */}
          <div className="dashboard-stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Notices</div>
              <div className="stat-value">{notifs.length}</div>
              <div className="stat-sub">Archived circulars</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unread Alerts</div>
              <div className="stat-value" style={{ color: unreadCount > 0 ? 'var(--bad)' : 'var(--good)' }}>
                {unreadCount}
              </div>
              <div className="stat-sub">Requires your review</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Examinations</div>
              <div className="stat-value">
                {notifs.filter(n => n.category === 'Examination').length}
              </div>
              <div className="stat-sub">Hall tickets & schedules</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Attendance & Deadlines</div>
              <div className="stat-value">
                {notifs.filter(n => n.category === 'Attendance Alert' || n.category === 'Assignment Reminder').length}
              </div>
              <div className="stat-sub">Urgent reminders</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search notices by keyword, course, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <select
                  className="form-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Announcement Categories</option>
                  <option value="College Announcement">College Announcements</option>
                  <option value="Examination">Examination Notifications</option>
                  <option value="Placement">Placement Drives</option>
                  <option value="Assignment Reminder">Assignment Reminders</option>
                  <option value="Attendance Alert">Attendance Alerts</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read Only</option>
                </select>
              </div>

              {unreadCount > 0 && (
                <button type="button" className="btn-secondary" onClick={handleMarkAllRead}>
                  Mark All Read
                </button>
              )}

              {(userRole === 'admin' || userRole === 'faculty') && (
                <button type="button" className="btn-primary" onClick={() => setShowPublishModal(true)}>
                  + Publish Announcement
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Official Announcements & Notifications Ledger</h3>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Showing {filteredNotifs.length} notices</span>
            </div>
            <div className="panel-card-body" style={{ padding: '0' }}>
              {filteredNotifs.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                  No announcements match your search or filter criteria.
                </div>
              ) : (
                <ul className="item-list" style={{ margin: '0' }}>
                  {filteredNotifs.map((n) => (
                    <li
                      key={n.id}
                      className="list-item"
                      style={{
                        padding: '16px',
                        borderBottom: '1px solid var(--line)',
                        backgroundColor: n.is_read ? '#ffffff' : 'var(--good-tint)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`status-pill ${getCategoryBadgeClass(n.category)}`} style={{ fontSize: '11px' }}>
                            {n.category}
                          </span>
                          {n.priority === 'Urgent' && (
                            <span className="status-pill status-danger" style={{ fontSize: '10px' }}>URGENT</span>
                          )}
                          {!n.is_read && (
                            <span className="status-pill status-primary" style={{ fontSize: '10px' }}>UNREAD</span>
                          )}
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {n.published_date}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {!n.is_read && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleMarkAsRead(n.id)}
                            >
                              Mark Read
                            </button>
                          )}
                          {userRole === 'admin' && (
                            <button
                              type="button"
                              className="btn-danger"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleDeleteNotif(n.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '6px' }}>
                        {n.title}
                      </h4>

                      <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: '1.5', marginBottom: '8px' }}>
                        {n.content}
                      </p>

                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Issuing Authority: <strong>{n.department}</strong> | Scope: {n.target_role === 'all' ? 'Entire College' : n.target_role.toUpperCase()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FACULTY APPOINTMENTS & CONSULTATION */}
      {activeTab === 'appointments' && (
        <div>
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <div>
                <h3 className="panel-card-title">Faculty Consultation & Meeting Appointments</h3>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Schedule office hours for project guidance, doubt clearing, or mentoring.</div>
              </div>
              <button type="button" className="btn-primary" onClick={() => setShowApptModal(true)}>
                + Request Faculty Appointment
              </button>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Scheduled Consultation Sessions</h3>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Student USN: 1MS21CS084</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Faculty Member</th>
                    <th>Department</th>
                    <th>Consultation Purpose</th>
                    <th>Requested Date & Slot</th>
                    <th>Status</th>
                    <th>Faculty Remarks</th>
                    {(userRole === 'faculty' || userRole === 'admin') && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                        No appointment requests found. Click the button above to request a consultation slot.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.faculty_name}</strong></td>
                        <td>{a.department}</td>
                        <td style={{ maxWidth: '280px' }}>{a.purpose}</td>
                        <td>
                          <strong>{a.requested_date}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{a.requested_slot}</div>
                        </td>
                        <td>
                          <span className={`status-pill ${
                            a.status === 'Confirmed' ? 'status-success' :
                            a.status === 'Pending' ? 'status-warning' :
                            a.status === 'Completed' ? 'status-neutral' : 'status-danger'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {a.faculty_remarks || 'Awaiting faculty confirmation.'}
                        </td>
                        {(userRole === 'faculty' || userRole === 'admin') && (
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {a.status === 'Pending' && (
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => handleUpdateApptStatus(a.id, 'Confirmed', 'Approved. Slot reserved.')}
                                >
                                  Confirm
                                </button>
                              )}
                              {a.status === 'Confirmed' && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => handleUpdateApptStatus(a.id, 'Completed', 'Consultation finished.')}
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FACULTY DIRECTORY & OFFICE HOURS */}
      {activeTab === 'directory' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {facultyList.map((f, idx) => (
            <div key={idx} className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-card-header">
                <div>
                  <h3 className="panel-card-title">{f.name}</h3>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{f.designation}</div>
                </div>
                <span className="status-pill status-neutral">{f.department.split('&')[0]}</span>
              </div>
              <div className="panel-card-body" style={{ flex: 1 }}>
                <div style={{ background: 'var(--bg)', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                  <div style={{ marginBottom: '4px' }}>Office Room: <strong>{f.office}</strong></div>
                  <div style={{ marginBottom: '4px' }}>Email: <strong>{f.email}</strong></div>
                  <div>Consultation Slot: <strong>{f.consultation_hours}</strong></div>
                </div>

                <div>
                  <div className="stat-label">Primary Courses:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', marginBottom: '12px' }}>
                    {f.courses.map((c, cIdx) => (
                      <span key={cIdx} className="status-pill status-neutral" style={{ fontSize: '10px' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => {
                    setApptForm({
                      ...apptForm,
                      faculty_name: f.name,
                      department: f.department
                    });
                    setActiveTab('appointments');
                    setShowApptModal(true);
                  }}
                >
                  Book Consultation Slot
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: PUBLISH ANNOUNCEMENT */}
      {showPublishModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Publish Official Notice / Announcement</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowPublishModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handlePublishNotification}>
                <div className="form-group">
                  <label>Announcement Title</label>
                  <input
                    type="text" className="form-input" placeholder="e.g. Schedule for Final Year Project Progress Review"
                    value={publishForm.title} onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })} required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Notice Category</label>
                    <select
                      className="form-select"
                      value={publishForm.category} onChange={(e) => setPublishForm({ ...publishForm, category: e.target.value })}
                    >
                      <option value="College Announcement">College Announcement</option>
                      <option value="Examination">Examination Notification</option>
                      <option value="Placement">Placement Drive</option>
                      <option value="Assignment Reminder">Assignment Reminder</option>
                      <option value="Attendance Alert">Attendance Alert</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Issuing Department</label>
                    <input
                      type="text" className="form-input"
                      value={publishForm.department} onChange={(e) => setPublishForm({ ...publishForm, department: e.target.value })} required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Priority Level</label>
                    <select
                      className="form-select"
                      value={publishForm.priority} onChange={(e) => setPublishForm({ ...publishForm, priority: e.target.value })}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Target Audience</label>
                    <select
                      className="form-select"
                      value={publishForm.target_role} onChange={(e) => setPublishForm({ ...publishForm, target_role: e.target.value })}
                    >
                      <option value="all">Entire College</option>
                      <option value="student">Students Only</option>
                      <option value="faculty">Faculty Only</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Announcement Details & Body</label>
                  <textarea
                    rows="4" className="form-textarea" placeholder="Enter complete circular text, instructions, and deadlines..."
                    value={publishForm.content} onChange={(e) => setPublishForm({ ...publishForm, content: e.target.value })} required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowPublishModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Publish Circular</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST FACULTY APPOINTMENT */}
      {showApptModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '520px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Book Faculty Consultation Slot</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowApptModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleRequestAppointment}>
                <div className="form-group">
                  <label>Choose Faculty Member</label>
                  <select
                    className="form-select"
                    value={apptForm.faculty_name}
                    onChange={(e) => {
                      const selected = facultyList.find(f => f.name === e.target.value);
                      setApptForm({
                        ...apptForm,
                        faculty_name: e.target.value,
                        department: selected ? selected.department : apptForm.department
                      });
                    }}
                    required
                  >
                    {facultyList.map((f, idx) => (
                      <option key={idx} value={f.name}>
                        {f.name} ({f.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Preferred Date</label>
                    <input
                      type="date" className="form-input"
                      value={apptForm.requested_date}
                      onChange={(e) => setApptForm({ ...apptForm, requested_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Time Slot</label>
                    <select
                      className="form-select"
                      value={apptForm.requested_slot}
                      onChange={(e) => setApptForm({ ...apptForm, requested_slot: e.target.value })}
                    >
                      <option value="09:30 AM - 10:00 AM">09:30 AM - 10:00 AM</option>
                      <option value="10:30 AM - 11:00 AM">10:30 AM - 11:00 AM</option>
                      <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                      <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Consultation Agenda / Purpose</label>
                  <textarea
                    rows="3" className="form-textarea" placeholder="Detail what you would like to discuss (e.g. project review, doubt solving)..."
                    value={apptForm.purpose} onChange={(e) => setApptForm({ ...apptForm, purpose: e.target.value })} required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowApptModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 17. FACULTY DOUBT PORTAL MODULE
// ==========================================================
export function FacultyDoubtPortalView({ userRole }) {
  const [doubts, setDoubts] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Submit Doubt Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [doubtForm, setDoubtForm] = useState({
    subject_code: 'CS601',
    subject_name: 'Distributed Systems',
    faculty_name: 'Dr. Ramesh Rao (Head of Systems)',
    title: '',
    question: ''
  });
  const [doubtFile, setDoubtFile] = useState(null);

  // Response Modal State
  const [respondingDoubt, setRespondingDoubt] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseFile, setResponseFile] = useState(null);

  const subjectsCatalog = [
    { code: 'CS601', name: 'Distributed Systems', faculty: 'Dr. Ramesh Rao (Head of Systems)' },
    { code: 'CS602', name: 'Machine Learning', faculty: 'Dr. Ramesh Rao (Head of Systems)' },
    { code: 'CS603', name: 'Compiler Design', faculty: 'Prof. Anil Deshmukh' },
    { code: 'CS604', name: 'Cloud Architecture', faculty: 'Dr. Ramesh Rao (Head of Systems)' },
    { code: 'EC601', name: 'Embedded IoT Systems', faculty: 'Dr. Geetha S. (HoD ECE)' }
  ];

  const loadDoubts = async () => {
    try {
      setLoading(true);
      let url = '/doubts?';
      if (subjectFilter !== 'ALL') url += `subject=${encodeURIComponent(subjectFilter)}&`;
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter)}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      const res = await apiRequest(url);
      setDoubts(res.doubts || []);
    } catch (err) {
      setError(err.message || 'Failed to load faculty doubts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoubts();
  }, [subjectFilter, statusFilter]);

  const handleSubmitDoubt = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('subject_code', doubtForm.subject_code);
      formData.append('subject_name', doubtForm.subject_name);
      formData.append('faculty_name', doubtForm.faculty_name);
      formData.append('title', doubtForm.title);
      formData.append('question', doubtForm.question);
      formData.append('usn', '1MS21CS084');
      formData.append('student_name', 'Alex Kumar');
      if (doubtFile) {
        formData.append('attachment', doubtFile);
      }

      const res = await fetch(apiUrl('/api/doubts'), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post doubt');
      setMsg(data.message);
      setShowSubmitModal(false);
      setDoubtForm({
        subject_code: 'CS601',
        subject_name: 'Distributed Systems',
        faculty_name: 'Dr. Ramesh Rao (Head of Systems)',
        title: '',
        question: ''
      });
      setDoubtFile(null);
      loadDoubts();
    } catch (err) {
      setError(err.message || 'Failed to submit doubt.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!respondingDoubt || !responseText.trim()) return;
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('response_text', responseText.trim());
      formData.append('responder_name', userRole === 'faculty' ? 'Dr. Ramesh Rao (Head of Systems)' : 'Alex Kumar');
      formData.append('responder_role', userRole === 'faculty' ? 'faculty' : 'student');
      if (responseFile) {
        formData.append('attachment', responseFile);
      }

      const res = await fetch(apiUrl(`/api/doubts/${respondingDoubt.id}/respond`), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send response');
      setMsg(data.message);
      setRespondingDoubt(null);
      setResponseText('');
      setResponseFile(null);
      loadDoubts();
    } catch (err) {
      setError(err.message || 'Failed to deliver response.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (doubtId, newStatus) => {
    try {
      const res = await apiRequest(`/doubts/${doubtId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setMsg(res.message);
      loadDoubts();
    } catch (err) {
      setError(err.message || 'Failed to update doubt status.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Submitted': return 'status-warning';
      case 'Under Review': return 'status-primary';
      case 'Answered': return 'status-success';
      case 'Resolved': return 'status-neutral';
      default: return 'status-neutral';
    }
  };

  return (
    <div>
      {/* Banner */}
      <div className="banner-card">
        <div>
          <div className="banner-title">Faculty Academic Doubt & Mentorship Portal</div>
          <div className="banner-sub">
            Direct course question submission to faculty, supporting attachments, status tracking, and structured instructor explanations.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Stats Counter Bar */}
      <div className="dashboard-stats-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Questions</div>
          <div className="stat-value">{doubts.length}</div>
          <div className="stat-sub">Submitted inquiries</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resolved Doubts</div>
          <div className="stat-value" style={{ color: 'var(--good)' }}>
            {doubts.filter(d => d.status === 'Resolved' || d.status === 'Answered').length}
          </div>
          <div className="stat-sub">Instructor solutions provided</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending / In Review</div>
          <div className="stat-value" style={{ color: 'var(--warn)' }}>
            {doubts.filter(d => d.status === 'Submitted' || d.status === 'Under Review').length}
          </div>
          <div className="stat-sub">Awaiting faculty attention</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Instructors</div>
          <div className="stat-value">4</div>
          <div className="stat-sub">Course coordinators</div>
        </div>
      </div>

      {/* Action and Filter Toolbar */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search doubts by title, concept question, or faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadDoubts()}
            />
          </div>

          <div>
            <select
              className="form-select"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="ALL">All Subjects</option>
              <option value="CS601">CS601: Distributed Systems</option>
              <option value="CS602">CS602: Machine Learning</option>
              <option value="CS603">CS603: Compiler Design</option>
              <option value="CS604">CS604: Cloud Architecture</option>
              <option value="EC601">EC601: Embedded IoT Systems</option>
            </select>
          </div>

          <div>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Answered">Answered</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <button type="button" className="btn-secondary" onClick={loadDoubts}>Search</button>

          <button type="button" className="btn-primary" onClick={() => setShowSubmitModal(true)}>
            + Ask Academic Doubt
          </button>
        </div>
      </div>

      {/* Doubts Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {doubts.length === 0 ? (
          <div className="panel-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
            No doubts match the selected subject or status filter.
          </div>
        ) : (
          doubts.map((d) => (
            <div key={d.id} className="panel-card">
              <div className="panel-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="status-pill status-neutral">
                    {d.subject_code}: {d.subject_name}
                  </span>
                  <span className={`status-pill ${getStatusBadge(d.status)}`}>
                    {d.status}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Submitted by: <strong>{d.student_name}</strong> ({d.usn}) | {d.created_at}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                  Faculty: {d.faculty_name}
                </div>
              </div>

              <div className="panel-card-body">
                <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '6px' }}>
                  {d.title}
                </h4>

                <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: '1.5', marginBottom: '12px' }}>
                  {d.question}
                </p>

                {d.attachment_file && (
                  <div style={{ marginBottom: '12px' }}>
                    <button type="button" onClick={() => openExternal(apiUrl(`/uploads/${d.attachment_file}`))}
                      className="btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 8px', textDecoration: 'none' }}
                    >
                      View Attached Supporting File
                    </button>
                  </div>
                )}

                {/* Conversation / Response Thread */}
                {d.responses && d.responses.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '8px' }}>
                      Faculty Explanations & Dialogue Thread ({d.responses.length}):
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {d.responses.map((resp) => (
                        <div
                          key={resp.id}
                          style={{
                            background: resp.responder_role === 'faculty' ? 'var(--good-tint)' : 'var(--bg)',
                            borderLeft: resp.responder_role === 'faculty' ? '3px solid #16a34a' : '3px solid var(--muted)',
                            padding: '10px 12px',
                            borderRadius: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                            <strong>{resp.responder_name} ({resp.responder_role === 'faculty' ? 'Course Instructor' : 'Student'})</strong>
                            <span>{resp.responded_at}</span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--ink)', margin: '0', lineHeight: '1.4' }}>
                            {resp.response_text}
                          </p>
                          {resp.attachment_file && (
                            <div style={{ marginTop: '6px' }}>
                              <button type="button" onClick={() => openExternal(apiUrl(`/uploads/${resp.attachment_file}`))}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '11px', color: 'var(--primary)' }}
                              >
                                Download Response Attachment
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #F1EDF5' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => {
                      setRespondingDoubt(d);
                      setResponseText('');
                      setResponseFile(null);
                    }}
                  >
                    Reply to Doubt
                  </button>

                  {d.status !== 'Resolved' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleUpdateStatus(d.id, 'Resolved')}
                    >
                      Mark as Resolved
                    </button>
                  )}

                  {(userRole === 'faculty' || userRole === 'admin') && d.status === 'Submitted' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleUpdateStatus(d.id, 'Under Review')}
                    >
                      Mark Under Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: SUBMIT DOUBT */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Submit Academic Doubt to Course Instructor</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowSubmitModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleSubmitDoubt}>
                <div className="form-group">
                  <label>Select Course Subject</label>
                  <select
                    className="form-select"
                    value={doubtForm.subject_code}
                    onChange={(e) => {
                      const sel = subjectsCatalog.find(s => s.code === e.target.value);
                      setDoubtForm({
                        ...doubtForm,
                        subject_code: e.target.value,
                        subject_name: sel ? sel.name : doubtForm.subject_name,
                        faculty_name: sel ? sel.faculty : doubtForm.faculty_name
                      });
                    }}
                    required
                  >
                    {subjectsCatalog.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code}: {s.name} (Faculty: {s.faculty})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Assigned Course Instructor</label>
                  <input
                    type="text" className="form-input" readOnly
                    value={doubtForm.faculty_name}
                    style={{ backgroundColor: 'var(--surface-2)' }}
                  />
                </div>

                <div className="form-group">
                  <label>Doubt Title / Concept Topic</label>
                  <input
                    type="text" className="form-input" placeholder="e.g. Quorum consensus partitioning question"
                    value={doubtForm.title} onChange={(e) => setDoubtForm({ ...doubtForm, title: e.target.value })} required
                  />
                </div>

                <div className="form-group">
                  <label>Detailed Question Explanation</label>
                  <textarea
                    rows="4" className="form-textarea" placeholder="Detail the specific code segment, theorem, or homework step you need guidance with..."
                    value={doubtForm.question} onChange={(e) => setDoubtForm({ ...doubtForm, question: e.target.value })} required
                  />
                </div>

                <div className="form-group">
                  <label>Supporting Image or Document (Optional: PDF, PNG, JPG, DOC)</label>
                  <input
                    type="file" className="form-input"
                    onChange={(e) => setDoubtFile(e.target.files[0] || null)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Submit to Faculty</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESPOND TO DOUBT */}
      {respondingDoubt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Reply: {respondingDoubt.title}</h3>
              <button type="button" className="btn-secondary" onClick={() => setRespondingDoubt(null)}>Close</button>
            </div>
            <div className="panel-card-body">
              <div style={{ background: 'var(--bg)', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                <div>Course: <strong>{respondingDoubt.subject_code} - {respondingDoubt.subject_name}</strong></div>
                <div>Original Question: <em>{respondingDoubt.question}</em></div>
              </div>

              <form onSubmit={handleSendResponse}>
                <div className="form-group">
                  <label>Your Explanation / Solution</label>
                  <textarea
                    rows="4" className="form-textarea" placeholder="Enter your detailed technical explanation, algorithmic derivation, or feedback..."
                    value={responseText} onChange={(e) => setResponseText(e.target.value)} required
                  />
                </div>

                <div className="form-group">
                  <label>Attach Solution Document or Reference (Optional)</label>
                  <input
                    type="file" className="form-input"
                    onChange={(e) => setResponseFile(e.target.files[0] || null)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setRespondingDoubt(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading || !responseText.trim()}>Post Response</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
