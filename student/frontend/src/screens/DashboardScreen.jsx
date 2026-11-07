import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import AttendanceRing from '../components/AttendanceRing';
import SavedRecordNotice from '../components/SavedRecordNotice';
import { Icon } from '../components/Shell/icons';
import { OPEN_SUBMIT_KEY } from './AssignmentsScreen';
import ErrorCard from '../components/ErrorCard';
import './dashboard.css';


function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="dashboard__section-head">
      <h2 className="section-title">{title}</h2>
      {onAction && (
        <button type="button" className="btn btn-ghost dashboard__link" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function DashboardHome({ onNavigate, currentUser, onOpenOnboarding }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest('/dashboard/summary');
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Submitting needs a file: open Assignments with this assignment's upload sheet.
  const handleAssignmentSubmit = (id) => {
    sessionStorage.setItem(OPEN_SUBMIT_KEY, String(id));
    onNavigate?.('assignments');
  };

  const go = (id) => () => onNavigate?.(id);

  if (error) {
    return (
      <div className="page dashboard" data-qa="dashboard-screen">
        <ErrorCard error={error} onRetry={fetchSummary} />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="page dashboard" data-qa="dashboard-screen">
        <div className="empty-state">Loading dashboard...</div>
      </div>
    );
  }

  const { student, upcoming_examinations, pending_assignments, recent_announcements } = data;
  const eligible = student.overall_attendance >= 75;

  return (
    <div className="page dashboard" data-qa="dashboard-screen">
      <SavedRecordNotice endpoint="/dashboard/summary" />
      {!currentUser?.onboarding_completed && (
        <div style={{
          background: 'rgba(78, 36, 120, 0.08)',
          border: '1px solid #4E2478',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div>
            <strong style={{ color: '#4E2478', fontSize: '14px', display: 'block', marginBottom: '2px' }}>
              Student Profile Setup Required
            </strong>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Please enter your Full Name, USN, Department, Section (A, B, C, D), DOB, Semester, and Academic Year.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenOnboarding}
            style={{
              background: '#4E2478',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Complete Setup Now
          </button>
        </div>
      )}
      <section className="dashboard__hero" aria-label={`Student summary for ${student.name}`}>
        <div className="dashboard__hero-top">
          <AttendanceRing value={student.overall_attendance} />
          <div className="dashboard__attendance-label"><span>Attendance</span>
            <span className={`pill pill--${eligible ? 'good' : 'bad'}`}><i />{eligible ? 'Eligible for exams' : 'Attendance shortage'}</span>
          </div>
        </div>
        <div className="dashboard__gpa">
          <div><span>SGPA</span><strong>{student.current_sgpa}</strong></div>
          <div><span>CGPA</span><strong>{student.cgpa}</strong></div>
        </div>
      </section>

      <section>
        <SectionHeader title="Exams" actionLabel="See all" onAction={go('examinations')} />
        <div className="dashboard__exams scroll-x">
          {(upcoming_examinations || []).map((exam) => {
            const date = new Date(`${exam.exam_date}T12:00:00`);
            const valid = !Number.isNaN(date.getTime());
            return <button type="button" key={exam.id} className="exam-preview" onClick={go('examinations')}>
              <div className="exam-preview__top">
                <div className="exam-preview__date"><span>{valid ? date.toLocaleDateString('en', { month: 'short' }) : 'TBA'}</span><strong>{valid ? date.getDate() : '—'}</strong></div>
                <div className="exam-preview__course"><span>{exam.course_code}</span><strong>{exam.course_title}</strong></div>
              </div>
              <div className="exam-preview__meta"><span><Icon name="clock" size={14} />{exam.start_time || 'Time TBA'}</span><span><Icon name="pin" size={14} />{exam.exam_hall || 'Hall TBA'}</span></div>
            </button>;
          })}
          {!upcoming_examinations?.length && <p className="empty-state">No upcoming examinations scheduled.</p>}
        </div>
      </section>

      <section>
        <SectionHeader title="Due soon" actionLabel="See all" onAction={go('assignments')} />
        <div className="reference-list">
          {(pending_assignments || []).map((a) => <div className="assignment-preview" key={a.id}>
            <span className="assignment-preview__dot" />
            <div className="reference-list__text"><strong>{a.title}</strong><span>{a.course_code} · {a.deadline_date}</span></div>
            <button type="button" className="dashboard__submit" onClick={() => handleAssignmentSubmit(a.id)}>Submit</button>
          </div>)}
          {!pending_assignments?.length && <p className="empty-state">All assignments have been submitted.</p>}
        </div>
      </section>

      <section>
        <SectionHeader title="Notices" />
        <div className="reference-list">
          {(recent_announcements || []).map((n) => <button key={n.id} type="button" className="notice-preview" onClick={go('notifications')}>
            <span className={`reference-icon${n.priority === 'High' ? ' reference-icon--accent' : ''}`}><Icon name="megaphone" size={20} /></span>
            <span className="reference-list__text"><strong>{n.title}</strong><span>{n.department} · {n.published_date}</span></span>
            <Icon name="chevron" size={16} />
          </button>)}
          {!recent_announcements?.length && <p className="empty-state">No current notices available.</p>}
        </div>
      </section>
    </div>
  );
}
