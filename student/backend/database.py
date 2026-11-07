import sqlite3
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
from werkzeug.security import generate_password_hash
from seed_fees import seed_fees_data

DB_PATH = os.environ.get('STUDENT_DB_PATH') or os.path.join(os.path.dirname(__file__), 'student_portal.db')
UPLOAD_DIR = os.environ.get('STUDENT_UPLOAD_DIR') or os.path.join(os.path.dirname(__file__), 'uploads')
ASSIGNMENTS_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'assignments')
NOTES_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'notes')
PROFILES_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'profiles')
RESUMES_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'resumes')
PROJECTS_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'projects')
CERTIFICATES_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'certificates')
DOUBTS_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'doubts')
MENTOR_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'mentor')

os.makedirs(ASSIGNMENTS_UPLOAD_DIR, exist_ok=True)
os.makedirs(NOTES_UPLOAD_DIR, exist_ok=True)
os.makedirs(PROFILES_UPLOAD_DIR, exist_ok=True)
os.makedirs(RESUMES_UPLOAD_DIR, exist_ok=True)
os.makedirs(PROJECTS_UPLOAD_DIR, exist_ok=True)
os.makedirs(CERTIFICATES_UPLOAD_DIR, exist_ok=True)
os.makedirs(DOUBTS_UPLOAD_DIR, exist_ok=True)
os.makedirs(MENTOR_UPLOAD_DIR, exist_ok=True)

DATABASE_URL = os.environ.get('DATABASE_URL')

class HybridRow(dict):
    def __init__(self, d, keys):
        super().__init__(d)
        self._keys = keys

    def __getitem__(self, item):
        if isinstance(item, int):
            return self[self._keys[item]]
        return super().__getitem__(item)

class PgCursorWrapper:
    def __init__(self, cur):
        self.cur = cur

    def _wrap(self, row):
        if row is None:
            return None
        keys = [desc[0] for desc in self.cur.description]
        return HybridRow(row, keys)

    def execute(self, query, params=None):
        if '?' in query:
            query = query.replace('?', '%s')
        if params is not None:
            return self.cur.execute(query, params)
        return self.cur.execute(query)

    def executemany(self, query, seq_of_params):
        if '?' in query:
            query = query.replace('?', '%s')
        return self.cur.executemany(query, seq_of_params)

    def fetchone(self):
        row = self.cur.fetchone()
        return self._wrap(row)

    def fetchall(self):
        rows = self.cur.fetchall()
        if not rows:
            return []
        keys = [desc[0] for desc in self.cur.description]
        return [HybridRow(r, keys) for r in rows]

    @property
    def lastrowid(self):
        return getattr(self.cur, 'lastrowid', None)

    @property
    def rowcount(self):
        return self.cur.rowcount

    def close(self):
        self.cur.close()

class PgConnectionWrapper:
    def __init__(self, raw_conn):
        self._conn = raw_conn

    def cursor(self):
        from psycopg2.extras import RealDictCursor
        return PgCursorWrapper(self._conn.cursor(cursor_factory=RealDictCursor))

    def execute(self, query, params=None):
        cur = self.cursor()
        cur.execute(query, params)
        return cur

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

def get_db():
    if DATABASE_URL:
        import psycopg2
        raw_conn = psycopg2.connect(DATABASE_URL)
        conn = PgConnectionWrapper(raw_conn)
        _track(conn)
        return conn
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    _track(conn)
    return conn


def _track(conn):
    """Remember connections opened during a request so teardown can always close them."""
    try:
        from flask import g, has_app_context
    except ImportError:
        return
    if has_app_context():
        g.setdefault('_db_conns', []).append(conn)


def close_request_connections(_exc=None):
    try:
        from flask import g
    except ImportError:
        return
    for conn in g.pop('_db_conns', []):
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass

