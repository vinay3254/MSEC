import React, { useState } from 'react';
import '../screens/onboarding.css';
import { apiRequest } from '../api';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
];

const SECTIONS = ['A', 'B', 'C', 'D'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const ACADEMIC_YEARS = ['1st Year (BE)', '2nd Year (BE)', '3rd Year (BE)', '4th Year (BE)'];

export default function StudentOnboardingModal({ user, onComplete, onCancel, onClose }) {
  const handleCancel = onClose || onCancel;
  const [name, setName] = useState(user?.name || '');
  const [usn, setUsn] = useState(user?.identifier || user?.profile?.usn || '');
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0]);
  const [section, setSection] = useState(user?.profile?.section || 'A');
  const [dob, setDob] = useState(user?.profile?.dob || '2003-05-14');
  const [semester, setSemester] = useState(user?.semester || 6);
  const [academicYear, setAcademicYear] = useState(user?.profile?.academic_year || '3rd Year (BE)');
  const [admissionYear, setAdmissionYear] = useState(user?.profile?.admission_year || 2021);
  const [phone, setPhone] = useState(user?.profile?.phone || '');
  const [bloodGroup, setBloodGroup] = useState(user?.profile?.blood_group || 'O+');
  const [emergencyContact, setEmergencyContact] = useState(user?.profile?.emergency_contact || '+91 98765 43210');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!usn.trim()) {
      setError('Please enter your University Serial Number (USN).');
      return;
    }
    if (!dob) {
      setError('Please select your Date of Birth (DOB).');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await apiRequest('/profile/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          usn: usn.trim().toUpperCase(),
          department,
          section,
          dob,
          semester: parseInt(semester),
          admission_year: parseInt(admissionYear),
          academic_year: academicYear,
          phone: phone.trim(),
          blood_group: bloodGroup,
          emergency_contact: emergencyContact.trim(),
        }),
      });
      if (onComplete && res?.user) {
        onComplete(res.user);
      }
    } catch (err) {
      setError(err.message || 'Failed to save student profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {handleCancel && (
          <button
            type="button"
            className="onboarding-modal__close"
            onClick={handleCancel}
            aria-label="Cancel and close"
          >
            ×
          </button>
        )}
        <div className="onboarding-modal__head">
          <span className="onboarding-modal__badge">Profile Enrollment</span>
          <h2 className="onboarding-modal__title">Complete Your Student Profile</h2>
          <p className="onboarding-modal__sub">
            Please fill in your academic enrollment details to personalize your course timetable, attendance tracking, and faculty classes.
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--bad-tint)', color: 'var(--bad)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form className="onboarding-form" onSubmit={handleSubmit}>
          <div className="onboarding-row">
            <div className="onboarding-field">
              <label>Full Name</label>
              <input
                type="text"
                className="onboarding-input"
                placeholder="Student Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="onboarding-field">
              <label>University Serial Number (USN)</label>
              <input
                type="text"
                className="onboarding-input"
                placeholder="e.g. 1MS21CS084"
                value={usn}
                onChange={(e) => setUsn(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          <div className="onboarding-field">
            <label>Department / Branch</label>
            <select
              className="onboarding-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="onboarding-row--3">
            <div className="onboarding-field">
              <label>Semester</label>
              <select
                className="onboarding-select"
                value={semester}
                onChange={(e) => setSemester(parseInt(e.target.value))}
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            <div className="onboarding-field">
              <label>Class Section</label>
              <select
                className="onboarding-select"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>
            <div className="onboarding-field">
              <label>Academic Year</label>
              <select
                className="onboarding-select"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                {ACADEMIC_YEARS.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="onboarding-row">
            <div className="onboarding-field">
              <label>Date of Birth (DOB)</label>
              <input
                type="date"
                className="onboarding-input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </div>
            <div className="onboarding-field">
              <label>Admission Year</label>
              <input
                type="number"
                className="onboarding-input"
                placeholder="e.g. 2021"
                value={admissionYear}
                onChange={(e) => setAdmissionYear(e.target.value)}
              />
            </div>
          </div>

          <div className="onboarding-row--3">
            <div className="onboarding-field">
              <label>Student Mobile</label>
              <input
                type="tel"
                className="onboarding-input"
                placeholder="+91 98765 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="onboarding-field">
              <label>Blood Group</label>
              <select
                className="onboarding-select"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div className="onboarding-field">
              <label>Emergency Contact</label>
              <input
                type="tel"
                className="onboarding-input"
                placeholder="+91 98765 43210"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
              />
            </div>
          </div>

          <div className="onboarding-actions">
            {handleCancel && (
              <button
                type="button"
                className="onboarding-btn onboarding-btn--cancel"
                onClick={handleCancel}
                disabled={busy}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="onboarding-btn onboarding-btn--primary"
              disabled={busy}
            >
              {busy ? 'Saving Profile...' : 'Complete Enrollment & Enter Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
