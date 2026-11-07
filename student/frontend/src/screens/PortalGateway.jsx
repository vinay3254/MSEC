import React from 'react';
import './portal-gateway.css';

export default function PortalGateway({ onSelectPortal }) {
  return (
    <div className="gateway">
      <header className="gateway__header">
        <div className="gateway__brand">
          <img src="/favicon.svg" alt="MSEC" className="gateway__brand-logo" />
          <div className="gateway__brand-text">
            <span className="gateway__inst-name">MS ENGINEERING COLLEGE</span>
            <span className="gateway__inst-sub">Affiliated to VTU | Approved by AICTE | ESTD. 2002</span>
          </div>
        </div>

        <div className="gateway__title-box">
          <h1 className="gateway__title">Institutional Portal Gateway</h1>
          <p className="gateway__subtitle">
            Select your designated dashboard access portal below to continue to your academic workspace.
          </p>
        </div>
      </header>

      <main className="gateway__grid">
        {/* Card 1: Student Dashboard Access */}
        <div className="gateway__card" data-qa="student-portal-card">
          <div className="gateway__card-top">
            <span className="gateway__card-badge gateway__card-badge--student">Student Access</span>
            <div className="gateway__card-icon gateway__card-icon--student">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
          </div>

          <div className="gateway__card-content">
            <h2 className="gateway__card-title">Student Dashboard</h2>
            <p className="gateway__card-desc">
              Comprehensive portal for enrolled undergraduate and postgraduate students to track academics and campus life.
            </p>

            <div className="gateway__features">
              <span className="gateway__feature-tag">Live Attendance</span>
              <span className="gateway__feature-tag">CIE / SEE Marks</span>
              <span className="gateway__feature-tag">Timetable</span>
              <span className="gateway__feature-tag">Assignments</span>
              <span className="gateway__feature-tag">Hall Ticket</span>
              <span className="gateway__feature-tag">Fee Status</span>
            </div>
          </div>

          <button
            type="button"
            className="gateway__card-btn gateway__card-btn--student"
            onClick={() => onSelectPortal('student')}
          >
            Enter Student Dashboard &rarr;
          </button>
        </div>

        {/* Card 2: Teacher Dashboard Access */}
        <div className="gateway__card" data-qa="teacher-portal-card">
          <div className="gateway__card-top">
            <span className="gateway__card-badge gateway__card-badge--teacher">Faculty Access</span>
            <div className="gateway__card-icon gateway__card-icon--teacher">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
          </div>

          <div className="gateway__card-content">
            <h2 className="gateway__card-title">Teacher Dashboard</h2>
            <p className="gateway__card-desc">
              Faculty workspace to manage assigned classes, student academic evaluations, lecture schedules, and attendance.
            </p>

            <div className="gateway__features">
              <span className="gateway__feature-tag">Class Rosters</span>
              <span className="gateway__feature-tag">Mark Attendance</span>
              <span className="gateway__feature-tag">CIE Grading</span>
              <span className="gateway__feature-tag">Post Assignments</span>
              <span className="gateway__feature-tag">Course Notes</span>
              <span className="gateway__feature-tag">Resolve Doubts</span>
            </div>
          </div>

          <button
            type="button"
            className="gateway__card-btn gateway__card-btn--teacher"
            onClick={() => onSelectPortal('teacher')}
          >
            Enter Teacher Dashboard &rarr;
          </button>
        </div>

        {/* Card 3: Library Dashboard Access */}
        <div className="gateway__card" data-qa="library-portal-card">
          <div className="gateway__card-top">
            <span className="gateway__card-badge gateway__card-badge--library">Digital Library</span>
            <div className="gateway__card-icon gateway__card-icon--library">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
          </div>

          <div className="gateway__card-content">
            <h2 className="gateway__card-title">Library Dashboard</h2>
            <p className="gateway__card-desc">
              Central learning resource center portal to explore textbook catalogs, borrow histories, reservations, and e-journals.
            </p>

            <div className="gateway__features">
              <span className="gateway__feature-tag">Catalog Search</span>
              <span className="gateway__feature-tag">Book Loans</span>
              <span className="gateway__feature-tag">Due Dates</span>
              <span className="gateway__feature-tag">Renewals</span>
              <span className="gateway__feature-tag">E-Resources</span>
            </div>
          </div>

          <button
            type="button"
            className="gateway__card-btn gateway__card-btn--library"
            onClick={() => onSelectPortal('library')}
          >
            Enter Library Dashboard &rarr;
          </button>
        </div>

        {/* Card 4: Hostel Management Dashboard Access */}
        <div className="gateway__card" data-qa="hostel-portal-card">
          <div className="gateway__card-top">
            <span className="gateway__card-badge gateway__card-badge--hostel">Campus Residence</span>
            <div className="gateway__card-icon gateway__card-icon--hostel">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18"/>
                <path d="M5 21V7l8-4v18"/>
                <path d="M19 21V11l-6-3"/>
                <path d="M9 9h1"/>
                <path d="M9 13h1"/>
                <path d="M9 17h1"/>
              </svg>
            </div>
          </div>

          <div className="gateway__card-content">
            <h2 className="gateway__card-title">Hostel Dashboard</h2>
            <p className="gateway__card-desc">
              Campus residential portal to manage room allocations, mess menus, leave & out-passes, maintenance complaints, and warden notices.
            </p>

            <div className="gateway__features">
              <span className="gateway__feature-tag">Room Allocation</span>
              <span className="gateway__feature-tag">Mess Timetable</span>
              <span className="gateway__feature-tag">Out-Pass Requests</span>
              <span className="gateway__feature-tag">Fee Status</span>
              <span className="gateway__feature-tag">Complaints & Repairs</span>
              <span className="gateway__feature-tag">Warden Notices</span>
            </div>
          </div>

          <button
            type="button"
            className="gateway__card-btn gateway__card-btn--hostel"
            onClick={() => onSelectPortal('hostel')}
          >
            Enter Hostel Dashboard &rarr;
          </button>
        </div>
      </main>

      <footer className="gateway__footer">
        <p className="gateway__footer-text">
          MS Engineering College, Navarathna Agrahara, Sadahalli Post, Bangalore - 562110
        </p>
        <span className="gateway__footer-help">
          For technical or credential assistance, contact IT Helpdesk: it.support@msec.ac.in
        </span>
      </footer>
    </div>
  );
}
