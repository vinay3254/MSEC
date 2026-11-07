import React, { useState, useEffect } from 'react';
import './teacher-dashboard.css';
import './onboarding.css';
import { apiRequest } from '../api';
import TeacherOnboardingModal from '../components/TeacherOnboardingModal';

const FEATURE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'classes', label: 'My Classes' },
  { id: 'students', label: 'Student Management' },
  { id: 'attendance', label: 'Attendance Management' },
  { id: 'assignments', label: 'Assignment Management' },
  { id: 'evaluation', label: 'Assessment & Evaluation' },
  { id: 'analytics', label: 'Performance Analytics' },
  { id: 'ai', label: 'AI Teaching Assistant' },
  { id: 'materials', label: 'Study Materials' },
  { id: 'timetable', label: 'Timetable' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'tracking', label: 'Progress Tracking' },
  { id: 'doubts', label: 'Doubt Management' },
  { id: 'parents', label: 'Parent Communication' },
  { id: 'leaves', label: 'Leave & Substitution' },
  { id: 'reports', label: 'Reports Generation' },
  { id: 'profile', label: 'Profile & Settings' },
];

export default function TeacherDashboardScreen({ user, onLogout, onSwitchPortal, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [alertMsg, setAlertMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !user?.onboarding_completed);

  // Class Selection Preference
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);

  // Feature 1: Overview
  const [overviewData, setOverviewData] = useState(null);

  // Feature 2: My Classes
  const [classList, setClassList] = useState([]);
  const [newClass, setNewClass] = useState({ department: user?.department || 'Computer Science & Engineering', semester: 6, section: 'A', subject_code: '21CS61', subject_name: 'Software Engineering' });

  // Feature 3: Student Management
  const [students, setStudents] = useState([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    name: '',
    usn: '',
    department: 'Computer Science & Engineering',
    semester: 6,
    section: 'A',
    email: '',
    dob: '2003-05-14',
    phone: '',
  });

  const handleOpenEnrollModal = () => {
    setEnrollForm({
      name: '',
      usn: '',
      department: activeClass?.department || user?.department || 'Computer Science & Engineering',
      semester: activeClass?.semester || 6,
      section: activeClass?.section || 'A',
      email: '',
      dob: '2003-05-14',
      phone: '',
    });
    setShowEnrollModal(true);
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollForm.name.trim() || !enrollForm.usn.trim()) {
      showAlert('Student name and USN are required.');
      return;
    }
    try {
      const res = await apiRequest('/teacher/students/enroll', {
        method: 'POST',
        body: JSON.stringify(enrollForm),
      });
      showAlert(res.message || 'Student successfully enrolled into class.');
      setShowEnrollModal(false);
      loadStudents(activeClass);
      loadOverview(activeClass);
    } catch (err) {
      showAlert(err.message || 'Failed to enroll student.');
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Feature 4: Attendance Management
  const [attStatus, setAttStatus] = useState({});
  const [attCourse, setAttCourse] = useState('21CS61');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);

  // Feature 5: Assignment Management
  const [assignments, setAssignments] = useState([]);
  const [newAssign, setNewAssign] = useState({ title: '', course_code: '21CS61', course_title: 'Software Engineering', deadline_date: '', max_marks: 25, description: '' });
  const [selectedAssignId, setSelectedAssignId] = useState(null);
  const [assignSubmissions, setAssignSubmissions] = useState([]);

  // Feature 6: Assessment & Evaluation
  const [evalMarks, setEvalMarks] = useState({});
  const [evalFeedback, setEvalFeedback] = useState({});
  const [cieForm, setCieForm] = useState({ student_id: '', course_code: '21CS61', internal_marks: 22, lab_marks: 23, external_marks: 48 });

  // Feature 7: Performance Analytics
  const [analyticsData, setAnalyticsData] = useState(null);

  // Feature 8: AI Assistant
  const [aiPrompt, setAiPrompt] = useState({ type: 'quiz', topic: 'Software Design Patterns & Microservices', course: '21CS61' });
  const [aiResult, setAiResult] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Feature 9: Study Materials
  const [materials, setMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({ title: '', course_code: '21CS61', category: 'Lecture Notes', file_format: 'PDF' });

  // Feature 10: Timetable
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ day_of_week: 1, start_time: '09:00 AM', end_time: '10:00 AM', course_code: '21CS61', course_title: 'Software Engineering', room: 'LH-201' });

  // Feature 11: Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '', priority: 'Normal' });

  // Feature 12: Progress Tracking
  const [trackingList, setTrackingList] = useState([]);

  // Feature 13: Doubts
  const [doubts, setDoubts] = useState([]);
  const [replyText, setReplyText] = useState({});

  // Feature 14: Parent Communication
  const [parentMessages, setParentMessages] = useState([]);
  const [parentForm, setParentForm] = useState({ student_id: '', message_type: 'Academic Progress', subject: '', content: '' });

  // Feature 15: Leaves
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'Casual Leave', start_date: '', end_date: '', reason: '', substitute_faculty: 'Dr. K. Sharma' });

  // Feature 17: Profile & Settings
  const [teacherProfile, setTeacherProfile] = useState({ cabin_room: '', office_hours: '', contact_phone: '', bio: '', designation: '' });

  function showAlert(msg) {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(''), 4500);
  }

  const activeClass = classList[selectedClassIndex] || {
    department: user?.department || 'Computer Science & Engineering',
    semester: 6,
    section: 'A',
    subject_code: '21CS61',
    subject_name: 'Software Engineering'
  };

  // Initial load
  useEffect(() => {
    loadClasses();
    loadAssignments();
    loadDoubts();
    loadProfile();
  }, []);

  // When active class changes or class list updates, re-sync data
  useEffect(() => {
    if (activeClass) {
      loadOverview(activeClass);
      loadStudents(activeClass);
      loadAttendance(activeClass);
      if (activeTab === 'analytics') loadAnalytics(activeClass);
      if (activeTab === 'tracking') loadTracking(activeClass);
    }
  }, [selectedClassIndex, classList.length, activeTab]);

  // Tab-specific loads
  useEffect(() => {
    if (activeTab === 'materials') loadMaterials();
    if (activeTab === 'timetable') loadTimetable();
    if (activeTab === 'announcements') loadAnnouncements();
    if (activeTab === 'parents') loadParentMessages();
    if (activeTab === 'leaves') loadLeaves();
  }, [activeTab]);

  // Load functions
  const loadOverview = (cls = activeClass) => {
    const q = cls ? `?department=${encodeURIComponent(cls.department)}&semester=${cls.semester}&section=${cls.section}` : '';
    apiRequest(`/teacher/overview${q}`).then(setOverviewData).catch(() => {});
  };
  const loadClasses = () => {
    apiRequest('/teacher/classes').then((r) => {
      const cls = r.classes || [];
      setClassList(cls);
    }).catch(() => {});
  };
  const loadStudents = (cls = activeClass) => {
    const q = cls ? `?department=${encodeURIComponent(cls.department)}&semester=${cls.semester}&section=${cls.section}` : '';
    apiRequest(`/teacher/students${q}`).then((r) => {
      const list = r.students || [];
      setStudents(list);
      const initAtt = {};
      list.forEach((s) => { initAtt[s.id] = 'present'; });
      setAttStatus(initAtt);
    }).catch(() => {});
  };
  const loadAttendance = (cls = activeClass) => {
    const code = cls?.subject_code || '21CS61';
    setAttCourse(code);
    const q = cls ? `?department=${encodeURIComponent(cls.department)}&semester=${cls.semester}&section=${cls.section}&course_code=${encodeURIComponent(code)}` : '';
    apiRequest(`/teacher/attendance${q}`).catch(() => {});
  };
  const loadAssignments = () => {
    apiRequest('/teacher/assignments').then((r) => setAssignments(r.assignments || [])).catch(() => {});
  };
  const loadDoubts = () => {
    apiRequest('/teacher/doubts').then((r) => setDoubts(r.doubts || [])).catch(() => {});
  };
  const loadAnalytics = (cls = activeClass) => {
    const q = cls ? `?department=${encodeURIComponent(cls.department)}&semester=${cls.semester}&section=${cls.section}` : '';
    apiRequest(`/teacher/analytics${q}`).then(setAnalyticsData).catch(() => {});
  };
  const loadMaterials = () => {
    apiRequest('/teacher/study-materials').then((r) => setMaterials(r.materials || [])).catch(() => {});
  };
  const loadTimetable = () => {
    apiRequest('/teacher/timetable').then((r) => setTimetableSlots(r.timetable || [])).catch(() => {});
  };
  const loadAnnouncements = () => {
    apiRequest('/teacher/announcements').then((r) => setAnnouncements(r.announcements || [])).catch(() => {});
  };
  const loadTracking = (cls = activeClass) => {
    const q = cls ? `?department=${encodeURIComponent(cls.department)}&semester=${cls.semester}&section=${cls.section}` : '';
    apiRequest(`/teacher/progress-tracking${q}`).then((r) => setTrackingList(r.students || [])).catch(() => {});
  };
  const loadParentMessages = () => {
    apiRequest('/teacher/parent-messages').then((r) => setParentMessages(r.messages || [])).catch(() => {});
  };
  const loadLeaves = () => {
    apiRequest('/teacher/leaves').then((r) => setLeaves(r.leaves || [])).catch(() => {});
  };
  const loadProfile = () => {
    apiRequest('/teacher/profile').then((r) => {
      if (r?.profile) setTeacherProfile(r.profile);
    }).catch(() => {});
  };

  // Handlers for features
  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/teacher/classes', { method: 'POST', body: JSON.stringify(newClass) });
      showAlert('Class section added to your roster.');
      loadClasses();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleBatchAttendance = async () => {
    const records = Object.keys(attStatus).map((sid) => ({
      student_id: parseInt(sid),
      status: attStatus[sid] || 'present'
    }));
    try {
      await apiRequest('/teacher/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({
          course_code: attCourse,
          course_title: activeClass?.subject_name || 'Software Engineering',
          date: attDate,
          records
        })
      });
      showAlert(`Attendance recorded for ${records.length} students in Section ${activeClass?.section || 'A'}.`);
      loadStudents(activeClass);
      loadOverview(activeClass);
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssign.title || !newAssign.deadline_date) {
      showAlert('Title and deadline are required.');
      return;
    }
    try {
      await apiRequest('/teacher/assignments', { method: 'POST', body: JSON.stringify(newAssign) });
      showAlert('Assignment created and published to students.');
      setNewAssign({ title: '', course_code: '21CS61', course_title: 'Software Engineering', deadline_date: '', max_marks: 25, description: '' });
      loadAssignments();
      loadOverview(activeClass);
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleViewSubmissions = async (assignId) => {
    setSelectedAssignId(assignId);
    try {
      const res = await apiRequest(`/teacher/assignments/${assignId}/submissions`);
      setAssignSubmissions(res.submissions || []);
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleEvaluateSubmission = async (subId) => {
    const marks = evalMarks[subId];
    const feedback = evalFeedback[subId] || '';
    if (marks === undefined || marks === '') {
      showAlert('Please enter marks.');
      return;
    }
    try {
      await apiRequest(`/teacher/assignments/submissions/${subId}/evaluate`, {
        method: 'POST',
        body: JSON.stringify({ scored_marks: parseInt(marks), feedback })
      });
      showAlert('Evaluation saved and student notified.');
      handleViewSubmissions(selectedAssignId);
      loadOverview(activeClass);
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleUpdateCieMarks = async (e) => {
    e.preventDefault();
    if (!cieForm.student_id) {
      showAlert('Please select a student.');
      return;
    }
    try {
      await apiRequest('/teacher/evaluations/marks', {
        method: 'POST',
        body: JSON.stringify({
          student_id: parseInt(cieForm.student_id),
          course_code: cieForm.course_code,
          internal_marks: parseInt(cieForm.internal_marks),
          lab_marks: parseInt(cieForm.lab_marks),
          external_marks: parseInt(cieForm.external_marks)
        })
      });
      showAlert('CIE marks updated in student academic record.');
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleGenerateAI = async () => {
    setAiGenerating(true);
    setAiResult(null);
    try {
      const res = await apiRequest('/teacher/ai-assistant', {
        method: 'POST',
        body: JSON.stringify(aiPrompt)
      });
      setAiResult(res.result);
      showAlert('Teaching materials generated successfully.');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterial.title) return;
    try {
      await apiRequest('/teacher/study-materials', {
        method: 'POST',
        body: JSON.stringify(newMaterial)
      });
      showAlert('Study material published to students.');
      setNewMaterial({ title: '', course_code: '21CS61', category: 'Lecture Notes', file_format: 'PDF' });
      loadMaterials();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleAddTimetable = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/teacher/timetable', { method: 'POST', body: JSON.stringify(newSlot) });
      showAlert('Lecture scheduled in timetable.');
      loadTimetable();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnounce.title || !newAnnounce.content) return;
    try {
      await apiRequest('/teacher/announcements', { method: 'POST', body: JSON.stringify(newAnnounce) });
      showAlert('Announcement broadcasted to all students.');
      setNewAnnounce({ title: '', content: '', priority: 'Normal' });
      loadAnnouncements();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleRespondDoubt = async (doubtId) => {
    const text = replyText[doubtId];
    if (!text?.trim()) {
      showAlert('Enter a reply.');
      return;
    }
    try {
      await apiRequest(`/teacher/doubts/${doubtId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response: text.trim() })
      });
      showAlert('Response sent to student.');
      loadDoubts();
      loadOverview(activeClass);
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleSendParentMessage = async (e) => {
    e.preventDefault();
    if (!parentForm.student_id || !parentForm.content) return;
    try {
      await apiRequest('/teacher/parent-messages', {
        method: 'POST',
        body: JSON.stringify({
          student_id: parseInt(parentForm.student_id),
          message_type: parentForm.message_type,
          subject: parentForm.subject || 'Student Progress Update',
          content: parentForm.content
        })
      });
      showAlert('Progress update sent to parent.');
      setParentForm({ student_id: '', message_type: 'Academic Progress', subject: '', content: '' });
      loadParentMessages();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) return;
    try {
      await apiRequest('/teacher/leaves', { method: 'POST', body: JSON.stringify(leaveForm) });
      showAlert('Leave submitted and substitution allocated.');
      setLeaveForm({ leave_type: 'Casual Leave', start_date: '', end_date: '', reason: '', substitute_faculty: 'Dr. K. Sharma' });
      loadLeaves();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleDownloadReport = (type) => {
    const token = localStorage.getItem('msec_token');
    window.open(`http://localhost:5000/api/teacher/reports/export?type=${type}&token=${token}`, '_blank');
    showAlert(`Generating ${type} report download...`);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/teacher/profile', { method: 'PUT', body: JSON.stringify(teacherProfile) });
      showAlert('Teacher profile settings saved successfully.');
    } catch (err) {
      showAlert(err.message);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q);
  });

  return (
    <div className="teacher-dash">
      {/* Onboarding Setup Modal if not completed or opened manually */}
      {showOnboarding && (
        <TeacherOnboardingModal
          user={user}
          onComplete={(updatedUser) => {
            setShowOnboarding(false);
            if (onUpdateUser) onUpdateUser(updatedUser);
            loadClasses();
            loadProfile();
            showAlert('Faculty setup and class allocations updated successfully.');
          }}
          onClose={() => setShowOnboarding(false)}
          onCancel={() => setShowOnboarding(false)}
        />
      )}

      {/* Top Header */}
      <header className="teacher-dash__topbar">
        <div className="teacher-dash__brand">
          <img src="/favicon.svg" alt="" />
          <div className="teacher-dash__brand-title">
            <strong>MSEC Faculty Portal</strong>
            <span>Academic Management Console</span>
          </div>
        </div>
        <div className="teacher-dash__actions">
          {onSwitchPortal && (
            <button type="button" className="teacher-dash__btn-ghost" onClick={onSwitchPortal}>
              Portals
            </button>
          )}
          <button type="button" className="teacher-dash__btn-danger" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Hero Faculty Card */}
      <div className="teacher-dash__hero">
        <div className="teacher-dash__hero-info">
          <span className="teacher-dash__badge">Authorized Faculty</span>
          <h1 className="teacher-dash__hero-name">{user?.name || 'Faculty Member'}</h1>
          <p className="teacher-dash__hero-meta">
            {teacherProfile.designation || user?.profile?.designation || 'Faculty Member'} • {user?.department || 'Computer Science & Engineering'} • {user?.email}
          </p>
        </div>
        <div className="teacher-dash__quick-stats">
          <div className="teacher-dash__stat-box">
            <span className="teacher-dash__stat-label">Students in Class</span>
            <span className="teacher-dash__stat-val">{students.length}</span>
          </div>
          <div className="teacher-dash__stat-box">
            <span className="teacher-dash__stat-label">Assigned Classes</span>
            <span className="teacher-dash__stat-val">{classList.length || 1}</span>
          </div>
          <div className="teacher-dash__stat-box">
            <span className="teacher-dash__stat-label">Pending</span>
            <span className="teacher-dash__stat-val">{overviewData?.pending_tasks?.total_pending ?? doubts.length}</span>
          </div>
        </div>
      </div>

      {/* Class Preference Selector Bar (Multi-Class Support) */}
      <div className="teacher-dash__pref-bar">
        <div className="teacher-dash__pref-info">
          <span className="teacher-dash__pref-label">Viewing Class:</span>
          <select
            className="teacher-dash__pref-select"
            value={selectedClassIndex}
            onChange={(e) => setSelectedClassIndex(parseInt(e.target.value))}
          >
            {classList.map((c, i) => (
              <option key={i} value={i}>
                {c.department} • Sem {c.semester} • Section {c.section} ({c.subject_code} - {c.subject_name})
              </option>
            ))}
            {classList.length === 0 && (
              <option value={0}>Default Class: CSE - Sem 6 - Sec A (21CS61)</option>
            )}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="teacher-dash__btn-ghost"
            style={{ fontSize: '13px' }}
            onClick={() => setShowOnboarding(true)}
          >
            Edit Class Allocations & Setup
          </button>
        </div>
      </div>

      {/* 17 Features Navigation Bar */}
      <div className="teacher-dash__nav-grid">
        {FEATURE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`teacher-dash__nav-btn ${activeTab === tab.id ? 'teacher-dash__nav-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert Banner */}
      {alertMsg && <div className="teacher-dash__alert">{alertMsg}</div>}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">Dashboard Overview: Section {activeClass?.section || 'A'}</h2>
          <div className="teacher-dash__quick-stats" style={{ marginTop: '14px' }}>
            <div className="teacher-dash__stat-box">
              <span className="teacher-dash__stat-label">Average Attendance</span>
              <span className="teacher-dash__stat-val">{overviewData?.performance?.average_attendance || 85.0}%</span>
            </div>
            <div className="teacher-dash__stat-box">
              <span className="teacher-dash__stat-label">Class Average CGPA</span>
              <span className="teacher-dash__stat-val">{overviewData?.performance?.average_cgpa || 8.4}</span>
            </div>
            <div className="teacher-dash__stat-box">
              <span className="teacher-dash__stat-label">Pending Evaluations</span>
              <span className="teacher-dash__stat-val">{overviewData?.pending_tasks?.pending_evaluations || 0}</span>
            </div>
            <div className="teacher-dash__stat-box">
              <span className="teacher-dash__stat-label">Unanswered Doubts</span>
              <span className="teacher-dash__stat-val">{overviewData?.pending_tasks?.unanswered_doubts || 0}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>Upcoming Classes & Lectures</h3>
            <div className="teacher-dash__list">
              {(overviewData?.upcoming_classes || []).map((c, i) => (
                <div key={i} className="teacher-dash__item-card">
                  <div className="teacher-dash__item-top">
                    <strong>{c.course_code} - {c.course_title}</strong>
                    <span className="teacher-dash__badge">{c.room}</span>
                  </div>
                  <p className="teacher-dash__item-desc">{c.start_time} - {c.end_time}</p>
                </div>
              ))}
              {(!overviewData?.upcoming_classes || overviewData.upcoming_classes.length === 0) && (
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No lectures scheduled for today.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: MY CLASSES */}
      {activeTab === 'classes' && (
        <section className="teacher-dash__module">
          <div className="teacher-dash__module-head">
            <h2 className="section-title">My Assigned Classes & Sections</h2>
          </div>
          <div className="teacher-dash__list" style={{ marginTop: '12px' }}>
            {classList.map((c, idx) => (
              <div key={c.id || idx} className="teacher-dash__item-card">
                <div className="teacher-dash__item-top">
                  <strong>{c.subject_code} - {c.subject_name}</strong>
                  <span className="teacher-dash__badge">Section {c.section || 'A'} • Semester {c.semester}</span>
                </div>
                <p className="teacher-dash__item-desc">{c.department}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Assign New Class / Subject</h3>
            <form onSubmit={handleAddClass} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '10px' }}>
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Subject Code (e.g. 21CS63)"
                value={newClass.subject_code}
                onChange={(e) => setNewClass({ ...newClass, subject_code: e.target.value })}
              />
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Subject Title"
                value={newClass.subject_name}
                onChange={(e) => setNewClass({ ...newClass, subject_name: e.target.value })}
              />
              <select
                className="teacher-dash__select"
                value={newClass.semester}
                onChange={(e) => setNewClass({ ...newClass, semester: parseInt(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Section (e.g. A, B)"
                value={newClass.section}
                onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
              />
              <button type="submit" className="teacher-dash__btn-primary">Add Class</button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 3: STUDENT MANAGEMENT */}
      {activeTab === 'students' && (
        <section className="teacher-dash__module">
          <div className="teacher-dash__module-head">
            <div>
              <h2 className="section-title">Enrolled Students: Section {activeClass?.section || 'A'}</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                {activeClass?.department} • Semester {activeClass?.semester} • Section {activeClass?.section}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Search by name or USN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ maxWidth: '240px' }}
              />
              <button
                type="button"
                className="teacher-dash__btn"
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(109, 40, 217, 0.3)'
                }}
                onClick={handleOpenEnrollModal}
              >
                + Enroll Student to Class
              </button>
            </div>
          </div>
          <div className="teacher-dash__table-wrap" style={{ marginTop: '12px' }}>
            <table className="teacher-dash__table">
              <thead>
                <tr>
                  <th>USN</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>DOB</th>
                  <th>Sem</th>
                  <th>Attendance</th>
                  <th>CGPA</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.usn}</strong></td>
                    <td>{s.name}</td>
                    <td>{s.section || 'A'}</td>
                    <td>{s.dob || 'N/A'}</td>
                    <td>{s.semester}</td>
                    <td>
                      <span className={`teacher-dash__badge ${s.attendance >= 75 ? 'teacher-dash__badge--good' : 'teacher-dash__badge--warn'}`}>
                        {s.attendance}%
                      </span>
                    </td>
                    <td>{s.cgpa}</td>
                    <td>{s.status}</td>
                    <td>
                      <button
                        type="button"
                        className="teacher-dash__btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => setSelectedStudent(s)}
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
                      No students found for Section {activeClass?.section}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedStudent && (
            <div className="teacher-dash__item-card" style={{ marginTop: '16px', background: 'var(--surface-sunken)' }}>
              <div className="teacher-dash__item-top">
                <strong>Student Dossier: {selectedStudent.name} ({selectedStudent.usn})</strong>
                <button type="button" className="teacher-dash__btn-ghost" onClick={() => setSelectedStudent(null)}>Close</button>
              </div>
              <p className="teacher-dash__item-desc">
                Email: {selectedStudent.email} • Section: {selectedStudent.section || 'A'} • DOB: {selectedStudent.dob || 'N/A'} • CGPA: {selectedStudent.cgpa} • Attendance: {selectedStudent.attendance}%
              </p>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: ATTENDANCE MANAGEMENT */}
      {activeTab === 'attendance' && (
        <section className="teacher-dash__module">
          <div className="teacher-dash__module-head">
            <div>
              <h2 className="section-title">Mark Daily Attendance</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                {activeClass?.department} • Section {activeClass?.section || 'A'} • Course: {activeClass?.subject_code}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                className="teacher-dash__input"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
              />
              <span className="teacher-dash__badge" style={{ alignSelf: 'center' }}>
                {activeClass?.subject_code} - Section {activeClass?.section}
              </span>
            </div>
          </div>

          <div className="teacher-dash__table-wrap" style={{ marginTop: '14px' }}>
            <table className="teacher-dash__table">
              <thead>
                <tr>
                  <th>USN</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>Attendance Mark</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.usn}</strong></td>
                    <td>{s.name}</td>
                    <td>{s.section || 'A'}</td>
                    <td>
                      <div className="teacher-dash__att-group">
                        <button
                          type="button"
                          className={`teacher-dash__att-btn teacher-dash__att-btn--p ${attStatus[s.id] === 'present' ? 'active' : ''}`}
                          onClick={() => setAttStatus({ ...attStatus, [s.id]: 'present' })}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          className={`teacher-dash__att-btn teacher-dash__att-btn--a ${attStatus[s.id] === 'absent' ? 'active' : ''}`}
                          onClick={() => setAttStatus({ ...attStatus, [s.id]: 'absent' })}
                        >
                          A
                        </button>
                        <button
                          type="button"
                          className={`teacher-dash__att-btn teacher-dash__att-btn--od ${attStatus[s.id] === 'od' ? 'active' : ''}`}
                          onClick={() => setAttStatus({ ...attStatus, [s.id]: 'od' })}
                        >
                          OD
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="teacher-dash__btn-primary"
            style={{ marginTop: '16px' }}
            onClick={handleBatchAttendance}
          >
            Submit Class Attendance (Syncs Live for Section {activeClass?.section || 'A'})
          </button>
        </section>
      )}

      {/* TAB 5: ASSIGNMENT MANAGEMENT */}
      {activeTab === 'assignments' && (
        <section className="teacher-dash__module">
          <div className="teacher-dash__module-head">
            <h2 className="section-title">Assignment Management & Submissions</h2>
          </div>

          <div className="teacher-dash__list" style={{ marginTop: '12px' }}>
            {assignments.map((a) => (
              <div key={a.id} className="teacher-dash__item-card">
                <div className="teacher-dash__item-top">
                  <strong>{a.course_code}: {a.title}</strong>
                  <span className="teacher-dash__badge">Due: {a.deadline_date}</span>
                </div>
                <p className="teacher-dash__item-desc">{a.description || 'No description provided.'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Submissions: {a.total_submissions || 0} • Evaluated: {a.evaluated_submissions || 0}
                  </span>
                  <button
                    type="button"
                    className="teacher-dash__btn-primary"
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                    onClick={() => handleViewSubmissions(a.id)}
                  >
                    View Submissions
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Submissions Drawer */}
          {selectedAssignId && (
            <div style={{ marginTop: '20px', borderTop: '2px solid var(--primary)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Student Submissions (Assignment #{selectedAssignId})</h3>
                <button type="button" className="teacher-dash__btn-ghost" onClick={() => setSelectedAssignId(null)}>Close</button>
              </div>
              <div className="teacher-dash__table-wrap" style={{ marginTop: '10px' }}>
                <table className="teacher-dash__table">
                  <thead>
                    <tr>
                      <th>USN</th>
                      <th>Student Name</th>
                      <th>Submitted File</th>
                      <th>Status</th>
                      <th>Score / Max</th>
                      <th>Evaluate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignSubmissions.map((sub) => (
                      <tr key={sub.id}>
                        <td><strong>{sub.usn}</strong></td>
                        <td>{sub.student_name}</td>
                        <td><a href={sub.file_path || '#'} target="_blank" rel="noreferrer">{sub.file_name || 'Download'}</a></td>
                        <td><span className="teacher-dash__badge">{sub.status}</span></td>
                        <td>{sub.scored_marks != null ? `${sub.scored_marks} / 25` : 'Pending'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="number"
                              className="teacher-dash__input"
                              style={{ width: '60px', padding: '4px' }}
                              placeholder="Marks"
                              value={evalMarks[sub.id] ?? (sub.scored_marks || '')}
                              onChange={(e) => setEvalMarks({ ...evalMarks, [sub.id]: e.target.value })}
                            />
                            <button
                              type="button"
                              className="teacher-dash__btn-primary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => handleEvaluateSubmission(sub.id)}
                            >
                              Grade
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {assignSubmissions.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>No student submissions yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create Assignment Form */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Create New Assignment</h3>
            <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Assignment Title"
                value={newAssign.title}
                onChange={(e) => setNewAssign({ ...newAssign, title: e.target.value })}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  className="teacher-dash__input"
                  placeholder="Course Code (21CS61)"
                  value={newAssign.course_code}
                  onChange={(e) => setNewAssign({ ...newAssign, course_code: e.target.value })}
                />
                <input
                  type="date"
                  className="teacher-dash__input"
                  value={newAssign.deadline_date}
                  onChange={(e) => setNewAssign({ ...newAssign, deadline_date: e.target.value })}
                />
                <input
                  type="number"
                  className="teacher-dash__input"
                  placeholder="Max Marks (25)"
                  value={newAssign.max_marks}
                  onChange={(e) => setNewAssign({ ...newAssign, max_marks: e.target.value })}
                />
              </div>
              <textarea
                className="teacher-dash__textarea"
                rows={3}
                placeholder="Assignment Guidelines / Problem Statement..."
                value={newAssign.description}
                onChange={(e) => setNewAssign({ ...newAssign, description: e.target.value })}
              />
              <button type="submit" className="teacher-dash__btn-primary">Publish Assignment to Students</button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 6: ASSESSMENT & EVALUATION */}
      {activeTab === 'evaluation' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">Assessment & Marks Evaluation</h2>
          <p className="teacher-dash__item-desc" style={{ marginTop: '4px' }}>
            Directly post CIE / internal marks that connect and update the student's academic record.
          </p>

          <form onSubmit={handleUpdateCieMarks} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px' }}>
            <select
              className="teacher-dash__select"
              value={cieForm.student_id}
              onChange={(e) => setCieForm({ ...cieForm, student_id: e.target.value })}
            >
              <option value="">Select Student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.usn}) - Sec {s.section || 'A'}</option>
              ))}
            </select>
            <input
              type="text"
              className="teacher-dash__input"
              placeholder="Course Code"
              value={cieForm.course_code}
              onChange={(e) => setCieForm({ ...cieForm, course_code: e.target.value })}
            />
            <input
              type="number"
              className="teacher-dash__input"
              placeholder="Internal Marks (max 25)"
              value={cieForm.internal_marks}
              onChange={(e) => setCieForm({ ...cieForm, internal_marks: e.target.value })}
            />
            <input
              type="number"
              className="teacher-dash__input"
              placeholder="Lab Marks (max 25)"
              value={cieForm.lab_marks}
              onChange={(e) => setCieForm({ ...cieForm, lab_marks: e.target.value })}
            />
            <input
              type="number"
              className="teacher-dash__input"
              placeholder="External Marks (max 50)"
              value={cieForm.external_marks}
              onChange={(e) => setCieForm({ ...cieForm, external_marks: e.target.value })}
            />
            <button type="submit" className="teacher-dash__btn-primary">Commit Marks to Database</button>
          </form>
        </section>
      )}

      {/* TAB 7: PERFORMANCE ANALYTICS */}
      {activeTab === 'analytics' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">Academic Performance Analytics: Section {activeClass?.section || 'A'}</h2>
          <div className="teacher-dash__quick-stats" style={{ marginTop: '14px' }}>
            <div className="teacher-dash__stat-box">
              <span className="teacher-dash__stat-label">Pass Percentage</span>
              <span className="teacher-dash__stat-val">{analyticsData?.pass_percentage || 94.5}%</span>
            </div>
            <div className="teacher-dash__stat-box">
              <span className="teacher-dash__stat-label">Class Average CGPA</span>
              <span className="teacher-dash__stat-val">{analyticsData?.class_average_cgpa || 8.2}</span>
            </div>
            <div className="teacher-dash__stat-box">
              <span className="teacher-dash__stat-label">Attendance &gt; 85%</span>
              <span className="teacher-dash__stat-val">{analyticsData?.attendance_brackets?.above_85 || 0}</span>
            </div>
            <div className="teacher-dash__stat-box">
              <span className="teacher-dash__stat-label">Attendance &lt; 75% (Shortage)</span>
              <span className="teacher-dash__stat-val">{analyticsData?.attendance_brackets?.below_75 || 0}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Top Class Performers</h3>
            <div className="teacher-dash__list" style={{ marginTop: '10px' }}>
              {(analyticsData?.top_performers || students.slice(0, 3)).map((s, idx) => (
                <div key={idx} className="teacher-dash__item-card">
                  <div className="teacher-dash__item-top">
                    <strong>#{idx + 1} {s.name} ({s.usn})</strong>
                    <span className="teacher-dash__badge teacher-dash__badge--good">CGPA: {s.cgpa}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 8: AI TEACHING ASSISTANT */}
      {activeTab === 'ai' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">AI Teaching Assistant</h2>
          <p className="teacher-dash__item-desc" style={{ marginTop: '4px' }}>
            Generate quizzes, question banks, and structured lesson plans aligned with your syllabus.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '16px' }}>
            <select
              className="teacher-dash__select"
              value={aiPrompt.type}
              onChange={(e) => setAiPrompt({ ...aiPrompt, type: e.target.value })}
            >
              <option value="quiz">Interactive Quiz & Multiple Choice</option>
              <option value="lesson_plan">Structured 60-Min Lesson Plan</option>
              <option value="question_bank">CIE Question Bank (10 Marks)</option>
            </select>
            <input
              type="text"
              className="teacher-dash__input"
              placeholder="Topic (e.g. Distributed Consensus, Raft Algorithm)"
              value={aiPrompt.topic}
              onChange={(e) => setAiPrompt({ ...aiPrompt, topic: e.target.value })}
            />
          </div>

          <button
            type="button"
            className="teacher-dash__btn-primary"
            style={{ marginTop: '12px' }}
            disabled={aiGenerating}
            onClick={handleGenerateAI}
          >
            {aiGenerating ? 'AI Assistant Generating...' : 'Generate Teaching Materials'}
          </button>

          {aiResult && (
            <div className="teacher-dash__ai-box">
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Generated {aiResult.type.toUpperCase()}: {aiResult.topic}</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Course: {aiResult.course} • Generated at: {aiResult.generated_at}</p>

              {aiResult.questions && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {aiResult.questions.map((q, idx) => (
                    <div key={idx} className="teacher-dash__ai-output">
                      <strong>Q{idx + 1}: {typeof q === 'string' ? q : q.question}</strong>
                      {q.options && (
                        <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                          {q.options.map((opt, oi) => (
                            <li key={oi} style={{ fontWeight: oi === q.correct ? 700 : 400, color: oi === q.correct ? 'var(--good)' : 'var(--ink)' }}>
                              {opt} {oi === q.correct ? '(Correct)' : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.explanation && <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Note: {q.explanation}</p>}
                    </div>
                  ))}
                </div>
              )}

              {aiResult.timeline && (
                <div style={{ marginTop: '12px' }}>
                  <strong>Lesson Delivery Timeline:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {aiResult.timeline.map((item, ti) => (
                      <div key={ti} className="teacher-dash__item-card" style={{ padding: '10px' }}>
                        <span style={{ fontWeight: 700 }}>{item.time} - {item.phase}</span>
                        <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{item.activity}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 9: STUDY MATERIALS */}
      {activeTab === 'materials' && (
        <section className="teacher-dash__module">
          <div className="teacher-dash__module-head">
            <h2 className="section-title">Course Study Materials & Notes</h2>
          </div>

          <div className="teacher-dash__list" style={{ marginTop: '12px' }}>
            {materials.map((m) => (
              <div key={m.id} className="teacher-dash__item-card">
                <div className="teacher-dash__item-top">
                  <strong>{m.title}</strong>
                  <span className="teacher-dash__badge">{m.file_format || 'PDF'}</span>
                </div>
                <p className="teacher-dash__item-desc">{m.course_code}: {m.category} • Uploaded by {m.uploaded_by} on {m.upload_date}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Upload New Resource</h3>
            <form onSubmit={handleUploadMaterial} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '10px' }}>
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Material Title"
                value={newMaterial.title}
                onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
              />
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Course Code (21CS61)"
                value={newMaterial.course_code}
                onChange={(e) => setNewMaterial({ ...newMaterial, course_code: e.target.value })}
              />
              <select
                className="teacher-dash__select"
                value={newMaterial.category}
                onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
              >
                <option value="Lecture Notes">Lecture Notes</option>
                <option value="Presentation">Presentation (PPT)</option>
                <option value="Question Bank">Question Bank</option>
                <option value="Lab Manual">Lab Manual</option>
              </select>
              <button type="submit" className="teacher-dash__btn-primary">Publish to Student Desk</button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 10: TIMETABLE */}
      {activeTab === 'timetable' && (
        <section className="teacher-dash__module">
          <div className="teacher-dash__module-head">
            <h2 className="section-title">Timetable Management</h2>
          </div>

          <div className="teacher-dash__table-wrap" style={{ marginTop: '14px' }}>
            <table className="teacher-dash__table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Timing</th>
                  <th>Subject</th>
                  <th>Hall</th>
                  <th>Faculty</th>
                </tr>
              </thead>
              <tbody>
                {timetableSlots.map((slot) => {
                  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  return (
                    <tr key={slot.id}>
                      <td><strong>{dayNames[slot.day_of_week] || 'Day ' + slot.day_of_week}</strong></td>
                      <td>{slot.start_time} - {slot.end_time}</td>
                      <td>{slot.course_code}: {slot.course_title}</td>
                      <td>{slot.room}</td>
                      <td>{slot.faculty_name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Schedule Lecture Slot</h3>
            <form onSubmit={handleAddTimetable} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '10px' }}>
              <select
                className="teacher-dash__select"
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
              >
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Start Time (09:00 AM)"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
              />
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="End Time (10:00 AM)"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
              />
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Course Code"
                value={newSlot.course_code}
                onChange={(e) => setNewSlot({ ...newSlot, course_code: e.target.value })}
              />
              <input
                type="text"
                className="teacher-dash__input"
                placeholder="Room (e.g. LH-201)"
                value={newSlot.room}
                onChange={(e) => setNewSlot({ ...newSlot, room: e.target.value })}
              />
              <button type="submit" className="teacher-dash__btn-primary">Add Slot</button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 11: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <section className="teacher-dash__module">
          <div className="teacher-dash__module-head">
            <h2 className="section-title">Broadcast Announcements & Notifications</h2>
          </div>

          <form onSubmit={handlePostAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            <input
              type="text"
              className="teacher-dash__input"
              placeholder="Announcement Title / Notice Heading"
              value={newAnnounce.title}
              onChange={(e) => setNewAnnounce({ ...newAnnounce, title: e.target.value })}
            />
            <textarea
              className="teacher-dash__textarea"
              rows={3}
              placeholder="Announcement details (automatically sends instant push notifications to all students in department)..."
              value={newAnnounce.content}
              onChange={(e) => setNewAnnounce({ ...newAnnounce, content: e.target.value })}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <select
                className="teacher-dash__select"
                style={{ maxWidth: '180px' }}
                value={newAnnounce.priority}
                onChange={(e) => setNewAnnounce({ ...newAnnounce, priority: e.target.value })}
              >
                <option value="Normal">Normal Priority</option>
                <option value="High">High Priority</option>
                <option value="Urgent">Urgent Academic Alert</option>
              </select>
              <button type="submit" className="teacher-dash__btn-primary">Broadcast Announcement</button>
            </div>
          </form>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Recent Notices</h3>
            <div className="teacher-dash__list" style={{ marginTop: '10px' }}>
              {announcements.map((a) => (
                <div key={a.id} className="teacher-dash__item-card">
                  <div className="teacher-dash__item-top">
                    <strong>{a.title}</strong>
                    <span className="teacher-dash__badge">{a.published_date}</span>
                  </div>
                  <p className="teacher-dash__item-desc">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 12: PROGRESS TRACKING */}
      {activeTab === 'tracking' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">Student Progress Tracking & Academic At-Risk Monitor</h2>
          <p className="teacher-dash__item-desc" style={{ marginTop: '4px' }}>
            Monitoring Section {activeClass?.section || 'A'}: Auto-scans attendance (&lt;75%) and CGPA (&lt;7.0) to flag students needing academic counseling.
          </p>

          <div className="teacher-dash__list" style={{ marginTop: '14px' }}>
            {trackingList.map((st) => (
              <div key={st.id} className="teacher-dash__item-card">
                <div className="teacher-dash__item-top">
                  <strong>{st.name} ({st.usn}) • Sec {st.section || 'A'}</strong>
                  <span className={`teacher-dash__progress-badge teacher-dash__progress-badge--${st.risk_level.toLowerCase()}`}>
                    {st.risk_level} Risk
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', margin: '6px 0' }}>
                  <span>Attendance: <strong>{st.attendance}%</strong></span>
                  <span>CGPA: <strong>{st.cgpa}</strong></span>
                  <span>Backlogs: <strong>{st.backlogs}</strong></span>
                </div>
                <p style={{ margin: '0', fontSize: '13px', color: 'var(--bad)' }}>
                  Issues: {st.reasons.join(' • ')}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                  Recommended Action: {st.recommended_action}
                </p>
              </div>
            ))}
            {trackingList.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>All students in Section {activeClass?.section || 'A'} are in good academic standing.</p>
            )}
          </div>
        </section>
      )}

      {/* TAB 13: DOUBT MANAGEMENT */}
      {activeTab === 'doubts' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">Student Doubt Resolution Desk</h2>
          <div className="teacher-dash__list" style={{ marginTop: '14px' }}>
            {doubts.map((d) => (
              <div key={d.id} className="teacher-dash__item-card">
                <div className="teacher-dash__item-top">
                  <strong>{d.student_name} ({d.usn}) • {d.subject_name || d.subject_code}</strong>
                  <span className={`teacher-dash__badge ${d.status === 'answered' ? 'teacher-dash__badge--good' : 'teacher-dash__badge--warn'}`}>
                    {d.status}
                  </span>
                </div>
                <p style={{ fontWeight: 600, fontSize: '14px', margin: '4px 0' }}>{d.title || d.question}</p>
                {d.title && d.question && <p className="teacher-dash__item-desc">{d.question}</p>}

                {d.answer ? (
                  <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>Your Response ({d.responded_at}):</span>
                    <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{d.answer}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      className="teacher-dash__input"
                      placeholder="Type your explanation or response..."
                      value={replyText[d.id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [d.id]: e.target.value })}
                    />
                    <button
                      type="button"
                      className="teacher-dash__btn-primary"
                      onClick={() => handleRespondDoubt(d.id)}
                    >
                      Answer
                    </button>
                  </div>
                )}
              </div>
            ))}
            {doubts.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No student doubts pending.</p>
            )}
          </div>
        </section>
      )}

      {/* TAB 14: PARENT COMMUNICATION */}
      {activeTab === 'parents' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">Parent Communication & Progress Reporting</h2>
          <p className="teacher-dash__item-desc" style={{ marginTop: '4px' }}>
            Directly dispatch official attendance updates and academic feedback to parents of Section {activeClass?.section || 'A'}.
          </p>

          <form onSubmit={handleSendParentMessage} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <select
                className="teacher-dash__select"
                value={parentForm.student_id}
                onChange={(e) => setParentForm({ ...parentForm, student_id: e.target.value })}
              >
                <option value="">Select Ward / Student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.usn}) - Sec {s.section || 'A'}</option>
                ))}
              </select>
              <select
                className="teacher-dash__select"
                value={parentForm.message_type}
                onChange={(e) => setParentForm({ ...parentForm, message_type: e.target.value })}
              >
                <option value="Academic Progress">Academic Commendation / Progress</option>
                <option value="Attendance Alert">Attendance Shortage Alert</option>
                <option value="CIE Performance">CIE Examination Performance</option>
              </select>
            </div>
            <input
              type="text"
              className="teacher-dash__input"
              placeholder="Subject / Reference Heading"
              value={parentForm.subject}
              onChange={(e) => setParentForm({ ...parentForm, subject: e.target.value })}
            />
            <textarea
              className="teacher-dash__textarea"
              rows={3}
              placeholder="Message details dispatched to parent email..."
              value={parentForm.content}
              onChange={(e) => setParentForm({ ...parentForm, content: e.target.value })}
            />
            <button type="submit" className="teacher-dash__btn-primary">Dispatch Update to Parent</button>
          </form>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Communication Log</h3>
            <div className="teacher-dash__list" style={{ marginTop: '10px' }}>
              {parentMessages.map((m) => (
                <div key={m.id} className="teacher-dash__item-card">
                  <div className="teacher-dash__item-top">
                    <strong>Ward: {m.student_name} ({m.student_usn}) • {m.message_type}</strong>
                    <span className="teacher-dash__badge">{m.sent_at}</span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '13px', margin: '4px 0' }}>{m.subject}</p>
                  <p className="teacher-dash__item-desc">{m.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 15: LEAVE & SUBSTITUTION */}
      {activeTab === 'leaves' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">Leave & Substitution Management</h2>

          <form onSubmit={handleApplyLeave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '14px' }}>
            <select
              className="teacher-dash__select"
              value={leaveForm.leave_type}
              onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
            >
              <option value="Casual Leave">Casual Leave</option>
              <option value="On-Duty Academic">On-Duty Academic Conference</option>
              <option value="Medical Leave">Medical Leave</option>
            </select>
            <input
              type="date"
              className="teacher-dash__input"
              value={leaveForm.start_date}
              onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
            />
            <input
              type="date"
              className="teacher-dash__input"
              value={leaveForm.end_date}
              onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
            />
            <input
              type="text"
              className="teacher-dash__input"
              placeholder="Substitute Faculty"
              value={leaveForm.substitute_faculty}
              onChange={(e) => setLeaveForm({ ...leaveForm, substitute_faculty: e.target.value })}
            />
            <input
              type="text"
              className="teacher-dash__input"
              placeholder="Reason for Leave"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
            />
            <button type="submit" className="teacher-dash__btn-primary">Apply Leave</button>
          </form>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Leave History</h3>
            <div className="teacher-dash__list" style={{ marginTop: '10px' }}>
              {leaves.map((l) => (
                <div key={l.id} className="teacher-dash__item-card">
                  <div className="teacher-dash__item-top">
                    <strong>{l.leave_type} ({l.start_date} to {l.end_date})</strong>
                    <span className="teacher-dash__badge teacher-dash__badge--good">{l.status}</span>
                  </div>
                  <p className="teacher-dash__item-desc">Reason: {l.reason} • Substitute: {l.substitute_faculty}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 16: REPORTS GENERATION */}
      {activeTab === 'reports' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">Reports Generation & Export</h2>
          <p className="teacher-dash__item-desc" style={{ marginTop: '4px' }}>
            Generate and export official institutional reports directly from live database tables.
          </p>

          <div className="teacher-dash__report-cards">
            <div className="teacher-dash__report-card">
              <strong>Attendance Register Report</strong>
              <p className="teacher-dash__item-desc">Consolidated student attendance percentages, attended vs total hours.</p>
              <button
                type="button"
                className="teacher-dash__btn-primary"
                onClick={() => handleDownloadReport('attendance')}
              >
                Download Attendance CSV
              </button>
            </div>

            <div className="teacher-dash__report-card">
              <strong>Academic Marks & CIE Report</strong>
              <p className="teacher-dash__item-desc">Complete semester marks, internal evaluation, grades, and pass/fail standings.</p>
              <button
                type="button"
                className="teacher-dash__btn-primary"
                onClick={() => handleDownloadReport('marks')}
              >
                Download Marks CSV
              </button>
            </div>

            <div className="teacher-dash__report-card">
              <strong>Assignment Submissions Ledger</strong>
              <p className="teacher-dash__item-desc">Log of all student submissions, submission timestamps, and evaluation marks.</p>
              <button
                type="button"
                className="teacher-dash__btn-primary"
                onClick={() => handleDownloadReport('assignments')}
              >
                Download Assignments CSV
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 17: PROFILE & SETTINGS */}
      {activeTab === 'profile' && (
        <section className="teacher-dash__module">
          <h2 className="section-title">Teacher Profile & Settings</h2>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Academic Role / Designation</label>
                <input
                  type="text"
                  className="teacher-dash__input"
                  value={teacherProfile.designation || ''}
                  onChange={(e) => setTeacherProfile({ ...teacherProfile, designation: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Cabin / Office Location</label>
                <input
                  type="text"
                  className="teacher-dash__input"
                  value={teacherProfile.cabin_room || ''}
                  onChange={(e) => setTeacherProfile({ ...teacherProfile, cabin_room: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Office Hours</label>
                <input
                  type="text"
                  className="teacher-dash__input"
                  value={teacherProfile.office_hours || ''}
                  onChange={(e) => setTeacherProfile({ ...teacherProfile, office_hours: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Contact Phone</label>
                <input
                  type="text"
                  className="teacher-dash__input"
                  value={teacherProfile.contact_phone || ''}
                  onChange={(e) => setTeacherProfile({ ...teacherProfile, contact_phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Professional Biography / Research Specialization</label>
              <textarea
                className="teacher-dash__textarea"
                rows={3}
                value={teacherProfile.bio || ''}
                onChange={(e) => setTeacherProfile({ ...teacherProfile, bio: e.target.value })}
              />
            </div>

            <button type="submit" className="teacher-dash__btn-primary">Save Profile Preferences</button>
          </form>
        </section>
      )}
    
      {/* Student Enrollment Modal */}
      {showEnrollModal && (
        <div className="onboarding-overlay">
          <div className="onboarding-modal" style={{ maxWidth: '540px' }}>
            <button
              type="button"
              className="onboarding-modal__close"
              onClick={() => setShowEnrollModal(false)}
            >
              ×
            </button>
            <div className="onboarding-modal__head">
              <span className="onboarding-modal__badge">Student Class Enrollment</span>
              <h2 className="onboarding-modal__title">Enroll Student into Class</h2>
              <p className="onboarding-modal__sub">
                Assign a student with legit academic credentials (USN, Section, Department, Semester) to this class. When the student logs in with these details, their account will be directly bound to this enrolled roster.
              </p>
            </div>

            <form onSubmit={handleEnrollStudent} className="onboarding-form">
              <div className="onboarding-row">
                <div className="onboarding-field">
                  <label>Student Full Name *</label>
                  <input
                    type="text"
                    className="onboarding-input"
                    placeholder="e.g. Reshma Banu"
                    value={enrollForm.name}
                    onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="onboarding-field">
                  <label>University Serial Number (USN) *</label>
                  <input
                    type="text"
                    className="onboarding-input"
                    placeholder="e.g. 1ME23CS108 / 1MS21CS084"
                    value={enrollForm.usn}
                    onChange={(e) => setEnrollForm({ ...enrollForm, usn: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label>Department / Branch</label>
                <select
                  className="onboarding-select"
                  value={enrollForm.department}
                  onChange={(e) => setEnrollForm({ ...enrollForm, department: e.target.value })}
                >
                  {[
                    'Computer Science & Engineering',
                    'Information Science & Engineering',
                    'Artificial Intelligence & Data Science',
                    'Electronics & Communication Engineering',
                    'Mechanical Engineering',
                    'Civil Engineering',
                  ].map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="onboarding-row--3">
                <div className="onboarding-field">
                  <label>Semester</label>
                  <select
                    className="onboarding-select"
                    value={enrollForm.semester}
                    onChange={(e) => setEnrollForm({ ...enrollForm, semester: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div className="onboarding-field">
                  <label>Class Section</label>
                  <select
                    className="onboarding-select"
                    value={enrollForm.section}
                    onChange={(e) => setEnrollForm({ ...enrollForm, section: e.target.value.toUpperCase() })}
                  >
                    {['A', 'B', 'C', 'D'].map((sec) => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>

                <div className="onboarding-field">
                  <label>Date of Birth (DOB)</label>
                  <input
                    type="date"
                    className="onboarding-input"
                    value={enrollForm.dob}
                    onChange={(e) => setEnrollForm({ ...enrollForm, dob: e.target.value })}
                  />
                </div>
              </div>

              <div className="onboarding-row">
                <div className="onboarding-field">
                  <label>Student Email (Optional)</label>
                  <input
                    type="email"
                    className="onboarding-input"
                    placeholder="student@college.edu or gmail"
                    value={enrollForm.email}
                    onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                  />
                </div>
                <div className="onboarding-field">
                  <label>Contact Phone (Optional)</label>
                  <input
                    type="tel"
                    className="onboarding-input"
                    placeholder="+91 98765 43210"
                    value={enrollForm.phone}
                    onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="onboarding-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="onboarding-btn onboarding-btn--cancel"
                  onClick={() => setShowEnrollModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="onboarding-btn onboarding-btn--primary"
                >
                  Complete Enrollment & Add to Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
</div>
  );
}