def init_db():
    if DATABASE_URL:
        return
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'admin')),
        name TEXT NOT NULL,
        identifier TEXT NOT NULL DEFAULT '',
        department TEXT NOT NULL DEFAULT '',
        semester INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        google_sub TEXT UNIQUE,
        active INTEGER NOT NULL DEFAULT 1,
        token_version INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        usn TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        college_name TEXT DEFAULT 'Apex Institute of Engineering & Technology',
        semester INTEGER NOT NULL,
        section TEXT DEFAULT 'A',
        cgpa REAL DEFAULT 0.0,
        overall_attendance REAL DEFAULT 0.0,
        email TEXT NOT NULL,
        phone TEXT DEFAULT '',
        emergency_contact TEXT DEFAULT '+91 98765 43210',
        blood_group TEXT DEFAULT 'O+',
        dob TEXT DEFAULT '2003-05-14',
        address TEXT DEFAULT '42, Campus Residency, Technology Road, Bangalore - 560064',
        admission_year INTEGER DEFAULT 2021,
        degree TEXT DEFAULT 'Bachelor of Engineering (B.E.) in CSE',
        credits_earned INTEGER DEFAULT 128,
        academic_status TEXT DEFAULT 'Good Standing / Regular',
        backlogs INTEGER DEFAULT 0,
        valid_thru TEXT DEFAULT 'June 2027',
        photo_url TEXT DEFAULT '/uploads/profiles/default_student.png',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS semester_gpa_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL DEFAULT 1,
        semester INTEGER NOT NULL,
        total_credits REAL NOT NULL,
        total_credit_points REAL NOT NULL,
        sgpa REAL NOT NULL,
        subjects_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS timetable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        room TEXT NOT NULL,
        faculty_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        deadline_date TEXT NOT NULL,
        max_marks INTEGER DEFAULT 25,
        created_by TEXT DEFAULT 'Faculty',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        student_name TEXT NOT NULL,
        file_name TEXT,
        file_path TEXT,
        submitted_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Submitted',
        scored_marks INTEGER DEFAULT NULL,
        feedback TEXT DEFAULT '',
        evaluated_by TEXT DEFAULT NULL,
        FOREIGN KEY(assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        file_format TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        upload_date TEXT NOT NULL,
        downloads_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS examinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        exam_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        exam_hall TEXT NOT NULL,
        seat_number TEXT NOT NULL,
        semester INTEGER DEFAULT 6
    );

    CREATE TABLE IF NOT EXISTS hall_ticket_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester INTEGER NOT NULL UNIQUE,
        is_published INTEGER DEFAULT 1,
        published_date TEXT NOT NULL,
        exam_cycle TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT NOT NULL,
        usn TEXT NOT NULL,
        course_code TEXT NOT NULL,
        application_type TEXT NOT NULL,
        fee_status TEXT DEFAULT 'Paid',
        status TEXT DEFAULT 'Under Review',
        remarks TEXT DEFAULT '',
        applied_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS academic_marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        semester INTEGER NOT NULL,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        credits INTEGER NOT NULL,
        internal_marks INTEGER NOT NULL,
        lab_marks INTEGER NOT NULL,
        external_marks INTEGER NOT NULL,
        total_marks INTEGER NOT NULL,
        grade TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pass',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        attended_hours INTEGER NOT NULL,
        total_hours INTEGER NOT NULL,
        od_hours INTEGER DEFAULT 0,
        faculty_name TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'od')),
        marked_by TEXT DEFAULT 'Faculty',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        content TEXT NOT NULL,
        published_date TEXT NOT NULL,
        priority TEXT DEFAULT 'Normal'
    );

    CREATE TABLE IF NOT EXISTS placement_drives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        job_title TEXT NOT NULL,
        job_type TEXT NOT NULL DEFAULT 'Full-time', -- 'Full-time', 'Internship'
        ctc_or_stipend TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        min_cgpa REAL NOT NULL DEFAULT 7.0,
        eligible_branches TEXT NOT NULL DEFAULT 'CSE, ISE, ECE',
        required_skills TEXT NOT NULL,
        deadline_date TEXT NOT NULL,
        drive_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Open' -- 'Open', 'Closed'
    );

    CREATE TABLE IF NOT EXISTS placement_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        drive_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL DEFAULT 1,
        student_name TEXT NOT NULL,
        usn TEXT NOT NULL,
        cgpa REAL NOT NULL,
        resume_name TEXT NOT NULL,
        resume_path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Applied', -- 'Applied', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'
        applied_date TEXT NOT NULL,
        remarks TEXT DEFAULT '',
        FOREIGN KEY(drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL DEFAULT 1,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resume_builder_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER UNIQUE NOT NULL DEFAULT 1,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        headline TEXT DEFAULT '',
        summary TEXT DEFAULT '',
        education_json TEXT DEFAULT '[]',
        skills_json TEXT DEFAULT '[]',
        projects_json TEXT DEFAULT '[]',
        certifications_json TEXT DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS interview_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL, -- 'DSA & Algorithms', 'System Design', 'Core CS', 'HR & Behavioral'
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        key_topics TEXT NOT NULL,
        difficulty TEXT DEFAULT 'Intermediate'
    );

    CREATE TABLE IF NOT EXISTS mock_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL, -- 'Technical', 'System Design', 'HR & Behavioral'
        difficulty TEXT NOT NULL DEFAULT 'Medium', -- 'Easy', 'Medium', 'Hard'
        company_tags TEXT NOT NULL,
        question TEXT NOT NULL,
        sample_answer TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL DEFAULT 1,
        student_name TEXT NOT NULL,
        usn TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Capstone Project', -- 'Capstone Project', 'Mini Project', 'Research', 'Open Source'
        description TEXT NOT NULL,
        technologies TEXT NOT NULL,
        github_url TEXT,
        demo_url TEXT,
        document_file TEXT,
        image_file TEXT,
        team_status TEXT NOT NULL DEFAULT 'Looking for Teammates', -- 'Looking for Teammates', 'Team Full', 'Individual'
        open_roles TEXT DEFAULT '',
        guide_name TEXT DEFAULT '',
        guide_status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Not Assigned'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_teammate_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        requester_id INTEGER NOT NULL DEFAULT 1,
        requester_name TEXT NOT NULL,
        requester_usn TEXT NOT NULL,
        role_applied TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Accepted', 'Declined'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        faculty_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        max_score INTEGER NOT NULL DEFAULT 50,
        comments TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL, -- 'Hackathon', 'Workshop', 'Seminar', 'Technical Club', 'Cultural & Sports'
        club_name TEXT NOT NULL,
        event_date TEXT NOT NULL,
        event_time TEXT NOT NULL,
        venue TEXT NOT NULL,
        description TEXT NOT NULL,
        registration_deadline TEXT NOT NULL,
        seats_total INTEGER NOT NULL DEFAULT 100,
        seats_booked INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Upcoming', -- 'Upcoming', 'Ongoing', 'Completed'
        created_by TEXT DEFAULT 'Admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL DEFAULT 1,
        student_name TEXT NOT NULL,
        usn TEXT NOT NULL,
        registered_at TEXT NOT NULL,
        attendance_status TEXT NOT NULL DEFAULT 'Registered', -- 'Registered', 'Attended', 'Absent'
        certificate_issued INTEGER NOT NULL DEFAULT 0,
        certificate_file TEXT DEFAULT '',
        certificate_title TEXT DEFAULT '',
        FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS library_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        isbn TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        category TEXT NOT NULL,
        publisher TEXT DEFAULT '',
        edition TEXT DEFAULT '1st Edition',
        shelf_location TEXT NOT NULL,
        total_copies INTEGER NOT NULL DEFAULT 5,
        available_copies INTEGER NOT NULL DEFAULT 5,
        issued_copies INTEGER NOT NULL DEFAULT 0,
        added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_borrow_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL DEFAULT 1,
        student_name TEXT NOT NULL,
        usn TEXT NOT NULL,
        issue_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        return_date TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'Issued', -- 'Issued', 'Returned', 'Overdue'
        fine_amount REAL DEFAULT 0.0,
        librarian_remarks TEXT DEFAULT '',
        FOREIGN KEY(book_id) REFERENCES library_books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bus_routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route_number TEXT NOT NULL,
        bus_number TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        driver_phone TEXT NOT NULL,
        start_point TEXT NOT NULL,
        end_point TEXT NOT NULL,
        stops_and_timings_json TEXT NOT NULL,
        current_demo_location TEXT NOT NULL,
        demo_speed_kmh INTEGER DEFAULT 35,
        status TEXT DEFAULT 'On Route'
    );

    CREATE TABLE IF NOT EXISTS canteen_menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL,
        category TEXT NOT NULL, -- 'Breakfast', 'Lunch & Meals', 'Snacks & Quick Bites', 'Beverages'
        price REAL NOT NULL,
        dietary TEXT DEFAULT 'Vegetarian', -- 'Vegetarian', 'Non-Vegetarian', 'Vegan'
        availability TEXT DEFAULT 'Available', -- 'Available', 'Sold Out'
        timings TEXT DEFAULT 'All Day'
    );

    CREATE TABLE IF NOT EXISTS lost_and_found (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_type TEXT NOT NULL, -- 'Lost', 'Found'
        item_title TEXT NOT NULL,
        category TEXT NOT NULL, -- 'Electronics', 'Documents & IDs', 'Books & Stationery', 'Personal Items'
        location_reported TEXT NOT NULL,
        date_reported TEXT NOT NULL,
        description TEXT NOT NULL,
        reporter_name TEXT NOT NULL,
        reporter_usn TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Open', -- 'Open', 'Claimed', 'Resolved'
        claim_instructions TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lost_and_found_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        sender_name TEXT NOT NULL,
        sender_usn TEXT NOT NULL,
        sender_contact TEXT NOT NULL,
        message TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(item_id) REFERENCES lost_and_found(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campus_facilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_name TEXT NOT NULL,
        category TEXT NOT NULL, -- 'Laboratories', 'Sports & Fitness', 'Medical & Health', 'Auditoriums & Halls', 'Amenities & Utilities'
        building_location TEXT NOT NULL,
        operating_hours TEXT NOT NULL,
        in_charge_name TEXT NOT NULL,
        contact_tel TEXT NOT NULL,
        description TEXT NOT NULL,
        key_features TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL, -- 'College Announcement', 'Examination', 'Placement', 'Assignment Reminder', 'Attendance Alert'
        department TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'Normal', -- 'High', 'Normal', 'Urgent'
        target_role TEXT DEFAULT 'all', -- 'all', 'student', 'faculty'
        published_date TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS faculty_appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL DEFAULT 1,
        student_name TEXT NOT NULL,
        usn TEXT NOT NULL,
        faculty_name TEXT NOT NULL,
        department TEXT NOT NULL,
        purpose TEXT NOT NULL,
        requested_date TEXT NOT NULL,
        requested_slot TEXT NOT NULL,
        status TEXT DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Rescheduled', 'Completed'
        faculty_remarks TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS faculty_doubts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL DEFAULT 1,
        student_name TEXT NOT NULL,
        usn TEXT NOT NULL,
        subject_code TEXT NOT NULL,
        subject_name TEXT NOT NULL,
        faculty_name TEXT NOT NULL,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        attachment_file TEXT DEFAULT '',
        status TEXT DEFAULT 'Submitted', -- 'Submitted', 'Under Review', 'Answered', 'Resolved'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS doubt_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doubt_id INTEGER NOT NULL,
        responder_name TEXT NOT NULL,
        responder_role TEXT NOT NULL, -- 'faculty', 'student'
        response_text TEXT NOT NULL,
        attachment_file TEXT DEFAULT '',
        responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(doubt_id) REFERENCES faculty_doubts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS faculty_mentors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        faculty_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        designation TEXT NOT NULL,
        qualification TEXT NOT NULL,
        specialization TEXT NOT NULL,
        subjects_handled TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        office_room TEXT NOT NULL,
        consultation_hours TEXT NOT NULL,
        photo_url TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL UNIQUE,
        usn TEXT NOT NULL UNIQUE,
        student_name TEXT NOT NULL,
        department TEXT NOT NULL,
        semester INTEGER NOT NULL,
        section TEXT DEFAULT 'B',
        mentor_id INTEGER NOT NULL,
        group_name TEXT DEFAULT 'CSE Batch 2021-2025 Mentor Group A',
        assigned_date TEXT NOT NULL,
        academic_year TEXT DEFAULT '2025-2026',
        status TEXT DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(mentor_id) REFERENCES faculty_mentors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mentor_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        student_name TEXT NOT NULL,
        mentor_name TEXT NOT NULL,
        sender_role TEXT NOT NULL CHECK(sender_role IN ('student', 'faculty')),
        sender_name TEXT NOT NULL,
        subject TEXT DEFAULT 'Mentoring Inquiry',
        message TEXT NOT NULL,
        attachment_file TEXT DEFAULT '',
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(mentor_id) REFERENCES faculty_mentors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_discussions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mentor_id INTEGER NOT NULL,
        group_name TEXT NOT NULL,
        creator_id INTEGER NOT NULL,
        creator_name TEXT NOT NULL,
        creator_role TEXT NOT NULL CHECK(creator_role IN ('student', 'faculty')),
        category TEXT DEFAULT 'Academic', -- 'Academic', 'Doubt', 'Study Material', 'Career', 'Announcement'
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        attachment_file TEXT DEFAULT '',
        is_pinned INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Active', -- 'Active', 'Locked', 'Archived'
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(mentor_id) REFERENCES faculty_mentors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_discussion_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discussion_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        author_name TEXT NOT NULL,
        author_role TEXT NOT NULL CHECK(author_role IN ('student', 'faculty')),
        reply_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(discussion_id) REFERENCES mentor_discussions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mentor_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        student_name TEXT NOT NULL,
        usn TEXT NOT NULL,
        requested_date TEXT NOT NULL,
        requested_slot TEXT NOT NULL,
        meeting_type TEXT DEFAULT 'Academic Guidance', -- 'Academic Guidance', 'Career Counseling', 'Project Guidance', 'Personal Grievance', 'Attendance Review'
        agenda TEXT NOT NULL,
        status TEXT DEFAULT 'Requested', -- 'Requested', 'Approved', 'Rejected', 'Completed'
        meeting_platform TEXT DEFAULT 'Google Meet',
        meeting_link TEXT DEFAULT '',
        mentor_notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(mentor_id) REFERENCES faculty_mentors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_book_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        usn TEXT NOT NULL,
        student_name TEXT NOT NULL,
        mentor_id INTEGER NOT NULL,
        session_date TEXT NOT NULL,
        session_type TEXT NOT NULL,
        semester INTEGER NOT NULL,
        topics_discussed TEXT NOT NULL,
        student_concerns TEXT NOT NULL,
        mentor_suggestions TEXT NOT NULL,
        action_items TEXT NOT NULL,
        next_meeting_date TEXT DEFAULT '',
        recorded_by TEXT DEFAULT 'Faculty Mentor',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_book_remarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        usn TEXT NOT NULL,
        semester INTEGER NOT NULL,
        mentor_id INTEGER NOT NULL,
        academic_observations TEXT NOT NULL,
        strengths TEXT NOT NULL,
        weaknesses TEXT NOT NULL,
        areas_requiring_improvement TEXT NOT NULL,
        mentor_recommendations TEXT NOT NULL,
        follow_up_notes TEXT DEFAULT '',
        updated_by TEXT DEFAULT 'Faculty Mentor',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, semester)
    );

    CREATE TABLE IF NOT EXISTS mentor_book_development (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL UNIQUE,
        usn TEXT NOT NULL,
        technical_skills TEXT DEFAULT '',
        projects TEXT DEFAULT '',
        certifications TEXT DEFAULT '',
        internship_details TEXT DEFAULT '',
        achievements TEXT DEFAULT '',
        extracurricular_activities TEXT DEFAULT '',
        updated_by TEXT DEFAULT 'Student / Mentor',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_student_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        usn TEXT NOT NULL,
        student_name TEXT NOT NULL,
        mentor_id INTEGER NOT NULL,
        meeting_id INTEGER DEFAULT NULL,
        session_title TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        usefulness TEXT NOT NULL,
        feedback_text TEXT NOT NULL,
        suggestions TEXT DEFAULT '',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mentor_id INTEGER NOT NULL,
        day_name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location_mode TEXT DEFAULT 'Online (Google Meet) / Office CS-304',
        max_slots INTEGER DEFAULT 4,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY(mentor_id) REFERENCES faculty_mentors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        usn TEXT NOT NULL,
        action_type TEXT NOT NULL,
        performed_by TEXT NOT NULL,
        role TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fee_structures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department TEXT NOT NULL,
        semester INTEGER NOT NULL,
        academic_year TEXT NOT NULL,
        fee_category TEXT NOT NULL,
        total_amount REAL NOT NULL,
        due_date TEXT NOT NULL,
        description TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        partial_payment_allowed INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(department, semester, academic_year, fee_category)
    );

    CREATE TABLE IF NOT EXISTS student_fee_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        usn TEXT NOT NULL,
        student_name TEXT NOT NULL,
        department TEXT NOT NULL,
        semester INTEGER NOT NULL,
        academic_year TEXT NOT NULL,
        fee_structure_id INTEGER NOT NULL,
        fee_category TEXT NOT NULL,
        total_amount REAL NOT NULL,
        amount_paid REAL DEFAULT 0.0,
        outstanding_amount REAL NOT NULL,
        payment_status TEXT DEFAULT 'Pending',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(fee_structure_id) REFERENCES fee_structures(id)
    );

    CREATE TABLE IF NOT EXISTS fee_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        student_id INTEGER NOT NULL,
        usn TEXT NOT NULL,
        student_name TEXT NOT NULL,
        payment_amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        payment_status TEXT DEFAULT 'Pending',
        gateway_reference TEXT DEFAULT '',
        payment_date TEXT DEFAULT '',
        receipt_number TEXT UNIQUE,
        payment_breakdown TEXT DEFAULT '',
        fee_categories TEXT DEFAULT '',
        academic_year TEXT NOT NULL,
        semester INTEGER NOT NULL,
        remarks TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scholarships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        eligibility_criteria TEXT NOT NULL,
        max_amount REAL NOT NULL,
        scholarship_type TEXT DEFAULT 'Merit',
        applicable_departments TEXT DEFAULT 'All',
        min_cgpa REAL DEFAULT 0.0,
        max_family_income REAL DEFAULT 0.0,
        academic_year TEXT NOT NULL,
        application_deadline TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scholarship_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scholarship_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        usn TEXT NOT NULL,
        student_name TEXT NOT NULL,
        department TEXT NOT NULL,
        semester INTEGER NOT NULL,
        cgpa REAL NOT NULL,
        application_text TEXT NOT NULL,
        supporting_document TEXT DEFAULT '',
        status TEXT DEFAULT 'Submitted',
        approved_amount REAL DEFAULT 0.0,
        admin_remarks TEXT DEFAULT '',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TEXT DEFAULT '',
        FOREIGN KEY(scholarship_id) REFERENCES scholarships(id)
    );
    """)

    conn.commit()
    migrate_auth(conn)

    # Column migration for student_profiles if table already existed
    cursor.execute("PRAGMA table_info(student_profiles)")
    existing_cols = {col[1] for col in cursor.fetchall()}
    profile_columns = [
        ("college_name", "TEXT DEFAULT 'Apex Institute of Engineering & Technology'"),
        ("emergency_contact", "TEXT DEFAULT '+91 98765 43210'"),
        ("blood_group", "TEXT DEFAULT 'O+'"),
        ("dob", "TEXT DEFAULT '2003-05-14'"),
        ("address", "TEXT DEFAULT '42, Campus Residency, Technology Road, Bangalore - 560064'"),
        ("admission_year", "INTEGER DEFAULT 2021"),
        ("degree", "TEXT DEFAULT 'Bachelor of Engineering (B.E.) in CSE'"),
        ("credits_earned", "INTEGER DEFAULT 128"),
        ("academic_status", "TEXT DEFAULT 'Good Standing / Regular'"),
        ("backlogs", "INTEGER DEFAULT 0"),
        ("valid_thru", "TEXT DEFAULT 'June 2027'"),
        ("photo_url", "TEXT DEFAULT '/uploads/profiles/default_student.png'"),
        ("academic_year", "TEXT DEFAULT '3rd Year'")
    ]
    for col_name, col_def in profile_columns:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE student_profiles ADD COLUMN {col_name} {col_def}")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS teacher_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        dob TEXT DEFAULT '',
        designation TEXT DEFAULT 'Assistant Professor',
        is_class_teacher BOOLEAN DEFAULT 0,
        class_teacher_dept TEXT DEFAULT '',
        class_teacher_sem INTEGER DEFAULT 6,
        class_teacher_section TEXT DEFAULT 'A',
        usn_start TEXT DEFAULT '',
        usn_end TEXT DEFAULT '',
        cabin_room TEXT DEFAULT 'Room 304, CS Academic Block',
        contact_phone TEXT DEFAULT '',
        office_hours TEXT DEFAULT '10:00 AM - 12:00 PM (Mon-Fri)',
        bio TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("PRAGMA table_info(teacher_classes)")
    tc_cols = {col[1] for col in cursor.fetchall()}
    for col_name, col_def in [
        ("section", "TEXT DEFAULT 'A'"),
        ("subject_code", "TEXT DEFAULT '21CS61'"),
        ("subject_name", "TEXT DEFAULT 'Software Engineering'")
    ]:
        if col_name not in tc_cols:
            cursor.execute(f"ALTER TABLE teacher_classes ADD COLUMN {col_name} {col_def}")

    # Create dummy downloadable sample files so download testing works immediately
    sample_note_path = os.path.join(NOTES_UPLOAD_DIR, 'distributed_systems_notes.pdf')
    if not os.path.exists(sample_note_path):
        with open(sample_note_path, 'w', encoding='utf-8') as f:
            f.write('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nDistributed Systems Academic Notes.\n')

    sample_manual_path = os.path.join(NOTES_UPLOAD_DIR, 'compiler_lab_manual.pdf')
    if not os.path.exists(sample_manual_path):
        with open(sample_manual_path, 'w', encoding='utf-8') as f:
            f.write('%PDF-1.4\nCompiler Design Lab Manual 2026.\n')

    sample_resume_path = os.path.join(RESUMES_UPLOAD_DIR, 'alex_kumar_resume.pdf')
    if not os.path.exists(sample_resume_path):
        with open(sample_resume_path, 'w', encoding='utf-8') as f:
            f.write('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nAlex Kumar - Master Resume (Software Engineer).\n')

    sample_cert_path = os.path.join(CERTIFICATES_UPLOAD_DIR, 'hackathon_first_runner_up.pdf')
    if not os.path.exists(sample_cert_path):
        with open(sample_cert_path, 'w', encoding='utf-8') as f:
            f.write('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nCertificate of Achievement: First Runner-Up - Apex National Hackathon 2026.\n')

    sample_project_path = os.path.join(PROJECTS_UPLOAD_DIR, 'drone_telemetry_architecture.pdf')
    if not os.path.exists(sample_project_path):
        with open(sample_project_path, 'w', encoding='utf-8') as f:
            f.write('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nAutonomous Drone Telemetry Mesh Technical Architecture Document.\n')

    # Seed baseline records if empty
    cursor.execute("SELECT COUNT(*) FROM timetable")
    if cursor.fetchone()[0] == 0:
        seed_data(conn)

    # Seed GPA history if empty
    cursor.execute("SELECT COUNT(*) FROM semester_gpa_history")
    if cursor.fetchone()[0] == 0:
        seed_gpa_history(conn)

    # Seed Placement, Projects, Events data if empty
    cursor.execute("SELECT COUNT(*) FROM placement_drives")
    if cursor.fetchone()[0] == 0:
        seed_placements_and_projects(conn)

    # Seed Library and Campus Services if empty
    cursor.execute("SELECT COUNT(*) FROM library_books")
    if cursor.fetchone()[0] == 0:
        seed_library_and_campus_services(conn)

    # Seed Notifications, Appointments, and Doubts if empty
    cursor.execute("SELECT COUNT(*) FROM notifications")
    if cursor.fetchone()[0] == 0:
        seed_notifications_and_doubts(conn)

    # Seed Faculty Mentor module if empty
    cursor.execute("SELECT COUNT(*) FROM faculty_mentors")
    if cursor.fetchone()[0] == 0:
        seed_faculty_mentor_data(conn)

    # Seed Fees Management module if empty
    cursor.execute("SELECT COUNT(*) FROM fee_structures")
    if cursor.fetchone()[0] == 0:
        seed_fees_data(conn)

    conn.commit()
    conn.close()

USERS_SCHEMA = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'admin')),
    name TEXT NOT NULL,
    identifier TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    semester INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    google_sub TEXT UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    token_version INTEGER NOT NULL DEFAULT 0
)
"""

