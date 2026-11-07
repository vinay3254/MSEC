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

const TEACHER_ROLES = [
  'Senior Assistant Professor & Faculty Mentor',
  'Associate Professor & Module Coordinator',
  'Professor & Head of Department',
  'Class Teacher & Academic In-Charge',
  'Assistant Professor & Lab In-Charge',
];

export default function TeacherOnboardingModal({ user, onComplete, onCancel, onClose }) {
  const handleCancel = onClose || onCancel;
  const [name, setName] = useState(user?.name || '');
  const [dob, setDob] = useState(user?.profile?.dob || '1985-08-20');
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0]);
  const [designation, setDesignation] = useState(user?.profile?.designation || TEACHER_ROLES[0]);

  // Class Teacher Flag
  const [isClassTeacher, setIsClassTeacher] = useState(user?.profile?.is_class_teacher || false);
  const [ctDept, setCtDept] = useState(user?.profile?.class_teacher_dept || user?.department || DEPARTMENTS[0]);
  const [ctSem, setCtSem] = useState(user?.profile?.class_teacher_sem || 6);
  const [ctSection, setCtSection] = useState(user?.profile?.class_teacher_section || 'A');
  const [usnStart, setUsnStart] = useState(user?.profile?.usn_start || '1MS21CS001');
  const [usnEnd, setUsnEnd] = useState(user?.profile?.usn_end || '1MS21CS065');

  // Contact & Cabin
  const [cabinRoom, setCabinRoom] = useState(user?.profile?.cabin_room || 'Room 304, CS Block');
  const [contactPhone, setContactPhone] = useState(user?.profile?.contact_phone || '+91 98450 12345');
  const [officeHours, setOfficeHours] = useState(user?.profile?.office_hours || '10:00 AM - 12:00 PM (Mon-Fri)');

  // Assigned classes list (can be multiple!)
  const [assignedClasses, setAssignedClasses] = useState(() => {
    if (user?.classes?.length) return user.classes;
    return [
      { department: user?.department || 'Computer Science & Engineering', semester: 6, section: 'A', subject_code: '21CS61', subject_name: 'Software Engineering' },
      { department: user?.department || 'Computer Science & Engineering', semester: 6, section: 'B', subject_code: '21CS61', subject_name: 'Software Engineering' },
    ];
  });

  const [addClassDept, setAddClassDept] = useState(department);
  const [addClassSem, setAddClassSem] = useState(6);
  const [addClassSec, setAddClassSec] = useState('A');
  const [addClassCode, setAddClassCode] = useState('21CS62');
  const [addClassName, setAddClassName] = useState('Cloud Computing & DevOps');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleAddClassRow = () => {
    if (!addClassCode.trim() || !addClassName.trim()) return;
    setAssignedClasses([
      ...assignedClasses,
      {
        department: addClassDept,
        semester: parseInt(addClassSem),
        section: addClassSec,
        subject_code: addClassCode.trim(),
        subject_name: addClassName.trim(),
      },
    ]);
  };

  const handleRemoveClassRow = (index) => {
    setAssignedClasses(assignedClasses.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!dob) {
      setError('Please provide your Date of Birth.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await apiRequest('/teacher/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          dob,
          department,
          designation,
          is_class_teacher: isClassTeacher,
          class_teacher_dept: ctDept,
          class_teacher_sem: parseInt(ctSem),
          class_teacher_section: ctSection,
          usn_start: usnStart.trim().toUpperCase(),
          usn_end: usnEnd.trim().toUpperCase(),
          cabin_room: cabinRoom.trim(),
          contact_phone: contactPhone.trim(),
          office_hours: officeHours.trim(),
          assigned_classes: (() => {
            const list = [...assignedClasses];
            if (isClassTeacher) {
              const semInt = parseInt(ctSem);
              const exists = list.some(
                (c) => c.department === ctDept && parseInt(c.semester) === semInt && c.section === ctSection
              );
              if (!exists) {
                list.unshift({
                  department: ctDept,
                  semester: semInt,
                  section: ctSection,
                  subject_code: '21CS71',
                  subject_name: 'Class Teacher & Academic In-Charge'
                });
              }
            }
            return list;
          })(),
        }),
      });
      if (onComplete && res?.user) {
        onComplete(res.user);
      }
    } catch (err) {
      setError(err.message || 'Failed to save faculty profile.');
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
          <span className="onboarding-modal__badge">Faculty Enrollment</span>
          <h2 className="onboarding-modal__title">Teacher Profile & Class Allocation Setup</h2>
          <p className="onboarding-modal__sub">
            Configure your academic profile, designated teaching roles, class teacher assignments, and assigned sections.
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--bad-tint)', color: 'var(--bad)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form className="onboarding-form" onSubmit={handleSubmit}>
          {/* Basic Details */}
          <div className="onboarding-row">
            <div className="onboarding-field">
              <label>Teacher Full Name</label>
              <input
                type="text"
                className="onboarding-input"
                placeholder="Dr. Sarah Jenkins"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
          </div>

          <div className="onboarding-row">
            <div className="onboarding-field">
              <label>Primary Department</label>
              <select
                className="onboarding-select"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setAddClassDept(e.target.value);
                }}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="onboarding-field">
              <label>Teacher Role / Academic Designation</label>
              <select
                className="onboarding-select"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              >
                {TEACHER_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Teacher Toggle Section */}
          <div className="onboarding-box">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={isClassTeacher}
                onChange={(e) => setIsClassTeacher(e.target.checked)}
              />
              <span>Designated as Class Teacher / Academic In-Charge</span>
            </label>

            {isClassTeacher && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <div className="onboarding-row--3">
                  <div className="onboarding-field">
                    <label>Assigned Department</label>
                    <select
                      className="onboarding-select"
                      value={ctDept}
                      onChange={(e) => setCtDept(e.target.value)}
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="onboarding-field">
                    <label>Semester</label>
                    <select
                      className="onboarding-select"
                      value={ctSem}
                      onChange={(e) => setCtSem(parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="onboarding-field">
                    <label>Section</label>
                    <select
                      className="onboarding-select"
                      value={ctSection}
                      onChange={(e) => setCtSection(e.target.value)}
                    >
                      {['A', 'B', 'C', 'D'].map((sec) => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="onboarding-row">
                  <div className="onboarding-field">
                    <label>USN Range From</label>
                    <input
                      type="text"
                      className="onboarding-input"
                      placeholder="e.g. 1MS21CS001"
                      value={usnStart}
                      onChange={(e) => setUsnStart(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="onboarding-field">
                    <label>USN Range To</label>
                    <input
                      type="text"
                      className="onboarding-input"
                      placeholder="e.g. 1MS21CS065"
                      value={usnEnd}
                      onChange={(e) => setUsnEnd(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Multiple Assigned Classes & Subjects */}
          <div className="onboarding-box">
            <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>
              Assigned Classes & Subjects ({assignedClasses.length} assigned)
            </strong>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
              You can be assigned to multiple classes and sections. In your dashboard, you can switch between them based on your preference.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {assignedClasses.map((ac, idx) => (
                <div key={idx} className="onboarding-class-item">
                  <div>
                    <strong>{ac.subject_code} - {ac.subject_name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {ac.department} • Sem {ac.semester} • Section {ac.section}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--bad)', cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => handleRemoveClassRow(idx)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px dashed var(--line)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="Code (21CS62)"
                  value={addClassCode}
                  onChange={(e) => setAddClassCode(e.target.value)}
                />
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="Subject Title"
                  value={addClassName}
                  onChange={(e) => setAddClassName(e.target.value)}
                />
                <select
                  className="onboarding-select"
                  value={addClassSem}
                  onChange={(e) => setAddClassSem(parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Sem {s}</option>
                  ))}
                </select>
                <select
                  className="onboarding-select"
                  value={addClassSec}
                  onChange={(e) => setAddClassSec(e.target.value)}
                >
                  {['A', 'B', 'C', 'D'].map((sec) => (
                    <option key={sec} value={sec}>Sec {sec}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="onboarding-btn"
                style={{ padding: '6px 12px', fontSize: '12px', alignSelf: 'flex-start', background: 'var(--surface)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                onClick={handleAddClassRow}
              >
                + Add Another Class Assignment
              </button>
            </div>
          </div>

          {/* Cabin & Contact Details */}
          <div className="onboarding-row">
            <div className="onboarding-field">
              <label>Cabin / Office Room</label>
              <input
                type="text"
                className="onboarding-input"
                placeholder="e.g. Room 304, CS Block"
                value={cabinRoom}
                onChange={(e) => setCabinRoom(e.target.value)}
              />
            </div>
            <div className="onboarding-field">
              <label>Contact Phone</label>
              <input
                type="tel"
                className="onboarding-input"
                placeholder="+91 98450 12345"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
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
              {busy ? 'Saving Allocations...' : 'Complete Setup & Open Faculty Console'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