AUTH_TABLES = """
CREATE TABLE IF NOT EXISTS teacher_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    semester INTEGER NOT NULL,
    UNIQUE(user_id, department, semester)
);
CREATE TABLE IF NOT EXISTS email_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK(purpose IN ('login', 'reset')),
    code_hash TEXT NOT NULL,
    expires_at REAL NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    used_at REAL,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email, purpose);
CREATE TABLE IF NOT EXISTS google_flows (
    id TEXT PRIMARY KEY,
    browser_hash TEXT NOT NULL,
    code_verifier TEXT NOT NULL,
    nonce TEXT NOT NULL,
    platform TEXT NOT NULL CHECK(platform IN ('web', 'android', 'teacher')),
    expires_at REAL NOT NULL,
    exchange_hash TEXT UNIQUE,
    exchange_user_id INTEGER,
    exchange_expires_at REAL,
    remember INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS login_attempts (
    key TEXT PRIMARY KEY,
    window_start REAL NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
);
"""


def migrate_auth(conn):
    """Bring the users table to the roster schema and create auth tables. Idempotent."""
    cols = {r[1]: r for r in conn.execute("PRAGMA table_info(users)")}
    needs_rebuild = cols and ('google_sub' not in cols or cols['password_hash'][3] == 1)
    if needs_rebuild:
        conn.commit()
        conn.execute("PRAGMA foreign_keys = OFF")
        try:
            conn.execute("BEGIN")
            conn.execute(USERS_SCHEMA.replace('CREATE TABLE users', 'CREATE TABLE users_new'))
            conn.execute("""
                INSERT INTO users_new (id, email, password_hash, role, name, identifier, department, semester, created_at)
                SELECT id, LOWER(TRIM(email)), password_hash, role, name, identifier, department, semester, created_at FROM users
            """)
            conn.execute("DROP TABLE users")
            conn.execute("ALTER TABLE users_new RENAME TO users")
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.execute("PRAGMA foreign_keys = ON")
    elif not cols:
        conn.execute(USERS_SCHEMA)
    flows = conn.execute("SELECT sql FROM sqlite_master WHERE name = 'google_flows'").fetchone()
    if flows and "'teacher'" not in flows[0]:
        conn.execute("DROP TABLE google_flows")  # short-lived rows only; safe to recreate
    conn.executescript(AUTH_TABLES)
    conn.commit()


def seed_data(conn):
    cursor = conn.cursor()

    # Default Users
    student_pwd = generate_password_hash("student123")
    faculty_pwd = generate_password_hash("faculty123")
    admin_pwd = generate_password_hash("admin123")

    cursor.execute("""
    INSERT INTO users (email, password_hash, role, name, identifier, department, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("student@college.edu", student_pwd, "student", "Alex Kumar", "1MS21CS084", "Computer Science & Engineering", 6))
    student_id = cursor.lastrowid

    cursor.execute("""
    INSERT INTO users (email, password_hash, role, name, identifier, department, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("faculty@college.edu", faculty_pwd, "faculty", "Dr. K. V. Sharma", "EMP-CS104", "Computer Science & Engineering", 0))

    cursor.execute("""
    INSERT INTO users (email, password_hash, role, name, identifier, department, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("admin@college.edu", admin_pwd, "admin", "Dean Academics", "ADM-001", "Administration", 0))

    cursor.execute("""
    INSERT INTO student_profiles (user_id, usn, name, department, semester, section, cgpa, overall_attendance, email, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (student_id, "1MS21CS084", "Alex Kumar", "Computer Science & Engineering", 6, "B", 9.12, 88.4, "student@college.edu", "+91 98765 43210"))

    # 1. Timetable (Daily & Weekly)
    timetable_data = [
        # Monday (1)
        (1, "09:00 AM", "10:00 AM", "CS601", "Distributed Systems", "LH-302", "Dr. Ramesh Rao"),
        (1, "10:00 AM", "11:00 AM", "CS602", "Machine Learning", "LH-302", "Prof. Ananya Sen"),
        (1, "11:15 AM", "01:15 PM", "CS606L", "ML & Data Engineering Lab", "Lab 4", "Prof. Ananya Sen"),
        (1, "02:00 PM", "03:00 PM", "CS603", "Compiler Design", "LH-302", "Dr. K. V. Sharma"),
        # Tuesday (2)
        (2, "09:00 AM", "10:00 AM", "CS603", "Compiler Design", "LH-302", "Dr. K. V. Sharma"),
        (2, "10:00 AM", "11:00 AM", "CS605", "Information & Cyber Security", "LH-302", "Dr. Priya Nambiar"),
        (2, "11:15 AM", "12:15 PM", "CS601", "Distributed Systems", "LH-302", "Dr. Ramesh Rao"),
        (2, "02:00 PM", "04:00 PM", "CS606L", "Capstone Phase-I Studio", "Room 408", "Dr. Ramesh Rao"),
        # Wednesday (3)
        (3, "09:00 AM", "10:00 AM", "CS602", "Machine Learning", "LH-302", "Prof. Ananya Sen"),
        (3, "10:00 AM", "11:00 AM", "CS604", "Cloud Architecture & DevOps", "LH-302", "Prof. Vikram Hegde"),
        (3, "11:15 AM", "01:15 PM", "CS603L", "Compiler Design Lab", "Systems Lab", "Dr. K. V. Sharma"),
        # Thursday (4)
        (4, "09:00 AM", "10:00 AM", "CS605", "Information & Cyber Security", "LH-302", "Dr. Priya Nambiar"),
        (4, "10:00 AM", "11:00 AM", "CS601", "Distributed Systems", "LH-302", "Dr. Ramesh Rao"),
        (4, "11:15 AM", "12:15 PM", "CS603", "Compiler Design", "LH-302", "Dr. K. V. Sharma"),
        # Friday (5)
        (5, "09:00 AM", "10:00 AM", "CS604", "Cloud Architecture & DevOps", "LH-302", "Prof. Vikram Hegde"),
        (5, "10:00 AM", "11:00 AM", "CS602", "Machine Learning", "LH-302", "Prof. Ananya Sen"),
        (5, "02:00 PM", "04:00 PM", "CS606L", "Technical Seminar / Colloquium", "Seminar Hall B", "Visiting Lead")
    ]
    cursor.executemany("""
    INSERT INTO timetable (day_of_week, start_time, end_time, course_code, course_title, room, faculty_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, timetable_data)

    # 2. Assignments & Submissions
    assignments = [
        ("CS601", "Distributed Systems", "Raft Consensus Protocol Implementation", "Implement leader election and log replication logic.", "2026-11-06 23:59", 25, "Dr. Ramesh Rao"),
        ("CS602", "Machine Learning", "CNN Architecture Benchmarking on CIFAR-10", "Evaluate accuracy and loss curves for ResNet-18 vs MobileNet.", "2026-11-10 23:59", 30, "Prof. Ananya Sen"),
        ("CS603", "Compiler Design", "LR(1) Parser Table Generator", "Write lexer and grammar productions for expression evaluator.", "2026-11-14 23:59", 20, "Dr. K. V. Sharma"),
        ("CS604", "Cloud Architecture", "Terraform Multi-Tier AWS Infrastructure", "VPC peering and ECS task definitions.", "2026-10-28 23:59", 25, "Prof. Vikram Hegde")
    ]
    cursor.executemany("""
    INSERT INTO assignments (course_code, course_title, title, description, deadline_date, max_marks, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, assignments)

    # Sample evaluation for assignment 4
    cursor.execute("""
    INSERT INTO assignment_submissions (assignment_id, student_id, student_name, file_name, file_path, submitted_at, status, scored_marks, feedback, evaluated_by)
    VALUES (4, 1, 'Alex Kumar', 'terraform_aws_solution.zip', 'assignments/terraform_aws_solution.zip', '2026-10-27 18:30', 'Submitted', 24, 'Excellent modular Terraform architecture. State locking cleanly implemented.', 'Prof. Vikram Hegde')
    """)

    # 3. Study Materials
    materials = [
        ("CS601", "Distributed Systems", "Distributed Systems Complete Unit 1-3 Notes", "Lecture Notes", "PDF", "distributed_systems_notes.pdf", "4.2 MB", "Dr. Ramesh Rao", "2026-10-15", 142),
        ("CS602", "Machine Learning", "Supervised Learning & Deep Neural Nets Slides", "Lecture Notes", "PPTX", "ml_lecture_slides.pptx", "12.8 MB", "Prof. Ananya Sen", "2026-10-18", 230),
        ("CS603", "Compiler Design", "Compiler Design Laboratory Manual 2026", "Lab Manual", "PDF", "compiler_lab_manual.pdf", "2.1 MB", "Dr. K. V. Sharma", "2026-10-20", 95),
        ("CS601", "Distributed Systems", "End-Semester University Question Papers (2021-2025)", "Previous Question Paper", "PDF", "cs601_previous_papers.pdf", "8.5 MB", "Exam Cell", "2026-10-25", 380),
        ("CS604", "Cloud Architecture", "Docker, Kubernetes and Helm Handbook", "Reference Slide", "DOCX", "cloud_reference_handbook.docx", "3.6 MB", "Prof. Vikram Hegde", "2026-10-26", 112)
    ]
    cursor.executemany("""
    INSERT INTO study_materials (course_code, course_title, title, category, file_format, file_name, file_size, uploaded_by, upload_date, downloads_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, materials)

    # 4. Examinations & Hall Tickets
    exams = [
        ("CS601", "Distributed Systems", "2026-11-20", "09:30 AM", "12:30 PM", "Hall 401", "Row D - 14", 6),
        ("CS602", "Machine Learning", "2026-11-23", "09:30 AM", "12:30 PM", "Hall 401", "Row D - 14", 6),
        ("CS603", "Compiler Design", "2026-11-26", "09:30 AM", "12:30 PM", "Hall 305", "Row B - 08", 6),
        ("CS604", "Cloud Architecture", "2026-11-29", "09:30 AM", "12:30 PM", "Hall 305", "Row B - 08", 6),
        ("CS605", "Information Security", "2026-12-02", "09:30 AM", "12:30 PM", "Hall 401", "Row D - 14", 6)
    ]
    cursor.executemany("""
    INSERT INTO examinations (course_code, course_title, exam_date, start_time, end_time, exam_hall, seat_number, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, exams)

    cursor.execute("""
    INSERT INTO hall_ticket_status (semester, is_published, published_date, exam_cycle)
    VALUES (6, 1, '2026-11-01', 'November/December 2026 Regular SEE')
    """)

    # Sample Revaluation record
    cursor.execute("""
    INSERT INTO revaluations (student_name, usn, course_code, application_type, fee_status, status, remarks, applied_date)
    VALUES ('Alex Kumar', '1MS21CS084', 'CS502', 'Re-evaluation', 'Paid', 'Verified', 'Score revised from 82 to 87. Updated in master ledger.', '2026-08-14')
    """)

    # Academic Marks (Sem 5 & Sem 6)
    sem6_marks = [
        (student_id, 6, "CS601", "Distributed Systems", 4, 28, 19, 45, 92, "O", "Pass"),
        (student_id, 6, "CS602", "Machine Learning", 4, 27, 20, 43, 90, "O", "Pass"),
        (student_id, 6, "CS603", "Compiler Design", 4, 25, 18, 41, 84, "A+", "Pass"),
        (student_id, 6, "CS604", "Cloud Architecture", 3, 26, 19, 44, 89, "A+", "Pass"),
        (student_id, 6, "CS605", "Information Security", 3, 29, 19, 46, 94, "O", "Pass"),
        (student_id, 6, "CS606L", "Capstone Phase-I", 4, 28, 19, 48, 95, "O", "Pass")
    ]
    cursor.executemany("""
    INSERT INTO academic_marks (user_id, semester, course_code, course_title, credits, internal_marks, lab_marks, external_marks, total_marks, grade, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sem6_marks)

    sem5_marks = [
        (student_id, 5, "CS501", "Database Management Systems", 4, 27, 19, 45, 91, "O", "Pass"),
        (student_id, 5, "CS502", "Computer Networks", 4, 26, 18, 43, 87, "A+", "Pass"),
        (student_id, 5, "CS503", "Theory of Computation", 4, 25, 18, 41, 84, "A+", "Pass"),
        (student_id, 5, "CS504", "Artificial Intelligence", 4, 28, 19, 44, 91, "O", "Pass"),
        (student_id, 5, "CS505", "Web Development Lab", 2, 29, 20, 46, 95, "O", "Pass")
    ]
    cursor.executemany("""
    INSERT INTO academic_marks (user_id, semester, course_code, course_title, credits, internal_marks, lab_marks, external_marks, total_marks, grade, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sem5_marks)

    # Attendance
    attendance_data = [
        (student_id, "CS601", "Distributed Systems", 42, 48, 2, "Dr. Ramesh Rao"),
        (student_id, "CS602", "Machine Learning", 38, 44, 2, "Prof. Ananya Sen"),
        (student_id, "CS603", "Compiler Design", 44, 48, 2, "Dr. K. V. Sharma"),
        (student_id, "CS604", "Cloud Architecture", 35, 44, 2, "Prof. Vikram Hegde"),
        (student_id, "CS605", "Information Security", 41, 48, 2, "Dr. Priya Nambiar"),
        (student_id, "CS606L", "Capstone Phase-I", 28, 40, 4, "Dr. Ramesh Rao")
    ]
    cursor.executemany("""
    INSERT INTO attendance (user_id, course_code, course_title, attended_hours, total_hours, od_hours, faculty_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, attendance_data)

    announcements = [
        ("End-Semester Theory Exam Hall Tickets Released", "Office of Controller of Examinations", "Theory examination schedules for semesters 4, 6 and 8 are published. Download hall tickets from the examination tab.", "Today, 10:00 AM", "High"),
        ("Campus Placement Drive: Microsoft Solutions Open", "Career & Placement Cell", "Eligible students with CGPA >= 8.0 can register for the campus technical interview round before cutoff date.", "Yesterday, 04:30 PM", "High"),
        ("Library Book Return Notice (Autumn Cycle)", "Central University Library", "All textbooks borrowed prior to October 15 must be renewed or returned to avoid overdue charges.", "2026-10-31", "Normal")
    ]
    cursor.executemany("""
    INSERT INTO announcements (title, department, content, published_date, priority)
    VALUES (?, ?, ?, ?, ?)
    """, announcements)

    conn.commit()

def seed_gpa_history(conn):
    import json
    cursor = conn.cursor()
    history = [
        (
            1, 1, 20.0, 190.0, 9.50,
            json.dumps([
                {"subject_name": "Engineering Mathematics I", "credits": 4, "grade_point": 10.0, "grade": "O"},
                {"subject_name": "Engineering Physics", "credits": 4, "grade_point": 10.0, "grade": "O"},
                {"subject_name": "Python for Problem Solving", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Basic Electrical & Electronics", "credits": 3, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Engineering Graphics & CAD", "credits": 3, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Computing & Physics Lab", "credits": 2, "grade_point": 10.0, "grade": "O"}
            ])
        ),
        (
            1, 2, 20.0, 183.0, 9.15,
            json.dumps([
                {"subject_name": "Engineering Mathematics II", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Engineering Chemistry", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Data Structures & C Programming", "credits": 4, "grade_point": 10.0, "grade": "O"},
                {"subject_name": "Basic Mechanical Systems", "credits": 3, "grade_point": 8.0, "grade": "A"},
                {"subject_name": "Environmental Studies & Ecology", "credits": 3, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "C & Data Structures Lab", "credits": 2, "grade_point": 10.0, "grade": "O"}
            ])
        ),
        (
            1, 3, 22.0, 198.0, 9.00,
            json.dumps([
                {"subject_name": "Discrete Mathematical Structures", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Advanced Data Structures & Algorithms", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Digital Logic & Computer Organization", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Object-Oriented Programming with Java", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Electronic Devices & Microcontrollers", "credits": 3, "grade_point": 8.0, "grade": "A"},
                {"subject_name": "DSA & Logic Design Lab", "credits": 3, "grade_point": 10.0, "grade": "O"}
            ])
        ),
        (
            1, 4, 22.0, 205.0, 9.32,
            json.dumps([
                {"subject_name": "Design & Analysis of Algorithms", "credits": 4, "grade_point": 10.0, "grade": "O"},
                {"subject_name": "Operating Systems Principles", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Microprocessors & Embedded Systems", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Software Engineering & Agile Methods", "credits": 3, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Formal Languages & Automata Theory", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "OS & Algorithms Laboratory", "credits": 3, "grade_point": 10.0, "grade": "O"}
            ])
        ),
        (
            1, 5, 22.0, 209.0, 9.50,
            json.dumps([
                {"subject_name": "Database Management Systems", "credits": 4, "grade_point": 10.0, "grade": "O"},
                {"subject_name": "Computer Networks & Protocols", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Theory of Computation", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Artificial Intelligence & Expert Systems", "credits": 4, "grade_point": 10.0, "grade": "O"},
                {"subject_name": "Full Stack Web Technologies", "credits": 3, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "DBMS & Networks Lab", "credits": 3, "grade_point": 10.0, "grade": "O"}
            ])
        ),
        (
            1, 6, 22.0, 213.0, 9.68,
            json.dumps([
                {"subject_name": "Distributed Systems Architecture", "credits": 4, "grade_point": 10.0, "grade": "O"},
                {"subject_name": "Machine Learning & Pattern Recognition", "credits": 4, "grade_point": 10.0, "grade": "O"},
                {"subject_name": "Compiler Design & Code Generation", "credits": 4, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Cloud Architecture & DevOps", "credits": 3, "grade_point": 9.0, "grade": "A+"},
                {"subject_name": "Information & Cyber Security", "credits": 3, "grade_point": 10.0, "grade": "O"},
                {"subject_name": "Capstone Project Phase-I", "credits": 4, "grade_point": 10.0, "grade": "O"}
            ])
        )
    ]
    cursor.executemany("""
    INSERT INTO semester_gpa_history (student_id, semester, total_credits, total_credit_points, sgpa, subjects_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, history)
    conn.commit()

def seed_placements_and_projects(conn):
    import json
    cursor = conn.cursor()

    # 1. Placement Drives
    drives = [
        ("Microsoft", "Software Development Engineer (SDE-1)", "Full-time", "₹32.0 LPA", "Hyderabad / Bangalore",
         "Design, develop, and test scalable distributed cloud services on Azure. Strong problem-solving, data structures, and multithreading required.",
         8.0, "CSE, ISE, ECE", "Data Structures, Algorithms, C++, Java, Distributed Systems", "2026-11-25", "2026-12-05", "Open"),
        ("Amazon", "Cloud Support Associate & DevOps Engineer", "Full-time", "₹24.0 LPA", "Bangalore",
         "Support global AWS infrastructure, troubleshoot Linux kernel issues, configure containerized ECS clusters, and build automated CI/CD pipelines.",
         7.5, "CSE, ISE, ECE, EEE", "Linux, Python, Docker, Networking, AWS Cloud", "2026-11-28", "2026-12-08", "Open"),
        ("Cisco", "Network Software Engineer", "Full-time", "₹19.5 LPA", "Bangalore",
         "Develop next-generation enterprise routing protocols, SDN controllers, and telemetry packet parsers. Deep TCP/IP socket expertise required.",
         7.5, "CSE, ISE, ECE", "C, C++, TCP/IP, Linux Sockets, Network Protocols", "2026-12-05", "2026-12-15", "Open"),
        ("Goldman Sachs", "Summer Technology Analyst", "Internship", "₹1,00,000 / Month", "Bangalore",
         "Build high-throughput quantitative trading algorithms and low-latency financial settlement platforms. 2-month summer internship with PPO.",
         8.5, "CSE, ISE, ECE, Mech", "Algorithms, Python, Java, SQL, System Architecture", "2026-11-20", "2026-11-30", "Open"),
        ("Adobe Systems", "Research & Software Development Intern", "Internship", "₹90,000 / Month", "Noida / Remote",
         "Contribute to generative AI image algorithms, computer vision pipelines, and web assembly modules for Adobe Creative Cloud.",
         8.0, "CSE, ISE", "C++, Computer Vision, PyTorch, Linear Algebra", "2026-11-30", "2026-12-10", "Open"),
        ("TCS Digital", "Systems Engineer & Cloud Specialist", "Full-time", "₹7.5 LPA", "Pan India",
         "Enterprise modernization, full-stack microservices development, and managed cloud deployments for Fortune 500 enterprise clients.",
         6.5, "All Engineering Branches", "Java, Python, SQL, REST APIs, Git", "2026-12-15", "2026-12-28", "Open")
    ]
    cursor.executemany("""
    INSERT INTO placement_drives (company_name, job_title, job_type, ctc_or_stipend, location, description, min_cgpa, eligible_branches, required_skills, deadline_date, drive_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, drives)

    # 2. Placement Applications
    applications = [
        (1, 1, "Alex Kumar", "1MS21CS084", 9.36, "alex_kumar_resume.pdf", "resumes/alex_kumar_resume.pdf", "Shortlisted", "2026-11-01", "Shortlisted for Technical Coding Round scheduled for Dec 05."),
        (2, 1, "Alex Kumar", "1MS21CS084", 9.36, "alex_kumar_resume.pdf", "resumes/alex_kumar_resume.pdf", "Applied", "2026-11-02", "Application under initial recruiter review.")
    ]
    cursor.executemany("""
    INSERT INTO placement_applications (drive_id, student_id, student_name, usn, cgpa, resume_name, resume_path, status, applied_date, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, applications)

    # 3. Student Resumes
    resumes = [
        (1, "Master Resume - Software & Distributed Systems (Latex)", "alex_kumar_resume.pdf", "resumes/alex_kumar_resume.pdf", "2026-10-25 14:30")
    ]
    cursor.executemany("""
    INSERT INTO student_resumes (student_id, title, file_name, file_path, uploaded_at)
    VALUES (?, ?, ?, ?, ?)
    """, resumes)

    # 4. Resume Builder Data
    sample_education = [
        {"degree": "B.E. Computer Science & Engineering", "institution": "Apex Institute of Engineering & Technology", "year": "2021 - 2025", "score": "9.36 CGPA"},
        {"degree": "Senior Secondary (XII - CBSE)", "institution": "National Public School", "year": "2021", "score": "96.4%"}
    ]
    sample_skills = ["C++", "Java", "Python", "Go", "Distributed Systems", "Docker", "Kubernetes", "PostgreSQL", "React.js", "gRPC", "Linux"]
    sample_projects = [
        {"title": "Autonomous Drone Telemetry Mesh", "tech": "Go, gRPC, WebRTC", "description": "Built low-latency failover mesh connecting 12 UAV nodes with sub-20ms telemetry updates."},
        {"title": "Distributed Key-Value Store with Raft", "tech": "Rust, Tokio, RocksDB", "description": "Implemented consensus log replication with heartbeat elections passing Jepsen tests."}
    ]
    sample_certs = ["AWS Certified Cloud Practitioner (2025)", "Oracle Certified Professional Java Developer"]

    cursor.execute("""
    INSERT INTO resume_builder_data (student_id, full_name, email, phone, headline, summary, education_json, skills_json, projects_json, certifications_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (1, "Alex Kumar", "student@college.edu", "+91 98765 43210", "Systems & Full-Stack Engineer | Distributed Systems Enthusiast",
          "Final-year Computer Science undergraduate with 9.36 CGPA. Experienced in high-throughput concurrent backends in Go and Rust, distributed consensus algorithms, and cloud infrastructure.",
          json.dumps(sample_education), json.dumps(sample_skills), json.dumps(sample_projects), json.dumps(sample_certs)))

    # 5. Interview Preparation Resources
    resources = [
        ("DSA & Algorithms", "Top 75 LeetCode Patterns: Sliding Window, Trees, and DP", "Curated patterns covering blind-75 problem types, state transitions, and pointer tricks.", "Two Pointers, Fast & Slow Pointers, Sliding Window, Monotonic Stack, Trie, Dynamic Programming", "Intermediate"),
        ("System Design", "Scalable Architecture Handbook: Microservices & Data Caching", "Deep dives into horizontal scaling, CAP theorem, write-through vs write-back caching, and CDN edge delivery.", "Consistent Hashing, Database Sharding, Caching Strategies (Redis), Message Queues (Kafka), Rate Limiting", "Advanced"),
        ("Core CS (OS, DBMS, CN)", "Core Computer Science Fundamentals Fast-Review", "Quick refresher on OS process scheduling, virtual memory paging, DBMS ACID properties, and TCP 3-way handshake.", "Paging, Semaphores, Mutex, ACID Transactions, B+ Trees, Normalization, DNS, TCP/UDP, TLS Handshake", "Fundamental"),
        ("HR & Behavioral", "STAR Framework for Behavioral Rounds", "Structure leadership and collaboration answers using Situation, Task, Action, Result framework with measurable impacts.", "Conflict Resolution, Project Failure Analysis, Leadership Under Tight Deadlines, Why This Company", "Essential")
    ]
    cursor.executemany("""
    INSERT INTO interview_resources (category, title, description, key_topics, difficulty)
    VALUES (?, ?, ?, ?, ?)
    """, resources)

    # 6. Mock Interview Questions
    questions = [
        ("Technical", "Hard", "Google, Microsoft", "How does Raft consensus handle split-brain network partitions, and how do logs reconcile upon partition heal?",
         "In Raft, if a partition occurs, the sub-cluster containing a majority (quorum: > N/2 nodes) continues to elect a leader and commit logs. The minority sub-cluster cannot commit writes. When the partition heals, nodes with lower term numbers step down, and the true leader forces followers to overwrite uncommitted logs with its committed log index."),
        ("Technical", "Medium", "Amazon, Cisco", "Explain the trade-offs between Optimistic Concurrency Control (OCC) and Pessimistic Locking in high-read vs high-write database workloads.",
         "Pessimistic locking takes locks (shared/exclusive) before reading or modifying data, preventing conflicts but causing lock contention and reduced throughput. OCC allows transactions to proceed without locking and validates during commit. OCC is superior for high-read, low-contention workloads; Pessimistic locking is preferred when write collision frequency is high."),
        ("System Design", "Medium", "Meta, Uber", "Design a globally distributed URL Shortener service handling 100M daily writes and 1B daily reads.",
         "Use Base62 encoding on unique 64-bit integer IDs generated by a distributed Snowflake ticket service. Cache popular URLs in Redis with LRU eviction policy. Use PostgreSQL with master-replica replication and read replicas. Deploy behind Cloudflare CDN edge nodes to achieve sub-10ms read latencies."),
        ("HR & Behavioral", "Medium", "Microsoft, Amazon", "Tell me about a time you strongly disagreed with a team member or technical lead on an architectural decision. How did you handle it?",
         "Use STAR format: 'During our capstone project, our teammate wanted to use MongoDB for high write speeds, while I advocated for PostgreSQL with JSONB because we needed strict ACID financial transactions. I created a benchmark script testing both under our expected schema and demonstrated that PostgreSQL had superior query consistency with negligible latency overhead. We agreed on PostgreSQL based on data, and the project shipped with zero database corruptions.'")
    ]
    cursor.executemany("""
    INSERT INTO mock_questions (category, difficulty, company_tags, question, sample_answer)
    VALUES (?, ?, ?, ?, ?)
    """, questions)

    # 7. Projects Hub
    projects = [
        (1, "Alex Kumar", "1MS21CS084", "Autonomous Drone Telemetry Mesh", "Capstone Project",
         "A peer-to-peer telemetry protocol connecting 12 UAV autonomous nodes with sub-20ms packet roundtrips using Go, gRPC, and WebRTC data channels.",
         "Go, gRPC, WebRTC, Protocol Buffers, Docker", "https://github.com/alexkumar/drone-mesh", "https://dronemesh.dev",
         "projects/drone_telemetry_architecture.pdf", "", "Looking for Teammates", "1 Embedded C++ Firmware Engineer, 1 React Dashboard Dev",
         "Dr. Ramesh Rao", "Approved"),
        (1, "Alex Kumar", "1MS21CS084", "Distributed Key-Value Store with Raft", "Mini Project",
         "An LSM-tree based persistent key-value store in Rust implementing leader election, log compaction, and client snapshot transfers.",
         "Rust, Tokio, Raft Consensus, RocksDB", "https://github.com/alexkumar/raft-kv", "https://kv-raft.live",
         "", "", "Team Full", "", "Dr. Ramesh Rao", "Approved"),
        (1, "Alex Kumar", "1MS21CS084", "AI Radiogram Diagnostic Assistant", "Research",
         "Convolutional neural network pipeline for automated anomaly detection in pulmonary chest X-rays with Grad-CAM explainability heatmaps.",
         "Python, PyTorch, FastAPI, OpenCV, React.js", "https://github.com/alexkumar/radiogram-ai", "",
         "", "", "Looking for Teammates", "1 Computer Vision Research Intern", "Prof. Ananya Sen", "Approved")
    ]
    cursor.executemany("""
    INSERT INTO projects (student_id, student_name, usn, title, category, description, technologies, github_url, demo_url, document_file, image_file, team_status, open_roles, guide_name, guide_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, projects)

    # Project Feedback
    cursor.execute("""
    INSERT INTO project_feedback (project_id, faculty_name, score, max_score, comments)
    VALUES (1, 'Dr. Ramesh Rao', 48, 50, 'Exceptional systems implementation. The decentralized failover test passing under 15ms is publishable quality work.')
    """)

    # 8. Events & Clubs
    events = [
        ("Apex National Hackathon 2026", "Hackathon", "ACM Student Chapter", "2026-11-20", "09:00 AM", "Main University Auditorium",
         "A 36-hour non-stop national hackathon tackling Generative AI, Systems Engineering, and Sustainable Smart Cities. Cash prizes worth ₹2,50,000.",
         "2026-11-18", 120, 94, "Upcoming", "Admin"),
        ("Hands-on Kubernetes & Helm Masterclass", "Workshop", "Cloud & DevOps Club", "2026-11-24", "02:00 PM", "Systems Lab 3",
         "Learn container lifecycle orchestration, Helm templating, Ingress routing, and zero-downtime rolling updates on a multi-node cluster.",
         "2026-11-23", 60, 48, "Upcoming", "Cloud Club Lead"),
        ("PyTorch Deep Learning & LLM Quantization", "Workshop", "AI & Machine Learning Club", "2026-11-28", "10:00 AM", "Seminar Hall 2",
         "Interactive tutorial on fine-tuning open-source LLMs using LoRA, 4-bit quantization, and evaluation benchmarks on GPU nodes.",
         "2026-11-27", 80, 75, "Upcoming", "AI Club Faculty Coordinator"),
        ("ACM Winter Competitive Programming League", "Technical Club", "ACM Chapter", "2026-12-02", "05:00 PM", "Online & Lab 4",
         "Speed programming showdown covering dynamic programming, graph flows, and computational geometry with live leaderboard.",
         "2026-12-01", 150, 110, "Upcoming", "ACM Lead"),
        ("Annual Inter-Collegiate Cultural Fest 'Vibrance'", "Cultural & Sports", "Student Council", "2026-12-10", "09:00 AM", "Campus Amphitheater",
         "The grandest student fest of the year featuring music, dance battles, dramatics, battle of bands, and art installations.",
         "2026-12-08", 500, 340, "Upcoming", "Dean Student Affairs")
    ]
    cursor.executemany("""
    INSERT INTO events (title, category, club_name, event_date, event_time, venue, description, registration_deadline, seats_total, seats_booked, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, events)

    # Event Registrations
    registrations = [
        (1, 1, "Alex Kumar", "1MS21CS084", "2026-10-28 11:00", "Attended", 1, "certificates/hackathon_first_runner_up.pdf", "Certificate of Achievement - First Runner-Up"),
        (2, 1, "Alex Kumar", "1MS21CS084", "2026-11-01 16:30", "Registered", 0, "", "")
    ]
    cursor.executemany("""
    INSERT INTO event_registrations (event_id, student_id, student_name, usn, registered_at, attendance_status, certificate_issued, certificate_file, certificate_title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, registrations)

    conn.commit()

def seed_library_and_campus_services(conn):
    import json
    cursor = conn.cursor()

    # 1. Library Books
    books = [
        ("978-0132392273", "Distributed Systems: Principles and Paradigms", "Andrew S. Tanenbaum, Maarten van Steen",
         "Computer Science", "Pearson Education", "3rd Edition", "Stack CS-03, Row B", 8, 5, 3),
        ("978-0387310732", "Pattern Recognition and Machine Learning", "Christopher M. Bishop",
         "Artificial Intelligence", "Springer", "1st Edition", "Stack AI-01, Row A", 6, 4, 2),
        ("978-0262033848", "Introduction to Algorithms (CLRS)", "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
         "Algorithms", "MIT Press", "3rd Edition", "Stack ALGO-02, Row C", 10, 7, 3),
        ("978-0321486813", "Compilers: Principles, Techniques, and Tools", "Alfred V. Aho, Monica S. Lam, Ravi Sethi, Jeffrey D. Ullman",
         "Computer Science", "Addison-Wesley", "2nd Edition", "Stack CS-04, Row D", 6, 4, 2),
        ("978-0133594140", "Computer Networking: A Top-Down Approach", "James F. Kurose, Keith W. Ross",
         "Computer Networks", "Pearson", "7th Edition", "Stack NET-01, Row E", 7, 5, 2),
        ("978-0073523323", "Database System Concepts", "Abraham Silberschatz, Henry F. Korth, S. Sudarshan",
         "Database Systems", "McGraw-Hill", "7th Edition", "Stack DB-02, Row B", 9, 6, 3),
        ("978-1449373320", "Designing Data-Intensive Applications", "Martin Kleppmann",
         "Distributed Systems", "O'Reilly Media", "1st Edition", "Stack CS-05, Row A", 5, 2, 3),
        ("978-1118063330", "Operating System Concepts", "Abraham Silberschatz, Peter B. Galvin, Greg Gagne",
         "Operating Systems", "Wiley", "10th Edition", "Stack OS-01, Row C", 8, 6, 2)
    ]
    cursor.executemany("""
    INSERT INTO library_books (isbn, title, author, category, publisher, edition, shelf_location, total_copies, available_copies, issued_copies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, books)

    # 2. Library Borrow Records (Active and Past History)
    borrow_records = [
        # Active issued books for Alex Kumar (student_id = 1)
        (1, 1, "Alex Kumar", "1MS21CS084", "2026-10-20", "2026-11-10", None, "Issued", 0.0, "Physical copy issued at counter desk."),
        (2, 1, "Alex Kumar", "1MS21CS084", "2026-10-15", "2026-11-05", None, "Issued", 0.0, "Renewed once on request."),
        # Borrowing history (Past returned books)
        (3, 1, "Alex Kumar", "1MS21CS084", "2026-09-01", "2026-09-22", "2026-09-20", "Returned", 0.0, "Returned in pristine condition."),
        (6, 1, "Alex Kumar", "1MS21CS084", "2026-08-10", "2026-08-31", "2026-08-28", "Returned", 0.0, "On-time return."),
        (4, 1, "Alex Kumar", "1MS21CS084", "2026-07-05", "2026-07-26", "2026-07-25", "Returned", 0.0, "Returned on time.")
    ]
    cursor.executemany("""
    INSERT INTO library_borrow_records (book_id, student_id, student_name, usn, issue_date, due_date, return_date, status, fine_amount, librarian_remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, borrow_records)

    # 3. Bus Routes & Demo Tracking
    route14_stops = [
        {"stop_name": "Electronic City Toll Gate", "time": "07:30 AM", "status": "Passed"},
        {"stop_name": "Hosa Road Junction", "time": "07:45 AM", "status": "Passed"},
        {"stop_name": "Kudlu Gate Signal", "time": "08:00 AM", "status": "Passed"},
        {"stop_name": "Silk Board Flyover", "time": "08:15 AM", "status": "Current Demo Location", "is_current": True},
        {"stop_name": "BTM Layout 2nd Stage", "time": "08:30 AM", "status": "Upcoming"},
        {"stop_name": "College Campus Gate 2", "time": "08:50 AM", "status": "Destination"}
    ]

    route07_stops = [
        {"stop_name": "ITPL Main Gate Whitefield", "time": "07:20 AM", "status": "Passed"},
        {"stop_name": "Kundalahalli Gate", "time": "07:40 AM", "status": "Passed"},
        {"stop_name": "Marathahalli Bridge Junction", "time": "08:05 AM", "status": "Current Demo Location", "is_current": True},
        {"stop_name": "HAL Old Airport Road", "time": "08:25 AM", "status": "Upcoming"},
        {"stop_name": "College Campus Gate 1", "time": "08:45 AM", "status": "Destination"}
    ]

    route21_stops = [
        {"stop_name": "Navrang Circle Rajajinagar", "time": "07:15 AM", "status": "Passed"},
        {"stop_name": "Majestic Central Bus Terminus", "time": "07:35 AM", "status": "Passed"},
        {"stop_name": "Corporation Circle", "time": "07:55 AM", "status": "Current Demo Location", "is_current": True},
        {"stop_name": "Lalbagh West Gate", "time": "08:15 AM", "status": "Upcoming"},
        {"stop_name": "College Campus Gate 3", "time": "08:45 AM", "status": "Destination"}
    ]

    bus_routes = [
        ("Route 14", "KA-01-F-4022", "Mr. Suresh Gowda", "+91 98450 12345", "Electronic City", "Campus Gate 2",
         json.dumps(route14_stops), "Silk Board Flyover (Approaching Bommanahalli)", 32, "On Route"),
        ("Route 07", "KA-01-F-3819", "Mr. Manjunath R", "+91 98450 67890", "Whitefield (ITPL)", "Campus Gate 1",
         json.dumps(route07_stops), "Marathahalli Bridge Junction", 28, "On Route"),
        ("Route 21", "KA-01-F-5110", "Mr. Kempe Gowda", "+91 98450 99887", "Rajajinagar & Majestic", "Campus Gate 3",
         json.dumps(route21_stops), "Corporation Circle", 24, "On Route")
    ]
    cursor.executemany("""
    INSERT INTO bus_routes (route_number, bus_number, driver_name, driver_phone, start_point, end_point, stops_and_timings_json, current_demo_location, demo_speed_kmh, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, bus_routes)

    # 4. Canteen Menu
    canteen_items = [
        ("Masala Dosa with Sambar & Chutneys", "Breakfast", 50.0, "Vegetarian", "Available", "07:30 AM - 11:30 AM"),
        ("Steamed Idli & Crispy Vada Combo (2+1)", "Breakfast", 45.0, "Vegetarian", "Available", "07:30 AM - 11:30 AM"),
        ("Poha with Peanuts & Roasted Sev", "Breakfast", 35.0, "Vegetarian", "Available", "07:30 AM - 11:30 AM"),
        ("Poori Masala with Potato Bhaji (3 Pcs)", "Breakfast", 55.0, "Vegetarian", "Available", "07:30 AM - 11:30 AM"),
        ("South Indian Executive Veg Thali", "Lunch & Meals", 85.0, "Vegetarian", "Available", "12:00 PM - 03:30 PM"),
        ("North Indian Paneer Butter Masala Meal", "Lunch & Meals", 110.0, "Vegetarian", "Available", "12:00 PM - 03:30 PM"),
        ("Dum Vegetable Biryani with Fresh Raita", "Lunch & Meals", 90.0, "Vegetarian", "Available", "12:00 PM - 03:30 PM"),
        ("Spicy Egg Curry Bowl with 3 Parottas", "Lunch & Meals", 95.0, "Non-Vegetarian", "Available", "12:00 PM - 03:30 PM"),
        ("Hyderabadi Chicken Biryani (Wed/Fri Special)", "Lunch & Meals", 130.0, "Non-Vegetarian", "Available", "12:00 PM - 03:30 PM"),
        ("Crispy Punjabi Samosa (Plate of 2)", "Snacks & Quick Bites", 30.0, "Vegetarian", "Available", "All Day"),
        ("Grilled Paneer Tikka Wrap", "Snacks & Quick Bites", 65.0, "Vegetarian", "Available", "All Day"),
        ("South Indian Filter Coffee (Fresh Brew)", "Beverages", 18.0, "Vegetarian", "Available", "All Day"),
        ("Clay Kulhad Masala Chai", "Beverages", 15.0, "Vegetarian", "Available", "All Day"),
        ("Fresh Cold-Pressed Watermelon Juice", "Beverages", 40.0, "Vegetarian", "Available", "All Day")
    ]
    cursor.executemany("""
    INSERT INTO canteen_menu (item_name, category, price, dietary, availability, timings)
    VALUES (?, ?, ?, ?, ?, ?)
    """, canteen_items)

    # 5. Lost and Found
    lost_found_items = [
        ("Lost", "HP Wireless Ergonomic Mouse (Black)", "Electronics", "Systems Lab 3, Row 4", "2026-11-01",
         "Left behind after compiler design lab session. Dark gray matte body with a small hairline scratch on scroll wheel.",
         "Alex Kumar", "1MS21CS084", "student@college.edu", "+91 98765 43210", "Open", "Finder can return to CS Dept office or call reporter directly."),
        ("Found", "Scientific Calculator Casio fx-991EX ClassWiz", "Electronics", "Seminar Hall 2, Desk 12", "2026-11-02",
         "Found after machine learning guest talk. Black body with sticker of formula sheet inside cover.",
         "Pooja Hegde", "1MS21CS065", "pooja.h@college.edu", "+91 98451 22334", "Open", "Can collect from Central Systems Lab Room 204 with student identity proof."),
        ("Found", "Titan Classic Leather Strap Wristwatch", "Personal Items", "Campus Badminton Arena", "2026-10-30",
         "Silver casing dial with brown stitched leather strap. Deposited at Sports Complex Office.",
         "Coach R. Narayanan", "STAFF-SP02", "sports.office@college.edu", "+91 80 2345 6712", "Claimed", "Owner verified and retrieved on Nov 01.")
    ]
    cursor.executemany("""
    INSERT INTO lost_and_found (report_type, item_title, category, location_reported, date_reported, description, reporter_name, reporter_usn, contact_email, contact_phone, status, claim_instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, lost_found_items)

    # Sample Lost and Found Inquiry Message
    cursor.execute("""
    INSERT INTO lost_and_found_messages (item_id, sender_name, sender_usn, sender_contact, message)
    VALUES (1, 'Rohan Sharma', '1MS21CS092', '+91 98450 11223', 'I think I saw a black mouse on Desk 4 after the lab. The lab attendant collected it.')
    """)

    # 6. Campus Facilities
    facilities = [
        ("Advanced GPU & Artificial Intelligence Research Lab", "Laboratories", "CS Block, 3rd Floor, Room 304",
         "08:00 AM - 08:00 PM", "Dr. Ramesh Rao (Head of Systems)", "+91 80 2345 6701",
         "High-performance computing cluster equipped with dedicated GPU nodes for distributed model training and compiler research.",
         "8x NVIDIA A100 Tensor Core GPUs, Gigabit Optical Interconnect, Red Hat Enterprise Linux 9, CUDA 12"),
        ("Central University Library & Digital Knowledge Vault", "Amenities & Utilities", "Knowledge Block, Opposite Main Quadrangle",
         "08:00 AM - 10:00 PM (Mon-Sat)", "Dr. Meenakshi Sundaram (Chief Librarian)", "+91 80 2345 6705",
         "Air-conditioned 3-tier repository housing over 65,000 print volumes, IEEE digital access desks, and quiet cubicles.",
         "65,000+ Print Volumes, 120 High-Speed E-Terminals, RFID Self-Checkout, Kindle Lending"),
        ("Multipurpose Indoor Sports Complex & Gymnasium", "Sports & Fitness", "Adjacent to University Athletic Grounds",
         "06:00 AM - 09:00 AM & 04:30 PM - 08:30 PM", "Mr. B. K. Prasad (Sports Director)", "+91 80 2345 6712",
         "State-of-the-art sports pavilion featuring competition badminton courts, table tennis arena, Olympic weightlifting gym, and floodlit basketball court.",
         "4 Maple Badminton Courts, 6 Table Tennis Arenas, Olympic Weightlifting Station, Certified Trainers"),
        ("Campus Health & Urgent Medical Care Clinic", "Medical & Health", "Ground Floor, Health & Wellness Pavilion",
         "24/7 Round-the-Clock Emergency Services", "Dr. Sunita Varma (Senior Medical Officer)", "Emergency: +91 80 2345 6799 / Intercom 911",
         "Resident medical officer clinic with a 6-bed observation ward, automated external defibrillator (AED), oxygen bank, and 24-hour campus ambulance.",
         "24/7 ICU Ambulance on Standby, Resident Physician, Basic Pharmacy Dispenser, ECG & Oxygen Monitoring"),
        ("APEX Central Auditorium & Convocation Hall", "Auditoriums & Halls", "Auditorium Block, Gate 1",
         "Event Scheduled (08:30 AM - 09:30 PM)", "Mr. K. V. Satish (Estate Operations)", "+91 80 2345 6720",
         "Acoustically treated 1,200-seat amphitheater with 4K laser projection, motorized stage lighting, and professional audio live-streaming studio.",
         "1,200 Seating Capacity, 4K Laser Projection, Motorized Truss Lighting, Green Rooms & Green Studio")
    ]
    cursor.executemany("""
    INSERT INTO campus_facilities (facility_name, category, building_location, operating_hours, in_charge_name, contact_tel, description, key_features)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, facilities)

    conn.commit()

def seed_notifications_and_doubts(conn):
    cursor = conn.cursor()

    # 1. Notifications
    notifs = [
        ("End-Semester Theory Exam Hall Tickets Released", "Examination", "Office of Controller of Examinations",
         "Theory examination schedules for semesters 4, 6 and 8 are published. Download official hall tickets from the examination module before November 12.",
         "High", "all", "2026-11-02", 0),
        ("Campus Recruitment Drive: Microsoft Solutions Open", "Placement", "Career & Placement Cell",
         "Online registration for Azure Systems Engineer role is now open for students with CGPA >= 8.0. Submit resume before November 15.",
         "High", "student", "2026-11-01", 0),
        ("Assignment 3: Raft Consensus Engine Deadline", "Assignment Reminder", "Dept of Computer Science",
         "Submission portal for Distributed Systems Assignment 3 (Raft protocol implementation) closes on Nov 10 at 11:59 PM.",
         "Urgent", "student", "2026-11-02", 1),
        ("Attendance Alert: Cloud Architecture below 80%", "Attendance Alert", "Academic Attendance Committee",
         "Your attendance in CS604 Cloud Architecture is currently 79.5%. You must attend the next 4 consecutive sessions to cross 85%.",
         "High", "student", "2026-11-01", 0),
        ("Annual Inter-College Hackathon Registrations", "College Announcement", "Student Affairs & Innovation Cell",
         "Registrations for HackSphere 2026 36-hour hackathon are open. Form team of 3-4 members and register before Nov 20.",
         "Normal", "all", "2026-10-30", 1),
        ("Internal Assessment 2 Retest for Approved Absentees", "Examination", "Office of Academic Registrar",
         "Approved OD and medical absentees may sit for IA-2 retest on November 18 in Main Seminar Hall.",
         "Normal", "student", "2026-10-28", 1),
        ("Special Guest Lecture on Large Language Models & Quantization", "College Announcement", "AI Research Lab",
         "Guest talk by Dr. S. Ramanathan (Lead AI Scientist at DeepMind) on Saturday 10:30 AM in APEX Auditorium.",
         "Normal", "all", "2026-10-27", 1)
    ]
    cursor.executemany("""
    INSERT INTO notifications (title, category, department, content, priority, target_role, published_date, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, notifs)

    # 2. Faculty Appointments
    appointments = [
        (1, "Alex Kumar", "1MS21CS084", "Dr. Ramesh Rao (Head of Systems)", "Computer Science",
         "Discussing Distributed Systems Capstone Project architecture and GPU compute allocation.",
         "2026-11-05", "10:30 AM - 11:00 AM", "Confirmed", "Approved. Please bring the system architecture block diagram."),
        (1, "Alex Kumar", "1MS21CS084", "Dr. Geetha S. (HoD ECE)", "Electronics & Communication",
         "Guidance on embedded IoT sensor interface with the drone telemetry project.",
         "2026-11-08", "02:30 PM - 03:00 PM", "Pending", ""),
        (1, "Alex Kumar", "1MS21CS084", "Prof. Anil Deshmukh", "Computer Science",
         "Review of Compiler Design AST optimization homework solution.",
         "2026-10-25", "11:30 AM - 12:00 PM", "Completed", "Discussion concluded. Optimization passes verified.")
    ]
    cursor.executemany("""
    INSERT INTO faculty_appointments (student_id, student_name, usn, faculty_name, department, purpose, requested_date, requested_slot, status, faculty_remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, appointments)

    # 3. Faculty Doubts
    doubts = [
        (1, "Alex Kumar", "1MS21CS084", "CS601", "Distributed Systems", "Dr. Ramesh Rao (Head of Systems)",
         "Raft Leader Partition Staleness",
         "In Raft consensus, how does an isolated network leader prevent committing uncommitted log entries before discovering a higher term in a healed cluster?",
         "", "Answered"),
        (1, "Alex Kumar", "1MS21CS084", "CS603", "Compiler Design", "Prof. Anil Deshmukh",
         "L-attributed vs S-attributed Translation Grammars",
         "Can an L-attributed syntax-directed definition (SDD) always be converted into an S-attributed SDD without introducing dummy non-terminals?",
         "", "Answered"),
        (1, "Alex Kumar", "1MS21CS084", "CS602", "Machine Learning", "Dr. Ramesh Rao (Head of Systems)",
         "Batch Normalization vs Layer Normalization in Transformers",
         "Why does Layer Normalization perform consistently better than Batch Normalization across variable length sequential token sequences in Transformer attention heads?",
         "", "Under Review")
    ]
    cursor.executemany("""
    INSERT INTO faculty_doubts (student_id, student_name, usn, subject_code, subject_name, faculty_name, title, question, attachment_file, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, doubts)

    # 4. Doubt Responses
    responses = [
        (1, "Dr. Ramesh Rao (Head of Systems)", "faculty",
         "A leader only commits an entry when it receives confirmations from a strict majority (quorum) of peers. In a minority partition, the stale leader cannot achieve a quorum, preventing commit of new entries. When healed, the higher term from the majority forces the stale leader to immediately step down to follower state.",
         ""),
        (2, "Prof. Anil Deshmukh", "faculty",
         "No, because L-attributed SDDs permit inherited attributes evaluated from left siblings and parent, whereas S-attributed SDDs strictly evaluate bottom-up synthesized attributes. Converting arbitrary L-attributed SDDs generally requires embedding marker non-terminals to capture inherited context.",
         "")
    ]
    cursor.executemany("""
    INSERT INTO doubt_responses (doubt_id, responder_name, responder_role, response_text, attachment_file)
    VALUES (?, ?, ?, ?, ?)
    """, responses)

    conn.commit()

def seed_faculty_mentor_data(conn):
    cursor = conn.cursor()

    # 1. Faculty Mentors
    mentors = [
        ("EMP-CS104", "Dr. K. V. Sharma", "Computer Science & Engineering",
         "Professor & Chief Academic Mentor", "Ph.D. in Computer Science (IIT Bombay), M.Tech (Systems), B.E. CSE",
         "Distributed Systems, Compiler Optimization, Cloud Native Architectures",
         "CS603 Compiler Design, CS601 Distributed Systems, CS801 Cloud Computing",
         "kv.sharma@college.edu", "+91 98450 12345", "Academic Block 3, Room CS-304 (3rd Floor)",
         "Mon & Wed: 02:00 PM - 04:00 PM, Fri: 10:00 AM - 12:00 PM",
         "",
         "Dr. K. V. Sharma possesses over 18 years of academic teaching and engineering mentorship experience. Serves as Chief Mentor for the Department of Computer Science & Engineering."),

        ("EMP-CS108", "Dr. Ramesh Rao", "Computer Science & Engineering",
         "Professor & Head of Systems Lab", "Ph.D. High Performance Computing, M.Tech, B.E.",
         "Operating Systems, Memory Hierarchies, Parallel Architecture",
         "CS502 Operating Systems, CS605 Advanced Computer Architecture",
         "ramesh.rao@college.edu", "+91 98451 98765", "Systems Block, Room CS-201 (2nd Floor)",
         "Tue & Thu: 11:00 AM - 01:00 PM",
         "",
         "Leads collegiate systems research and kernel engineering labs with 15 years of doctoral and undergraduate mentoring."),

        ("EMP-CS112", "Prof. Ananya Sen", "Computer Science & Engineering",
         "Associate Professor & AI Lab In-Charge", "M.Tech (IISc Bangalore), B.Tech CSE",
         "Machine Learning, Deep Neural Networks, Natural Language Processing",
         "CS602 Machine Learning, CS606L ML & Data Engineering Lab",
         "ananya.sen@college.edu", "+91 98452 34567", "AI & Data Engineering Wing, Room CS-410 (4th Floor)",
         "Wed & Fri: 03:00 PM - 05:00 PM",
         "",
         "Published in top IEEE ML venues. Guides undergraduate research cohorts in applied artificial intelligence and medical informatics.")
    ]
    cursor.executemany("""
    INSERT INTO faculty_mentors (faculty_id, name, department, designation, qualification, specialization, subjects_handled, email, phone, office_room, consultation_hours, photo_url, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, mentors)

    # 2. Mentor Assignments
    assignments = [
        (1, "1MS21CS084", "Alex Kumar", "Computer Science & Engineering", 6, "B", 1, "CSE Batch 2021-2025 Mentor Group A", "2024-08-01", "2025-2026", "Active"),
        (101, "1MS21CS092", "Rohan Sharma", "Computer Science & Engineering", 6, "B", 1, "CSE Batch 2021-2025 Mentor Group A", "2024-08-01", "2025-2026", "Active"),
        (102, "1MS21CS065", "Pooja Hegde", "Computer Science & Engineering", 6, "B", 1, "CSE Batch 2021-2025 Mentor Group A", "2024-08-01", "2025-2026", "Active"),
        (103, "1MS21CS071", "Priya Nair", "Computer Science & Engineering", 6, "B", 1, "CSE Batch 2021-2025 Mentor Group A", "2024-08-01", "2025-2026", "Active"),
        (104, "1MS21CS115", "Vikram Aditya", "Computer Science & Engineering", 6, "A", 2, "CSE Batch 2021-2025 Mentor Group B", "2024-08-01", "2025-2026", "Active"),
        (105, "1MS21CS102", "Sneha Patil", "Computer Science & Engineering", 6, "C", 3, "CSE Batch 2021-2025 Mentor Group C", "2024-08-01", "2025-2026", "Active")
    ]
    cursor.executemany("""
    INSERT INTO mentor_assignments (student_id, usn, student_name, department, semester, section, mentor_id, group_name, assigned_date, academic_year, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, assignments)

    # 3. Mentor Direct Messages (between Alex Kumar and Dr. K. V. Sharma)
    messages = [
        (1, 1, "Alex Kumar", "Dr. K. V. Sharma", "student", "Alex Kumar", "Guidance on Capstone Architecture",
         "Good morning Dr. Sharma. I would like to seek your advice on selecting the consensus protocol for our capstone project on Autonomous Drone Telemetry Mesh.", "", 1, "2026-10-20 09:30:00"),
        (1, 1, "Alex Kumar", "Dr. K. V. Sharma", "faculty", "Dr. K. V. Sharma", "Guidance on Capstone Architecture",
         "Good morning Alex. For a low-latency edge mesh, Raft with lightweight heartbeats or an optimized gossip protocol will give you deterministic partition tolerance. Bring a 1-page architecture block diagram to our Wednesday consultation.", "", 1, "2026-10-20 11:15:00"),
        (1, 1, "Alex Kumar", "Dr. K. V. Sharma", "student", "Alex Kumar", "Guidance on Capstone Architecture",
         "Thank you Dr. Sharma! I will prepare the telemetry pipeline schematic and attend the Wednesday 02:30 PM slot.", "", 1, "2026-10-20 11:45:00"),
        (1, 1, "Alex Kumar", "Dr. K. V. Sharma", "faculty", "Dr. K. V. Sharma", "Semester 6 Academic Progress",
         "Alex, your CIE-1 marks in Compiler Design and ML are solid. Keep up the consistent laboratory log submissions.", "", 1, "2026-10-28 14:10:00"),
        (1, 1, "Alex Kumar", "Dr. K. V. Sharma", "student", "Alex Kumar", "Semester 6 Academic Progress",
         "Thank you Professor. I have also submitted the mid-term self-reflection in the Digital Mentor Book.", "", 0, "2026-10-28 15:05:00")
    ]
    cursor.executemany("""
    INSERT INTO mentor_messages (mentor_id, student_id, student_name, mentor_name, sender_role, sender_name, subject, message, attachment_file, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, messages)

    # 4. Mentor Group Discussions
    discussions = [
        (1, "CSE Batch 2021-2025 Mentor Group A", 2, "Dr. K. V. Sharma", "faculty", "Announcement",
         "Official Guidelines: Mid-Term Academic Review & Mentor Book Record Verification",
         "Dear Mentees, the Semester 6 Mid-Term Academic Review sessions are scheduled for this week. Please review your Continuous Internal Evaluation marks, attendance percentages, and ensure all extracurricular or technical certification proofs are updated in your digital mentor book before booking your 1-on-1 consultation slot.",
         "", 1, "Active", 48, "2026-10-22 09:00:00"),

        (1, "CSE Batch 2021-2025 Mentor Group A", 101, "Rohan Sharma", "student", "Career",
         "Recommended Preparation Strategy for GATE 2026 alongside Semester 6 Courses",
         "Hello peers and Dr. Sharma, could anyone share their timetable schedule for revising core subjects like Operating Systems and Theory of Computation while keeping up with current semester lab submissions?",
         "", 0, "Active", 35, "2026-10-25 14:30:00"),

        (1, "CSE Batch 2021-2025 Mentor Group A", 1, "Alex Kumar", "student", "Study Material",
         "Compiler Design: LL(1) Parsing Table Construction and Conflict Resolution Notes",
         "I have uploaded solved sample problems on eliminating left recursion and computing FIRST & FOLLOW sets to our study notes repository. Let me know if anyone wants to do a quick review session before CIE-2.",
         "", 0, "Active", 29, "2026-10-29 17:15:00")
    ]
    cursor.executemany("""
    INSERT INTO mentor_discussions (mentor_id, group_name, creator_id, creator_name, creator_role, category, title, content, attachment_file, is_pinned, status, views_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, discussions)

    # 5. Discussion Replies
    replies = [
        (1, 1, "Alex Kumar", "student",
         "Thank you Dr. Sharma. I have verified all 6 semester marks records and updated my AWS certification in the digital book.", "2026-10-22 10:15:00"),
        (1, 102, "Pooja Hegde", "student",
         "Confirmed Sir. I have checked my attendance log and verified that all 4 OD hours for the hackathon are recorded.", "2026-10-22 11:30:00"),
        (2, 1, "Alex Kumar", "student",
         "Rohan, I dedicate 1.5 hours every morning to standard PYQ problem sets before 9 AM classes. It prevents last-minute backlog.", "2026-10-25 16:00:00"),
        (2, 2, "Dr. K. V. Sharma", "faculty",
         "Focus heavily on discrete mathematics, system structures, and formal languages early in your preparation cycle. The Department will also conduct mock test series starting next month.", "2026-10-25 18:20:00"),
        (3, 101, "Rohan Sharma", "student",
         "Thanks Alex, these parsing walkthroughs made non-terminal substitution much easier to understand.", "2026-10-30 09:10:00")
    ]
    cursor.executemany("""
    INSERT INTO mentor_discussion_replies (discussion_id, author_id, author_name, author_role, reply_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, replies)

    # 6. Online Meetings
    meetings = [
        (1, 1, "Alex Kumar", "1MS21CS084", "2026-11-06", "02:30 PM - 03:00 PM", "Academic Guidance",
         "Semester 6 Mid-Term Performance Review and Compiler Design score optimization strategy.",
         "Approved", "Google Meet", "https://meet.google.com/vzk-ymjw-qda",
         "Approved. Please ensure your CIE answer scripts are available for review.", "2026-11-01 10:00:00", "2026-11-01 11:30:00"),

        (1, 1, "Alex Kumar", "1MS21CS084", "2026-10-18", "11:00 AM - 11:30 AM", "Project Guidance",
         "Capstone project architecture review and faculty guide consent.",
         "Completed", "Google Meet", "https://meet.google.com/vzk-ymjw-qda",
         "Session completed. Advised to implement Raft consensus with automated failover testing.", "2026-10-15 14:00:00", "2026-10-18 11:35:00")
    ]
    cursor.executemany("""
    INSERT INTO mentor_meetings (mentor_id, student_id, student_name, usn, requested_date, requested_slot, meeting_type, agenda, status, meeting_platform, meeting_link, mentor_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, meetings)

    # 7. Digital Mentor Book: Mentoring Meeting Records (Sessions)
    sessions = [
        (1, "1MS21CS084", "Alex Kumar", 1, "2026-10-24", "Mid-Term Progress Review", 6,
         "Continuous Internal Evaluation (CIE-1) performance analysis, Compiler Design exam strategy, capstone milestone 1 status.",
         "Felt time constraint during the syntax tree construction questions in CIE-1.",
         "Advised student to complete timed LL(1) parsing table exercises and attend weekly departmental tutorial hours.",
         "Complete Tutorial Exercise Sheet #3 before Nov 10; push capstone repository commit with distributed consensus testbench.",
         "2026-11-15", "Dr. K. V. Sharma (Chief Academic Mentor)", "2026-10-24 16:00:00"),

        (1, "1MS21CS084", "Alex Kumar", 1, "2026-05-12", "End-Term Performance & Career Guidance", 5,
         "Review of Semester 5 SGPA (9.30), internship search criteria, resume preparation for pre-placement drives.",
         "Selecting between systems software roles and enterprise full-stack development profiles.",
         "Focus on distributed systems and low-level concurrency. Target systems engineering internships in tier-1 product organizations.",
         "Upload updated 1-page PDF resume to Placement Cell; prepare GitHub repositories with clean documentation.",
         "2026-08-20", "Dr. K. V. Sharma (Chief Academic Mentor)", "2026-05-12 15:30:00"),

        (1, "1MS21CS084", "Alex Kumar", 1, "2025-11-10", "Semester Onboarding & Academic Planning", 5,
         "Semester 5 course registration, elective selection (Cloud Computing vs Cryptography), academic target setting.",
         "Inquiring if taking Cloud Computing will complement Semester 6 Distributed Systems.",
         "Affirmed that Cloud Computing pairs strongly with Systems electives. Set target SGPA of >= 9.20.",
         "Maintain > 85% attendance across all 6 theory subjects; register for AWS student credentials.",
         "2025-12-18", "Dr. K. V. Sharma (Chief Academic Mentor)", "2025-11-10 14:00:00")
    ]
    cursor.executemany("""
    INSERT INTO mentor_book_sessions (student_id, usn, student_name, mentor_id, session_date, session_type, semester, topics_discussed, student_concerns, mentor_suggestions, action_items, next_meeting_date, recorded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sessions)

    # 8. Digital Mentor Book: Official Mentor Remarks
    remarks = [
        (1, "1MS21CS084", 6, 1,
         "Alex demonstrates exemplary academic consistency, analytical rigor, and deep conceptual understanding in core computing subjects. Maintained excellent lab regularity.",
         "Strong systems problem-solving, rapid technical adaptability, peer leadership in group assignments, prompt lab completion.",
         "Slight hesitation in descriptive long-form examinations; time allocation between multiple 10-mark questions.",
         "Recommended to practice timed previous question papers and allocate time for mock interview presentation skills.",
         "Recommended for tier-1 product campus placements, research fellowships, and the departmental Honors degree program.",
         "Review CIE-2 scores in Compiler Design and verify capstone milestone 2 test reports.",
         "Dr. K. V. Sharma (Chief Academic Mentor)", "2026-10-24 16:30:00"),

        (1, "1MS21CS084", 5, 1,
         "Outstanding overall performance in Semester 5 culminating in an SGPA of 9.30. Consistently engaged during lecture discussions.",
         "High aptitude for system software and database internals; thorough documentation in laboratory assignments.",
         "Could broaden participation in inter-college competitive hackathons.",
         "Advised student to form a multidisciplinary hackathon team for the upcoming National Smart Campus competition.",
         "Eligible for Departmental Merit Commendation.",
         "Follow up on summer internship application status at CloudPulse Technologies.",
         "Dr. K. V. Sharma (Chief Academic Mentor)", "2026-05-12 16:00:00")
    ]
    cursor.executemany("""
    INSERT INTO mentor_book_remarks (student_id, usn, semester, mentor_id, academic_observations, strengths, weaknesses, areas_requiring_improvement, mentor_recommendations, follow_up_notes, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, remarks)

    # 9. Digital Mentor Book: Student Development
    dev_records = [
        (1, "1MS21CS084",
         "Go, Python, C++, TypeScript, Rust (Basics), React.js, Docker, Kubernetes, PostgreSQL, Redis, Git, Linux Internals",
         "Autonomous Drone Telemetry Mesh (Capstone), Distributed Key-Value Store with Raft Consensus, AI Radiogram Diagnostic Assistant",
         "AWS Certified Cloud Practitioner (2025), HashiCorp Certified Terraform Associate (2025), Deep Learning Specialization (Coursera)",
         "Systems Software Engineering Intern at CloudPulse Technologies (June 2025 - August 2025)",
         "First Runner-Up at National Smart Campus Hackathon 2025; Dean's Honor Roll for Semesters 3, 4 and 5; 1st Place College Algorithmic Challenge",
         "Lead Technical Coordinator at CSE Open Source Society; Active Member of University Chess Club and Robotics Wing",
         "Alex Kumar (Verified by Dr. K. V. Sharma)", "2026-10-24 16:45:00")
    ]
    cursor.executemany("""
    INSERT INTO mentor_book_development (student_id, usn, technical_skills, projects, certifications, internship_details, achievements, extracurricular_activities, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, dev_records)

    # 10. Student Feedback on Mentoring
    feedback = [
        (1, "1MS21CS084", "Alex Kumar", 1, 1, "Semester 6 Mid-Term Mentoring Review", 5, "Highly Beneficial",
         "Dr. Sharma provided concrete, step-by-step guidance on how to master compiler parsing algorithms and suggested very helpful resources. The discussion on capstone architecture was highly actionable.",
         "Would appreciate group mentoring mock-interview sessions for product companies.", "2026-10-25 10:00:00"),

        (1, "1MS21CS084", "Alex Kumar", 1, 2, "Semester 5 Career & Internship Counseling", 5, "Highly Beneficial",
         "The mentor's recommendation to pursue systems engineering internships gave me the confidence to apply to CloudPulse Technologies, where I had a successful internship.",
         "Continue having individual 1-on-1 sessions at the end of each semester.", "2026-05-13 11:30:00")
    ]
    cursor.executemany("""
    INSERT INTO mentor_student_feedback (student_id, usn, student_name, mentor_id, meeting_id, session_title, rating, usefulness, feedback_text, suggestions, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, feedback)

    # 11. Mentor Slots
    slots = [
        (1, "Monday", "02:00 PM", "04:00 PM", "Academic Block 3, Room CS-304 / Google Meet", 4, 1),
        (1, "Wednesday", "02:00 PM", "04:00 PM", "Academic Block 3, Room CS-304 / Google Meet", 4, 1),
        (1, "Friday", "10:00 AM", "12:00 PM", "Academic Block 3, Room CS-304 / Google Meet", 3, 1),
        (2, "Tuesday", "11:00 AM", "01:00 PM", "Systems Block, Room CS-201 / Google Meet", 4, 1),
        (2, "Thursday", "11:00 AM", "01:00 PM", "Systems Block, Room CS-201 / Google Meet", 4, 1),
        (3, "Wednesday", "03:00 PM", "05:00 PM", "AI Wing, Room CS-410 / Google Meet", 4, 1),
        (3, "Friday", "03:00 PM", "05:00 PM", "AI Wing, Room CS-410 / Google Meet", 4, 1)
    ]
    cursor.executemany("""
    INSERT INTO mentor_slots (mentor_id, day_name, start_time, end_time, location_mode, max_slots, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, slots)

    # 12. Mentor Audit Logs
    audit_logs = [
        (1, "1MS21CS084", "MENTOR_ASSIGNED", "Dean Academics", "admin",
         "Assigned Dr. K. V. Sharma as official Faculty Mentor to Alex Kumar in CSE Batch 2021-2025 Group A.", "2024-08-01 10:00:00"),
        (1, "1MS21CS084", "SESSION_RECORDED", "Dr. K. V. Sharma", "faculty",
         "Logged Semester 6 Mid-Term Progress Review session and set follow-up actions.", "2026-10-24 16:00:00"),
        (1, "1MS21CS084", "REMARKS_UPDATED", "Dr. K. V. Sharma", "faculty",
         "Updated official mentor remarks and recommendations for Semester 6.", "2026-10-24 16:30:00"),
        (1, "1MS21CS084", "MEETING_APPROVED", "Dr. K. V. Sharma", "faculty",
         "Approved online meeting for 2026-11-06 with Google Meet link https://meet.google.com/vzk-ymjw-qda.", "2026-11-01 11:30:00"),
        (1, "1MS21CS084", "FEEDBACK_SUBMITTED", "Alex Kumar", "student",
         "Submitted 5-star mentoring session feedback for Semester 6 Mid-Term Review.", "2026-10-25 10:00:00")
    ]
    cursor.executemany("""
    INSERT INTO mentor_audit_logs (student_id, usn, action_type, performed_by, role, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, audit_logs)

    conn.commit()

if __name__ == '__main__':
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    init_db()
    print("Database re-initialized with Timetable, Assignments, Notes, and Examination schema.")