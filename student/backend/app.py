import os
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
except ImportError:
    pass
import math
import json
import io
import base64
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import qrcode
from database import (
    get_db, init_db, UPLOAD_DIR, NOTES_UPLOAD_DIR, ASSIGNMENTS_UPLOAD_DIR,
    PROFILES_UPLOAD_DIR, RESUMES_UPLOAD_DIR, PROJECTS_UPLOAD_DIR, CERTIFICATES_UPLOAD_DIR,
    DOUBTS_UPLOAD_DIR, close_request_connections
)
from auth import guard as auth_guard
from auth.routes import bp as auth_bp, cors_origins
from auth.teacher import bp as teacher_bp
from auth.admin import bp as admin_bp
from auth.users import current_user_id, is_staff, scoped_student_id, scoped_usn, scoped_name, staff_can_access_student, fee_student_id

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
if os.environ.get('TRUST_PROXY') == '1':
    # Render and similar hosts sit behind one proxy hop; trust it for the client IP used in rate limits.
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
CORS(app, resources={r"/api/*": {"origins": cors_origins()}, r"/uploads/*": {"origins": "*"}})

init_db()
app.register_blueprint(auth_bp)
app.teardown_appcontext(close_request_connections)
app.register_blueprint(teacher_bp)
app.register_blueprint(admin_bp)
auth_guard.install(app)

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)

def calculate_grade_and_status(total, external):
    if total >= 90:
        grade = 'O'
    elif total >= 80:
        grade = 'A+'
    elif total >= 70:
        grade = 'A'
    elif total >= 60:
        grade = 'B+'
    elif total >= 55:
        grade = 'B'
    elif total >= 50:
        grade = 'C'
    elif total >= 40:
        grade = 'P'
    else:
        grade = 'F'
    status = 'Pass' if (total >= 40 and external >= 18) else 'Fail'
    return grade, status

GRADE_POINTS = {'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0}

# ==========================================================
# AUTHENTICATION: see auth/ (blueprint + central guard)
# ==========================================================

def uid():
    return current_user_id()


def profile_row(cursor, user_id=None):
    cursor.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id or uid(),))
    return cursor.fetchone()

# ==========================================================
# DASHBOARD SUMMARY
# ==========================================================

@app.route('/api/dashboard/summary', methods=['GET'])
def dashboard_summary():
    conn = get_db()
    cursor = conn.cursor()

    prof = profile_row(cursor)
    user = g.user
    profile = dict(prof) if prof else {
        'name': user['name'], 'usn': user['identifier'],
        'department': user['department'], 'semester': user['semester'],
    }
    semester = profile.get('semester') or user['semester'] or 0

    # Live attendance calculation
    cursor.execute("SELECT SUM(attended_hours) as attended, SUM(total_hours) as total, SUM(od_hours) as od FROM attendance WHERE user_id = ?", (uid(),))
    att_agg = cursor.fetchone()
    if att_agg and att_agg['total'] and att_agg['total'] > 0:
        overall_attendance = round(((att_agg['attended'] + (att_agg['od'] or 0)) / att_agg['total']) * 100, 1)
    else:
        overall_attendance = 0.0

    # Live SGPA for the current semester
    cursor.execute("SELECT credits, grade FROM academic_marks WHERE user_id = ? AND semester = ?", (uid(), semester))
    sem_marks = cursor.fetchall()
    sem_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 0) for m in sem_marks)
    sem_creds = sum(m['credits'] for m in sem_marks)
    current_sgpa = round(sem_pts / sem_creds, 2) if sem_creds > 0 else 0.0

    # Live CGPA across all recorded semesters
    cursor.execute("SELECT SUM(total_credits) as cum_credits, SUM(total_credit_points) as cum_points FROM semester_gpa_history WHERE student_id = ?", (uid(),))
    gpa_agg = cursor.fetchone()
    if gpa_agg and gpa_agg['cum_credits'] and gpa_agg['cum_credits'] > 0:
        cgpa = round(gpa_agg['cum_points'] / gpa_agg['cum_credits'], 2)
    else:
        cursor.execute("SELECT credits, grade FROM academic_marks WHERE user_id = ?", (uid(),))
        all_marks = cursor.fetchall()
        all_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 0) for m in all_marks)
        all_creds = sum(m['credits'] for m in all_marks)
        cgpa = round(all_pts / all_creds, 2) if all_creds > 0 else 0.0

    # Upcoming examinations
    cursor.execute("SELECT * FROM examinations ORDER BY exam_date ASC LIMIT 5")
    exams = [dict(r) for r in cursor.fetchall()]

    # Pending assignments
    cursor.execute("""
        SELECT a.*, COALESCE(s.status, 'Pending') as submission_status
        FROM assignments a
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ?
        WHERE COALESCE(s.status, 'Pending') = 'Pending'
        ORDER BY a.deadline_date ASC LIMIT 5
    """, (uid(),))
    pending_assignments = [dict(r) for r in cursor.fetchall()]

    # Announcements
    cursor.execute("SELECT * FROM announcements ORDER BY id DESC LIMIT 5")
    announcements = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        'student': {
            'name': profile['name'],
            'usn': profile['usn'],
            'department': profile['department'],
            'semester': profile['semester'],
            'overall_attendance': overall_attendance,
            'current_sgpa': current_sgpa,
            'cgpa': cgpa
        },
        'upcoming_examinations': exams,
        'pending_assignments': pending_assignments,
        'recent_announcements': announcements
    })

# ==========================================================
# MODULE 1: ACADEMIC PERFORMANCE & MARKS
# ==========================================================

@app.route('/api/academics/performance', methods=['GET'])
def get_performance():
    conn = get_db()
    cursor = conn.cursor()

    sid = scoped_student_id(request.args.get('student_id'))
    if sid != uid() and not staff_can_access_student(conn, sid):
        conn.close()
        return jsonify({'error': "You don't have access."}), 403
    cursor.execute("SELECT DISTINCT semester FROM academic_marks WHERE user_id = ? ORDER BY semester DESC", (sid,))
    available_semesters = [r['semester'] for r in cursor.fetchall()] or [g.user['semester'] or 1]

    selected_sem = request.args.get('semester')
    selected_sem = int(selected_sem) if selected_sem else available_semesters[0]

    cursor.execute("""
        SELECT id, course_code, course_title, credits, internal_marks, lab_marks, external_marks, total_marks, grade, status
        FROM academic_marks
        WHERE user_id = ? AND semester = ?
        ORDER BY course_code ASC
    """, (sid, selected_sem))
    marks_rows = [dict(r) for r in cursor.fetchall()]

    sem_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 0) for m in marks_rows)
    sem_creds = sum(m['credits'] for m in marks_rows)
    sgpa = round(sem_pts / sem_creds, 2) if sem_creds > 0 else 0.0

    cursor.execute("SELECT credits, grade FROM academic_marks WHERE user_id = ?", (sid,))
    all_marks = cursor.fetchall()
    cum_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 0) for m in all_marks)
    cum_creds = sum(m['credits'] for m in all_marks)
    cgpa = round(cum_pts / cum_creds, 2) if cum_creds > 0 else 0.0

    total_subjects = len(marks_rows)
    passed_subjects = sum(1 for m in marks_rows if m['status'] == 'Pass')
    failed_subjects = total_subjects - passed_subjects

    conn.close()

    return jsonify({
        'selected_semester': selected_sem,
        'available_semesters': available_semesters,
        'marks': marks_rows,
        'sgpa': sgpa,
        'cgpa': cgpa,
        'total_credits': sem_creds,
        'total_subjects': total_subjects,
        'passed_subjects': passed_subjects,
        'failed_subjects': failed_subjects,
        'result_status': 'PASS' if failed_subjects == 0 else 'FAIL'
    })

@app.route('/api/academics/marks/<int:mark_id>', methods=['PUT'])
def update_marks(mark_id):
    data = request.get_json() or {}
    internal = int(data.get('internal_marks', 0))
    lab = int(data.get('lab_marks', 0))
    external = int(data.get('external_marks', 0))

    if internal < 0 or internal > 30 or lab < 0 or lab > 20 or external < 0 or external > 50:
        return jsonify({'error': 'Marks exceed permissible ranges.'}), 400

    total = internal + lab + external
    grade, status = calculate_grade_and_status(total, external)

    conn = get_db()
    cursor = conn.cursor()
    owner = cursor.execute("SELECT user_id FROM academic_marks WHERE id = ?", (mark_id,)).fetchone()
    if not owner:
        conn.close()
        return jsonify({'error': 'Mark record not found.'}), 404
    if not staff_can_access_student(conn, owner['user_id']):
        conn.close()
        return jsonify({'error': "You don't have access."}), 403
    cursor.execute("""
        UPDATE academic_marks
        SET internal_marks = ?, lab_marks = ?, external_marks = ?, total_marks = ?, grade = ?, status = ?
        WHERE id = ?
    """, (internal, lab, external, total, grade, status, mark_id))
    conn.commit()

    cursor.execute("SELECT * FROM academic_marks WHERE id = ?", (mark_id,))
    updated_mark = dict(cursor.fetchone())
    conn.close()

    return jsonify({
        'message': f'Marks updated for {updated_mark["course_code"]}. Total: {total}/100, Grade: {grade}, Status: {status}.',
        'mark': updated_mark
    })

# ==========================================================
# MODULE 2: SMART ATTENDANCE
# ==========================================================

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    conn = get_db()
    cursor = conn.cursor()
    sid = scoped_student_id(request.args.get('student_id'))
    if sid != uid() and not staff_can_access_student(conn, sid):
        conn.close()
        return jsonify({'error': "You don't have access."}), 403

    cursor.execute("""
        SELECT id, course_code, course_title, faculty_name, attended_hours, total_hours, od_hours
        FROM attendance
        WHERE user_id = ?
        ORDER BY course_code ASC
    """, (sid,))
    raw_rows = cursor.fetchall()

    attendance_list = []
    total_conducted = 0
    total_attended = 0
    total_od = 0
    total_absent = 0

    for r in raw_rows:
        item = dict(r)
        attended = item['attended_hours']
        total = item['total_hours']
        od = item['od_hours'] or 0
        absent = max(0, total - attended - od)
        pct = round(((attended + od) / total) * 100, 1) if total > 0 else 0.0

        if pct >= 75.0:
            status = 'Eligible'
            safe_bunks = max(0, int(((attended + od) / 0.75) - total))
            needed = 0
        else:
            status = 'Shortage'
            safe_bunks = 0
            needed = max(1, math.ceil((0.75 * total - (attended + od)) / 0.25))

        item['absent_hours'] = absent
        item['percentage'] = pct
        item['status'] = status
        item['safe_bunks'] = safe_bunks
        item['needed_to_reach_75'] = needed

        total_conducted += total
        total_attended += attended
        total_od += od
        total_absent += absent
        attendance_list.append(item)

    overall_pct = round(((total_attended + total_od) / total_conducted) * 100, 1) if total_conducted > 0 else 0.0
    conn.close()

    return jsonify({
        'overall_summary': {
            'total_conducted': total_conducted,
            'total_attended': total_attended,
            'total_absent': total_absent,
            'total_od': total_od,
            'overall_percentage': overall_pct,
            'overall_status': 'Eligible' if overall_pct >= 75.0 else 'Shortage Warning'
        },
        'attendance': attendance_list
    })

@app.route('/api/attendance/mark', methods=['POST'])
def mark_attendance():
    data = request.get_json() or {}
    course_code = data.get('course_code', '').strip().upper()
    action = data.get('action', 'present').strip().lower()
    date_str = data.get('date', 'Today')

    conn = get_db()
    cursor = conn.cursor()
    target = scoped_student_id(data.get('student_id'))
    if not staff_can_access_student(conn, target):
        conn.close()
        return jsonify({'error': "You don't have access."}), 403
    cursor.execute("SELECT * FROM attendance WHERE course_code = ? AND user_id = ?", (course_code, target))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Course not found in attendance records.'}), 404

    attended = row['attended_hours']
    total = row['total_hours'] + 1
    od = row['od_hours'] or 0

    if action == 'present':
        attended += 1
    elif action == 'od':
        od += 1

    cursor.execute("""
        UPDATE attendance
        SET attended_hours = ?, total_hours = ?, od_hours = ?
        WHERE id = ?
    """, (attended, total, od, row['id']))

    cursor.execute("""
        INSERT INTO attendance_logs (course_code, date, status, marked_by)
        VALUES (?, ?, ?, 'Faculty Portal')
    """, (course_code, date_str, action))

    conn.commit()
    conn.close()

    new_pct = round(((attended + od) / total) * 100, 1)
    return jsonify({
        'message': f'Attendance session logged as {action.upper()} for {course_code}. New rate: {new_pct}%.',
        'percentage': new_pct
    })

# ==========================================================
# MODULE 3: ATTENDANCE CALCULATOR
# ==========================================================

@app.route('/api/attendance/calculate', methods=['POST'])
def calculate_attendance():
    data = request.get_json() or {}
    try:
        total = int(data.get('total_hours') if data.get('total_hours') is not None else data.get('total_classes', 0))
        attended = int(data.get('attended_hours') if data.get('attended_hours') is not None else data.get('attended_classes', 0))
        od = int(data.get('od_hours') if data.get('od_hours') is not None else data.get('od_classes', 0))
    except (ValueError, TypeError):
        total, attended, od = 0, 0, 0

    target = float(data.get('target_percentage', 75.0))
    course_name = data.get('course_name', 'Selected Subject')

    if total < 0 or attended < 0 or od < 0:
        return jsonify({'error': 'Class hours cannot be negative.'}), 400
    if target <= 0 or target > 100:
        return jsonify({'error': 'Target percentage must be between 1 and 100.'}), 400

    effective_attended = attended + od
    if effective_attended > total:
        return jsonify({'error': f'Classes attended ({effective_attended}) cannot exceed total classes conducted ({total}).'}), 400

    if total == 0:
        return jsonify({
            'current_percentage': 0.0,
            'status': 'No Sessions',
            'max_bunks': 0,
            'needed_classes': 0,
            'projected_if_attend_one': 100.0,
            'projected_if_miss_one': 0.0,
            'message': 'No classes conducted yet. Start attending to establish your percentage.'
        })

    current_rate = round((effective_attended / total) * 100, 1)
    target_fraction = target / 100.0
    proj_if_attend_next = round(((effective_attended + 1) / (total + 1)) * 100, 1)
    proj_if_miss_next = round((effective_attended / (total + 1)) * 100, 1)

    if current_rate >= target:
        max_bunks = max(0, int((effective_attended / target_fraction) - total))
        proj_after_bunks = round((effective_attended / (total + max_bunks)) * 100, 1) if max_bunks > 0 else current_rate
        return jsonify({
            'course_name': course_name,
            'total_conducted': total,
            'classes_attended': effective_attended,
            'target_percentage': target,
            'current_percentage': current_rate,
            'status': 'Eligible',
            'max_bunks': max_bunks,
            'can_bunk': max_bunks,
            'needed_classes': 0,
            'projected_if_miss_one': proj_if_miss_next,
            'projected_if_attend_one': proj_if_attend_next,
            'projected_after_all_bunks': proj_after_bunks,
            'message': f'You are safely above {target}% ({current_rate}%). You can miss up to {max_bunks} consecutive classes.'
        })
    else:
        needed = max(1, math.ceil((target_fraction * total - effective_attended) / (1.0 - target_fraction)))
        proj_after_recovery = round(((effective_attended + needed) / (total + needed)) * 100, 1)
        return jsonify({
            'course_name': course_name,
            'total_conducted': total,
            'classes_attended': effective_attended,
            'target_percentage': target,
            'current_percentage': current_rate,
            'status': 'Shortage',
            'max_bunks': 0,
            'needed_classes': needed,
            'projected_if_miss_one': proj_if_miss_next,
            'projected_if_attend_one': proj_if_attend_next,
            'projected_after_recovery': proj_after_recovery,
            'message': f'Attendance shortage alert ({current_rate}% < {target}%). You must attend the next {needed} consecutive classes.'
        })

# ==========================================================
# MODULE 4: TIMETABLE MANAGEMENT (DAILY, WEEKLY, ADMIN CRUD)
# ==========================================================

@app.route('/api/timetable', methods=['GET'])
def get_timetable():
    view_type = request.args.get('view', 'daily')
    day = int(request.args.get('day', 1))

    conn = get_db()
    cursor = conn.cursor()

    if view_type == 'weekly':
        cursor.execute("SELECT * FROM timetable ORDER BY day_of_week ASC, start_time ASC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({'view': 'weekly', 'schedule': rows})
    else:
        cursor.execute("SELECT * FROM timetable WHERE day_of_week = ? ORDER BY start_time ASC", (day,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({'view': 'daily', 'day': day, 'schedule': rows})

@app.route('/api/timetable', methods=['POST'])
def add_timetable_entry():
    data = request.get_json() or {}
    day = int(data.get('day_of_week', 1))
    start_time = data.get('start_time', '').strip()
    end_time = data.get('end_time', '').strip()
    course_code = data.get('course_code', '').strip().upper()
    course_title = data.get('course_title', '').strip()
    room = data.get('room', '').strip()
    faculty_name = data.get('faculty_name', '').strip()

    if not start_time or not end_time or not course_code or not course_title or not room:
        return jsonify({'error': 'All timetable entry fields are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO timetable (day_of_week, start_time, end_time, course_code, course_title, room, faculty_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (day, start_time, end_time, course_code, course_title, room, faculty_name))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({'message': 'Timetable entry added successfully.', 'id': new_id}), 201

@app.route('/api/timetable/<int:entry_id>', methods=['PUT'])
def update_timetable_entry(entry_id):
    data = request.get_json() or {}
    day = int(data.get('day_of_week', 1))
    start_time = data.get('start_time', '').strip()
    end_time = data.get('end_time', '').strip()
    course_code = data.get('course_code', '').strip().upper()
    course_title = data.get('course_title', '').strip()
    room = data.get('room', '').strip()
    faculty_name = data.get('faculty_name', '').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE timetable
        SET day_of_week = ?, start_time = ?, end_time = ?, course_code = ?, course_title = ?, room = ?, faculty_name = ?
        WHERE id = ?
    """, (day, start_time, end_time, course_code, course_title, room, faculty_name, entry_id))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Timetable entry #{entry_id} updated successfully.'})

@app.route('/api/timetable/<int:entry_id>', methods=['DELETE'])
def delete_timetable_entry(entry_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timetable WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Timetable entry #{entry_id} removed.'})

# ==========================================================
# MODULE 5: ASSIGNMENT TRACKER (FACULTY CREATION, STUDENT UPLOAD, EVALUATION)
# ==========================================================

@app.route('/api/assignments', methods=['GET'])
def get_assignments():
    subject = request.args.get('subject', '').strip().upper()
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT a.id, a.course_code, a.course_title, a.title, a.description, a.deadline_date, a.max_marks, a.created_by,
               s.id as submission_id,
               COALESCE(s.status, 'Pending') as submission_status,
               s.file_name, s.submitted_at, s.scored_marks, s.feedback, s.evaluated_by
        FROM assignments a
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ?
    """
    params = [scoped_student_id(request.args.get('student_id'))]
    if subject:
        query += " WHERE a.course_code = ?"
        params.append(subject)
    query += " ORDER BY a.deadline_date ASC"

    cursor.execute(query, params)
    rows = []
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    for r in cursor.fetchall():
        item = dict(r)
        # Mark Late if past deadline and not submitted
        if item['submission_status'] == 'Pending' and item['deadline_date'] < now_str:
            item['submission_status'] = 'Late'
        rows.append(item)

    conn.close()
    return jsonify({'assignments': rows})

@app.route('/api/assignments', methods=['POST'])
def create_assignment():
    data = request.get_json() or {}
    course_code = data.get('course_code', '').strip().upper()
    course_title = data.get('course_title', '').strip()
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    deadline = data.get('deadline_date', '').strip()
    max_marks = int(data.get('max_marks', 25))
    created_by = data.get('created_by', 'Course Faculty')

    if not course_code or not title or not deadline:
        return jsonify({'error': 'Course, title, and deadline are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO assignments (course_code, course_title, title, description, deadline_date, max_marks, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (course_code, course_title, title, description, deadline, max_marks, created_by))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({'message': f'Assignment "{title}" published.', 'id': new_id}), 201

@app.route('/api/assignments/<int:assignment_id>/upload', methods=['POST'])
def upload_assignment_submission(assignment_id):
    student_name = g.user['name']
    student_id = uid()

    file = request.files.get('file')
    filename = None
    filepath = None

    if file and file.filename:
        filename = secure_filename(file.filename)
        filepath = os.path.join(ASSIGNMENTS_UPLOAD_DIR, f"{student_id}_{int(datetime.now().timestamp())}_{filename}")
        file.save(filepath)
    else:
        filename = 'assignment_solution.pdf'

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT deadline_date FROM assignments WHERE id = ?", (assignment_id,))
    assig = cursor.fetchone()
    if not assig:
        conn.close()
        return jsonify({'error': 'Assignment not found.'}), 404

    status = 'Late' if now_str > assig['deadline_date'] else 'Submitted'

    cursor.execute("DELETE FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?", (assignment_id, student_id))
    cursor.execute("""
        INSERT INTO assignment_submissions (assignment_id, student_id, student_name, file_name, file_path, submitted_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (assignment_id, student_id, student_name, filename, filepath or filename, now_str, status))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Assignment file "{filename}" submitted successfully. Status: {status}.'})

@app.route('/api/assignments/<int:assignment_id>/submissions', methods=['GET'])
def list_assignment_submissions(assignment_id):
    """Staff: submissions for one assignment, limited to students in the teacher's classes."""
    conn = get_db()
    rows = conn.execute("""
        SELECT s.id, s.student_id, s.student_name, s.file_name, s.submitted_at, s.status, s.scored_marks, s.feedback,
               u.identifier AS usn, u.department, u.semester
        FROM assignment_submissions s JOIN users u ON u.id = s.student_id
        WHERE s.assignment_id = ?
        ORDER BY s.submitted_at DESC
    """, (assignment_id,)).fetchall()
    out = [dict(r) for r in rows if staff_can_access_student(conn, r['student_id'])]
    conn.close()
    return jsonify({'submissions': out})

@app.route('/api/assignments/<int:assignment_id>/evaluate', methods=['POST'])
def evaluate_assignment(assignment_id):
    data = request.get_json() or {}
    scored_marks = int(data.get('scored_marks', 0))
    feedback = data.get('feedback', '').strip()
    evaluated_by = g.user['name']
    try:
        target = int(data.get('student_id'))
    except (TypeError, ValueError):
        return jsonify({'error': 'student_id is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    if not staff_can_access_student(conn, target):
        conn.close()
        return jsonify({'error': "You don't have access."}), 403
    cursor.execute("""
        UPDATE assignment_submissions
        SET scored_marks = ?, feedback = ?, evaluated_by = ?
        WHERE assignment_id = ? AND student_id = ?
    """, (scored_marks, feedback, evaluated_by, assignment_id, target))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Submission evaluated. Scored: {scored_marks} points.'})

# ==========================================================
# MODULE 6: NOTES AND STUDY MATERIALS (UPLOAD, DOWNLOAD, FILTERS)
# ==========================================================

@app.route('/api/notes', methods=['GET'])
def get_study_materials():
    subject = request.args.get('subject', '').strip().upper()
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM study_materials WHERE 1=1"
    params = []

    if subject and subject != 'ALL':
        query += " AND course_code = ?"
        params.append(subject)

    if category and category != 'ALL':
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(course_title) LIKE ? OR LOWER(uploaded_by) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    materials = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({'materials': materials})

@app.route('/api/notes/upload', methods=['POST'])
def upload_study_material():
    course_code = request.form.get('course_code', '').strip().upper()
    course_title = request.form.get('course_title', '').strip()
    title = request.form.get('title', '').strip()
    category = request.form.get('category', 'Lecture Notes').strip()
    uploaded_by = request.form.get('uploaded_by', 'Faculty Member').strip()

    file = request.files.get('file')
    if not file or not file.filename:
        return jsonify({'error': 'Valid document file is required.'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(NOTES_UPLOAD_DIR, filename)
    file.save(filepath)

    ext = os.path.splitext(filename)[1].replace('.', '').upper() or 'PDF'
    size_mb = f"{round(os.path.getsize(filepath) / (1024 * 1024), 2)} MB"
    upload_date = datetime.now().strftime("%Y-%m-%d")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO study_materials (course_code, course_title, title, category, file_format, file_name, file_size, uploaded_by, upload_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (course_code, course_title, title, category, ext, filename, size_mb, uploaded_by, upload_date))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({'message': f'Study material "{title}" uploaded.', 'id': new_id}), 201

@app.route('/api/notes/<int:note_id>/download', methods=['GET'])
def download_study_material(note_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM study_materials WHERE id = ?", (note_id,))
    note = cursor.fetchone()

    if not note:
        conn.close()
        return jsonify({'error': 'Study material not found.'}), 404

    cursor.execute("UPDATE study_materials SET downloads_count = downloads_count + 1 WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()

    filename = note['file_name']
    target_path = os.path.join(NOTES_UPLOAD_DIR, filename)
    if not os.path.exists(target_path):
        # Create lightweight placeholder file if physical file missing
        with open(target_path, 'w', encoding='utf-8') as f:
            f.write(f"%PDF-1.4\nAcademic Material: {note['title']}\nCourse: {note['course_code']}\n")

    return send_from_directory(NOTES_UPLOAD_DIR, filename, as_attachment=True)

# ==========================================================
# MODULE 7: EXAMINATION MANAGEMENT (TIMETABLE, HALL TICKET, REVALUATION)
# ==========================================================

@app.route('/api/examinations', methods=['GET'])
def get_examinations():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM examinations ORDER BY exam_date ASC")
    exams = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM hall_ticket_status WHERE semester = 6 LIMIT 1")
    ht_row = cursor.fetchone()
    hall_ticket = dict(ht_row) if ht_row else {
        'is_published': 1,
        'published_date': '2026-11-01',
        'exam_cycle': 'November/December 2026 Regular SEE'
    }

    # Student exam registration details
    prof = profile_row(cursor)
    profile = dict(prof) if prof else {
        'name': g.user['name'], 'usn': g.user['identifier'],
        'department': g.user['department'], 'semester': g.user['semester'],
    }

    registration_details = {
        'candidate_name': profile['name'],
        'usn': profile['usn'],
        'department': profile['department'],
        'semester': profile['semester'],
        'exam_center': 'Center 01: Main Science & Engg Complex',
        'seat_status': 'Verified & Allotted'
    }

    conn.close()
    return jsonify({
        'examinations': exams,
        'hall_ticket': hall_ticket,
        'registration': registration_details
    })

@app.route('/api/examinations/hall-ticket/publish', methods=['POST'])
def toggle_hall_ticket_publish():
    data = request.get_json() or {}
    publish_status = int(data.get('is_published', 1))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE hall_ticket_status
        SET is_published = ?, published_date = CURRENT_DATE
        WHERE semester = 6
    """, (publish_status,))
    conn.commit()
    conn.close()

    status_label = 'Published' if publish_status == 1 else 'Unpublished'
    return jsonify({'message': f'Hall ticket status updated to {status_label}.'})

@app.route('/api/examinations/revaluation', methods=['GET', 'POST'])
def handle_revaluation():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        student_name = g.user['name']
        usn = g.user['identifier']
        course_code = data.get('course_code', '').strip().upper()
        app_type = data.get('application_type', 'Re-evaluation')
        applied_date = datetime.now().strftime("%Y-%m-%d")

        cursor.execute("""
            INSERT INTO revaluations (student_name, usn, course_code, application_type, fee_status, status, remarks, applied_date)
            VALUES (?, ?, ?, ?, 'Paid', 'Under Review', 'Application lodged with Examination Board.', ?)
        """, (student_name, usn, course_code, app_type, applied_date))
        conn.commit()
        conn.close()
        return jsonify({'message': f'Revaluation request submitted for {course_code}. Tracking status: Under Review.'}), 201

    if is_staff():
        cursor.execute("SELECT * FROM revaluations ORDER BY id DESC")
    else:
        cursor.execute("SELECT * FROM revaluations WHERE usn = ? ORDER BY id DESC", (g.user['identifier'],))
    records = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'revaluations': records})

# ==========================================================
# MODULE 8: SGPA AND CGPA CALCULATOR & ACADEMIC HISTORY
# ==========================================================

GRADE_POINT_MAP = {
    'O': 10.0,
    'A+': 9.0,
    'A': 8.0,
    'B+': 7.0,
    'B': 6.0,
    'C': 5.0,
    'P': 4.0,
    'F': 0.0
}

@app.route('/api/gpa/calculate-sgpa', methods=['POST'])
def api_calculate_sgpa():
    data = request.get_json() or {}
    courses = data.get('courses') or data.get('subjects') or []
    if not courses:
        return jsonify({'error': 'Please provide at least one course with credits and grade point.'}), 400

    processed_courses = []
    total_credits = 0.0
    total_credit_points = 0.0

    for i, c in enumerate(courses, start=1):
        name = str(c.get('name') or c.get('subject_name') or f'Subject {i}').strip()
        try:
            credits = float(c.get('credits', 0))
        except (ValueError, TypeError):
            return jsonify({'error': f'Invalid credits for course "{name}". Must be a numeric value.'}), 400

        if credits <= 0 or credits > 10:
            return jsonify({'error': f'Course "{name}" credits must be between 1 and 10.'}), 400

        raw_gp = c.get('grade_point')
        if raw_gp is not None and str(raw_gp).strip() != '':
            try:
                gp = float(raw_gp)
            except (ValueError, TypeError):
                return jsonify({'error': f'Invalid grade point for course "{name}". Must be between 0.0 and 10.0.'}), 400
        else:
            letter = str(c.get('grade', 'A')).strip().upper()
            gp = GRADE_POINT_MAP.get(letter, 8.0)

        if gp < 0.0 or gp > 10.0:
            return jsonify({'error': f'Grade point for "{name}" must be between 0.0 and 10.0.'}), 400

        credit_points = round(credits * gp, 2)
        total_credits += credits
        total_credit_points += credit_points

        letter_match = 'Custom'
        for k, v in GRADE_POINT_MAP.items():
            if abs(v - gp) < 0.01:
                letter_match = k
                break

        processed_courses.append({
            'subject_name': name,
            'credits': credits,
            'grade_point': gp,
            'letter_grade': letter_match,
            'credit_points': credit_points
        })

    if total_credits <= 0:
        return jsonify({'error': 'Total credits across courses must be greater than zero.'}), 400

    sgpa = round(total_credit_points / total_credits, 2)

    return jsonify({
        'sgpa': sgpa,
        'total_credits': total_credits,
        'total_credit_points': round(total_credit_points, 2),
        'courses': processed_courses,
        'formula': f"SGPA = Sum of (Credit × Grade Point) / Total Credits = {total_credit_points:.2f} / {total_credits:.1f} = {sgpa:.2f}"
    })

@app.route('/api/gpa/calculate-cgpa', methods=['POST'])
def api_calculate_cgpa():
    data = request.get_json() or {}
    semesters = data.get('semesters', [])
    if not semesters:
        return jsonify({'error': 'Please provide at least one semester record to compute CGPA.'}), 400

    processed_sems = []
    total_credits_across_semesters = 0.0
    sum_credit_x_sgpa = 0.0

    for s in semesters:
        sem_num = s.get('semester', len(processed_sems) + 1)
        try:
            credits = float(s.get('credits', s.get('total_credits', 0)))
            sgpa = float(s.get('sgpa', 0))
        except (ValueError, TypeError):
            return jsonify({'error': f'Invalid numeric values in Semester {sem_num}.'}), 400

        if credits <= 0:
            return jsonify({'error': f'Semester {sem_num} credits must be greater than zero.'}), 400
        if sgpa < 0.0 or sgpa > 10.0:
            return jsonify({'error': f'Semester {sem_num} SGPA must be between 0.0 and 10.0.'}), 400

        credit_pts = round(credits * sgpa, 2)
        total_credits_across_semesters += credits
        sum_credit_x_sgpa += credit_pts

        processed_sems.append({
            'semester': sem_num,
            'total_credits': credits,
            'sgpa': sgpa,
            'semester_grade_points': credit_pts
        })

    if total_credits_across_semesters <= 0:
        return jsonify({'error': 'Total credits across all semesters must be greater than zero.'}), 400

    cgpa = round(sum_credit_x_sgpa / total_credits_across_semesters, 2)

    return jsonify({
        'cgpa': cgpa,
        'total_credits_across_semesters': total_credits_across_semesters,
        'total_credit_points': round(sum_credit_x_sgpa, 2),
        'semesters': processed_sems,
        'formula': f"CGPA = Sum of (Semester Credit × Semester Grade Points) / Total Credits Across Semesters = {sum_credit_x_sgpa:.2f} / {total_credits_across_semesters:.1f} = {cgpa:.2f}"
    })

@app.route('/api/gpa/history', methods=['GET'])
def get_gpa_history():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, semester, total_credits, total_credit_points, sgpa, subjects_json, created_at
        FROM semester_gpa_history
        WHERE student_id = ?
        ORDER BY semester ASC
    """, (uid(),))
    rows = cursor.fetchall()

    history = []
    cumulative_points = 0.0
    cumulative_credits = 0.0

    for r in rows:
        item = dict(r)
        try:
            item['subjects'] = json.loads(item['subjects_json'])
        except Exception:
            item['subjects'] = []

        cumulative_points += item['total_credit_points']
        cumulative_credits += item['total_credits']
        running_cgpa = round(cumulative_points / cumulative_credits, 2) if cumulative_credits > 0 else 0.0
        item['cumulative_cgpa'] = running_cgpa
        history.append(item)

    overall_cgpa = round(cumulative_points / cumulative_credits, 2) if cumulative_credits > 0 else 0.0

    conn.close()
    return jsonify({
        'history': history,
        'overall_cgpa': overall_cgpa,
        'total_credits_earned': cumulative_credits,
        'total_credit_points': round(cumulative_points, 2),
        'total_semesters': len(history)
    })

@app.route('/api/gpa/save-semester', methods=['POST'])
def save_gpa_semester():
    data = request.get_json() or {}
    semester = int(data.get('semester', 6))
    courses = data.get('courses', [])

    if not courses:
        return jsonify({'error': 'Cannot save empty semester. Please provide courses.'}), 400

    total_credits = 0.0
    total_credit_points = 0.0
    clean_courses = []

    for c in courses:
        name = str(c.get('name') or c.get('subject_name') or 'Subject').strip()
        try:
            credits = float(c.get('credits', 4))
        except Exception:
            credits = 4.0
        if credits <= 0:
            credits = 1.0

        raw_gp = c.get('grade_point')
        if raw_gp is not None and str(raw_gp).strip() != '':
            try:
                gp = float(raw_gp)
            except Exception:
                gp = 8.0
        else:
            gp = GRADE_POINT_MAP.get(str(c.get('grade', 'A')).strip().upper(), 8.0)

        cp = round(credits * gp, 2)
        total_credits += credits
        total_credit_points += cp

        letter_match = 'Custom'
        for k, v in GRADE_POINT_MAP.items():
            if abs(v - gp) < 0.01:
                letter_match = k
                break

        clean_courses.append({
            'subject_name': name,
            'credits': credits,
            'grade_point': gp,
            'letter_grade': letter_match,
            'credit_points': cp
        })

    sgpa = round(total_credit_points / total_credits, 2) if total_credits > 0 else 0.0
    subjects_json = json.dumps(clean_courses)

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM semester_gpa_history WHERE student_id = ? AND semester = ?", (uid(), semester))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE semester_gpa_history
            SET total_credits = ?, total_credit_points = ?, sgpa = ?, subjects_json = ?, created_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (total_credits, total_credit_points, sgpa, subjects_json, existing['id']))
    else:
        cursor.execute("""
            INSERT INTO semester_gpa_history (student_id, semester, total_credits, total_credit_points, sgpa, subjects_json)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (uid(), semester, total_credits, total_credit_points, sgpa, subjects_json))

    # Recalculate student overall CGPA
    cursor.execute("SELECT SUM(total_credits) as cum_credits, SUM(total_credit_points) as cum_points FROM semester_gpa_history WHERE student_id = ?", (uid(),))
    agg = cursor.fetchone()
    cum_cgpa = 0.0
    if agg and agg['cum_credits'] and agg['cum_credits'] > 0:
        cum_cgpa = round(agg['cum_points'] / agg['cum_credits'], 2)
        cursor.execute("UPDATE student_profiles SET cgpa = ?, credits_earned = ? WHERE user_id = ?", (cum_cgpa, int(agg['cum_credits']), uid()))

    conn.commit()
    conn.close()

    return jsonify({
        'message': f'Semester {semester} academic record saved successfully. Calculated SGPA: {sgpa}, Updated Overall CGPA: {cum_cgpa}.',
        'sgpa': sgpa,
        'cumulative_cgpa': cum_cgpa,
        'semester': semester
    }), 201

@app.route('/api/gpa/history/<int:record_id>', methods=['DELETE'])
def delete_gpa_record(record_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM semester_gpa_history WHERE id = ? AND student_id = ?", (record_id, uid()))

    cursor.execute("SELECT SUM(total_credits) as cum_credits, SUM(total_credit_points) as cum_points FROM semester_gpa_history WHERE student_id = ?", (uid(),))
    agg = cursor.fetchone()
    cum_cgpa = 0.0
    if agg and agg['cum_credits'] and agg['cum_credits'] > 0:
        cum_cgpa = round(agg['cum_points'] / agg['cum_credits'], 2)
        cursor.execute("UPDATE student_profiles SET cgpa = ?, credits_earned = ? WHERE user_id = ?", (cum_cgpa, int(agg['cum_credits']), uid()))
    else:
        cursor.execute("UPDATE student_profiles SET cgpa = 0.0 WHERE user_id = ?", (uid(),))

    conn.commit()
    conn.close()
    return jsonify({'message': f'Semester record #{record_id} deleted from academic history.'})

# ==========================================================
# MODULE 9: STUDENT PROFILE AND DIGITAL ID
# ==========================================================

@app.route('/api/profile', methods=['GET', 'PUT'])
def handle_profile():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.get_json() or {}
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip()
        emergency_contact = data.get('emergency_contact', '').strip()
        blood_group = data.get('blood_group', '').strip()
        address = data.get('address', '').strip()
        photo_url = data.get('photo_url', '').strip()

        if email and '@' not in email:
            return jsonify({'error': 'Please provide a valid email address.'}), 400

        is_admin = g.user['role'] == 'admin'
        admin_department = data.get('department') if is_admin else None
        admin_semester = data.get('semester') if is_admin else None
        admin_section = data.get('section') if is_admin else None
        admin_college = data.get('college_name') if is_admin else None

        query = """
            UPDATE student_profiles
            SET phone = COALESCE(NULLIF(?, ''), phone),
                email = COALESCE(NULLIF(?, ''), email),
                emergency_contact = COALESCE(NULLIF(?, ''), emergency_contact),
                blood_group = COALESCE(NULLIF(?, ''), blood_group),
                address = COALESCE(NULLIF(?, ''), address),
                photo_url = COALESCE(NULLIF(?, ''), photo_url)
        """
        params = [phone, email, emergency_contact, blood_group, address, photo_url]

        if admin_department:
            query += ", department = ?"
            params.append(admin_department)
        if admin_semester:
            query += ", semester = ?"
            params.append(int(admin_semester))
        if admin_section:
            query += ", section = ?"
            params.append(admin_section)
        if admin_college:
            query += ", college_name = ?"
            params.append(admin_college)

        query += " WHERE user_id = ?"
        params.append(uid())
        cursor.execute(query, params)
        conn.commit()

    cursor.execute("SELECT * FROM student_profiles WHERE user_id = ?", (uid(),))
    row = cursor.fetchone()

    profile = dict(row) if row else {}
    conn.close()
    return jsonify({'profile': profile})

@app.route('/api/profile/onboarding', methods=['POST'])
def student_onboarding():
    data = request.get_json() or {}
    user_id = uid()
    name = (data.get('name') or g.user.get('name') or '').strip()
    usn = (data.get('usn') or g.user.get('identifier') or '').strip().upper()
    department = (data.get('department') or g.user.get('department') or 'Computer Science & Engineering').strip()
    section = (data.get('section') or 'A').strip().upper()
    dob = (data.get('dob') or '').strip()
    try:
        semester = int(data.get('semester', 6))
    except (ValueError, TypeError):
        semester = 6
    try:
        admission_year = int(data.get('admission_year') or 2021)
    except (ValueError, TypeError):
        admission_year = 2021
    academic_year = (data.get('academic_year') or '3rd Year').strip()
    phone = (data.get('phone') or '').strip()
    emergency_contact = (data.get('emergency_contact') or '+91 98765 43210').strip()
    blood_group = (data.get('blood_group') or 'O+').strip()

    if not name or not usn:
        return jsonify({'error': 'Full name and USN are required.'}), 400

    conn = get_db()
    try:
        conn.execute(
            """UPDATE users
               SET name = ?, identifier = ?, department = ?, semester = ?, onboarding_completed = TRUE
               WHERE id = ?""",
            (name, usn, department, semester, user_id)
        )

        existing = conn.execute("SELECT id FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        if existing:
            conn.execute(
                """UPDATE student_profiles
                   SET name = ?, usn = ?, department = ?, section = ?, dob = ?, semester = ?,
                       admission_year = ?, academic_year = ?, phone = COALESCE(NULLIF(?, ''), phone),
                       emergency_contact = COALESCE(NULLIF(?, ''), emergency_contact),
                       blood_group = ?
                   WHERE user_id = ?""",
                (name, usn, department, section, dob, semester, admission_year, academic_year, phone, emergency_contact, blood_group, user_id)
            )
        else:
            conn.execute(
                """INSERT INTO student_profiles
                   (user_id, usn, name, department, college_name, semester, section, dob, admission_year, academic_year, phone, emergency_contact, blood_group, email)
                   VALUES (?, ?, ?, ?, 'MS Engineering College', ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, usn, name, department, semester, section, dob, admission_year, academic_year, phone, emergency_contact, blood_group, g.user.get('email', ''))
            )
        conn.commit()

        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        prof_row = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        from auth.users import public_user
        fresh_user = public_user(conn, user_row) if user_row else dict(g.user)
        fresh_user['profile'] = dict(prof_row) if prof_row else {}
    finally:
        conn.close()

    return jsonify({'message': 'Student profile details successfully registered.', 'user': fresh_user})

@app.route('/api/profile/photo', methods=['POST'])
def upload_profile_photo():
    file = request.files.get('photo')
    if not file or not file.filename:
        return jsonify({'error': 'No file uploaded.'}), 400

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.svg']:
        return jsonify({'error': 'Invalid image format. Allowed formats: PNG, JPG, JPEG, WEBP, SVG.'}), 400

    saved_filename = f"student_{uid()}_{int(datetime.now().timestamp())}{ext}"
    filepath = os.path.join(PROFILES_UPLOAD_DIR, saved_filename)
    file.save(filepath)

    photo_url = f"/uploads/profiles/{saved_filename}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE student_profiles SET photo_url = ? WHERE user_id = ?", (photo_url, uid()))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Profile photograph updated successfully.', 'photo_url': photo_url})

@app.route('/api/profile/digital-id', methods=['GET'])
def get_digital_id():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_profiles WHERE user_id = ?", (uid(),))
    row = cursor.fetchone()

    profile = dict(row) if row else {}
    conn.close()

    college = profile.get('college_name', 'Apex Institute of Engineering & Technology')
    usn = profile.get('usn', g.user['identifier'])
    name = profile.get('name', g.user['name'])
    dept = profile.get('department', 'Computer Science & Engineering')
    sem = profile.get('semester', 6)
    sec = profile.get('section', 'A')
    degree = profile.get('degree', 'Bachelor of Engineering (B.E.)')
    blood = profile.get('blood_group', 'O+')
    em_contact = profile.get('emergency_contact', '+91 98765 43210')
    valid_thru = profile.get('valid_thru', 'June 2027')
    status = profile.get('academic_status', 'Good Standing / Regular')

    # Construct strictly permitted student verification payload (CRITICAL: Zero sensitive passwords or keys)
    qr_text = (
        f"INSTITUTION: {college}\n"
        f"OFFICIAL DIGITAL STUDENT CREDENTIAL\n"
        f"USN: {usn}\n"
        f"NAME: {name}\n"
        f"DEGREE: {degree}\n"
        f"DEPARTMENT: {dept}\n"
        f"SEMESTER: {sem} (Section {sec})\n"
        f"BLOOD GROUP: {blood}\n"
        f"EMERGENCY CONTACT: {em_contact}\n"
        f"VALID THRU: {valid_thru}\n"
        f"STATUS: {status}\n"
        f"SECURITY NOTICE: Public credential verification. No sensitive credentials exposed."
    )

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2
    )
    qr.add_data(qr_text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_base64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    return jsonify({
        'digital_id': {
            'college_name': college,
            'usn': usn,
            'name': name,
            'department': dept,
            'semester': sem,
            'section': sec,
            'degree': degree,
            'blood_group': blood,
            'emergency_contact': em_contact,
            'valid_thru': valid_thru,
            'academic_status': status,
            'photo_url': profile.get('photo_url', '/uploads/profiles/default_student.png'),
            'email': profile.get('email', 'student@college.edu'),
            'phone': profile.get('phone', '+91 98765 43210'),
            'address': profile.get('address', 'Campus Hostel, Tech Road'),
            'admission_year': profile.get('admission_year', 2021),
            'credits_earned': profile.get('credits_earned', 128),
            'cgpa': profile.get('cgpa', 9.19)
        },
        'qr_code_image': qr_base64,
        'qr_payload_text': qr_text,
        'generated_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

@app.route('/api/profile/verify/<string:usn>', methods=['GET'])
def verify_student_credential(usn):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_profiles WHERE usn = ?", (usn.strip().upper(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({
            'verified': False,
            'error': f'No verified student profile matches USN "{usn}".'
        }), 404

    profile = dict(row)
    return jsonify({
        'verified': True,
        'verification_source': 'Apex Institute Official Registrar Registry',
        'student': {
            'usn': profile['usn'],
            'name': profile['name'],
            'department': profile['department'],
            'college_name': profile.get('college_name', 'Apex Institute of Engineering & Technology'),
            'degree': profile.get('degree', 'Bachelor of Engineering (B.E.)'),
            'semester': profile['semester'],
            'section': profile['section'],
            'blood_group': profile.get('blood_group', 'O+'),
            'academic_status': profile.get('academic_status', 'Good Standing / Regular'),
            'valid_thru': profile.get('valid_thru', 'June 2027'),
            'photo_url': profile.get('photo_url', '/uploads/profiles/default_student.png')
        },
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

# ==========================================================
# MODULE 10: PLACEMENT AND CAREER
# ==========================================================

@app.route('/api/placements/drives', methods=['GET', 'POST'])
def handle_placement_drives():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        company = data.get('company_name', '').strip()
        title = data.get('job_title', '').strip()
        job_type = data.get('job_type', 'Full-time').strip()
        ctc = data.get('ctc_or_stipend', '').strip()
        location = data.get('location', '').strip()
        desc = data.get('description', '').strip()
        min_cgpa = float(data.get('min_cgpa', 7.0))
        branches = data.get('eligible_branches', 'All Branches').strip()
        skills = data.get('required_skills', '').strip()
        deadline = data.get('deadline_date', '').strip()
        drive_date = data.get('drive_date', '').strip()

        if not company or not title or not ctc:
            return jsonify({'error': 'Company name, job title, and CTC/stipend are required.'}), 400

        cursor.execute("""
            INSERT INTO placement_drives (company_name, job_title, job_type, ctc_or_stipend, location, description, min_cgpa, eligible_branches, required_skills, deadline_date, drive_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')
        """, (company, title, job_type, ctc, location, desc, min_cgpa, branches, skills, deadline, drive_date))
        conn.commit()
        drive_id = cursor.lastrowid
        conn.close()
        return jsonify({'message': f'Placement drive for {company} published.', 'id': drive_id}), 201

    drive_type = request.args.get('type', 'all').lower()
    search = request.args.get('search', '').strip().lower()

    query = "SELECT * FROM placement_drives WHERE 1=1"
    params = []
    if drive_type == 'fulltime':
        query += " AND LOWER(job_type) = 'full-time'"
    elif drive_type == 'internship':
        query += " AND LOWER(job_type) = 'internship'"

    if search:
        query += " AND (LOWER(company_name) LIKE ? OR LOWER(job_title) LIKE ? OR LOWER(required_skills) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY deadline_date ASC"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT drive_id, status, applied_date FROM placement_applications WHERE student_id = ?", (uid(),))
    app_map = {r['drive_id']: dict(r) for r in cursor.fetchall()}

    for row in rows:
        app_info = app_map.get(row['id'])
        row['has_applied'] = bool(app_info)
        row['application_status'] = app_info['status'] if app_info else 'Not Applied'
        row['applied_date'] = app_info['applied_date'] if app_info else None

    conn.close()
    return jsonify({'drives': rows})

@app.route('/api/placements/apply', methods=['POST'])
def apply_placement_drive():
    data = request.get_json() or {}
    drive_id = data.get('drive_id')
    resume_name = data.get('resume_name', 'alex_kumar_resume.pdf')
    resume_path = data.get('resume_path', 'resumes/alex_kumar_resume.pdf')

    if not drive_id:
        return jsonify({'error': 'Drive ID is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM placement_drives WHERE id = ?", (drive_id,))
    drive = cursor.fetchone()
    if not drive:
        conn.close()
        return jsonify({'error': 'Placement drive not found.'}), 404

    cursor.execute("SELECT * FROM student_profiles WHERE user_id = ?", (uid(),))
    prof = cursor.fetchone()
    student_cgpa = prof['cgpa'] if prof else 9.36
    student_name = prof['name'] if prof else g.user['name']
    student_usn = prof['usn'] if prof else g.user['identifier']

    cursor.execute("SELECT id FROM placement_applications WHERE drive_id = ? AND student_id = ?", (drive_id, uid()))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'You have already submitted an application for this drive.'}), 400

    applied_date = datetime.now().strftime("%Y-%m-%d %H:%M")
    cursor.execute("""
        INSERT INTO placement_applications (drive_id, student_id, student_name, usn, cgpa, resume_name, resume_path, status, applied_date, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Applied', ?, 'Application received and logged in placement portal.')
    """, (drive_id, uid(), student_name, student_usn, student_cgpa, resume_name, resume_path, applied_date))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Application successfully submitted for {drive["company_name"]} - {drive["job_title"]}.', 'status': 'Applied'}), 201

@app.route('/api/placements/applications', methods=['GET'])
def get_placement_applications():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.drive_id, a.student_name, a.usn, a.cgpa, a.resume_name, a.status, a.applied_date, a.remarks,
               d.company_name, d.job_title, d.job_type, d.ctc_or_stipend, d.location, d.drive_date
        FROM placement_applications a
        JOIN placement_drives d ON d.id = a.drive_id
        WHERE (? = 1 OR a.student_id = ?)
        ORDER BY a.id DESC
    """, (1 if is_staff() else 0, uid()))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'applications': rows})

@app.route('/api/placements/applications/<int:app_id>/status', methods=['PUT'])
def update_application_status(app_id):
    data = request.get_json() or {}
    new_status = data.get('status', 'Applied').strip()
    remarks = data.get('remarks', '').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE placement_applications
        SET status = ?, remarks = ?
        WHERE id = ?
    """, (new_status, remarks, app_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Application #{app_id} status updated to {new_status}.'})

@app.route('/api/placements/resumes', methods=['GET'])
def get_student_resumes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_resumes WHERE student_id = ? ORDER BY id DESC", (uid(),))
    resumes = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'resumes': resumes})

@app.route('/api/placements/resumes/upload', methods=['POST'])
def upload_student_resume():
    file = request.files.get('resume')
    title = request.form.get('title', 'Academic Resume')
    if not file or not file.filename:
        return jsonify({'error': 'No resume file selected.'}), 400

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.pdf', '.docx', '.doc']:
        return jsonify({'error': 'Allowed resume formats: PDF, DOCX, DOC.'}), 400

    saved_filename = f"resume_1_{int(datetime.now().timestamp())}_{filename}"
    file_path = os.path.join(RESUMES_UPLOAD_DIR, saved_filename)
    file.save(file_path)

    relative_path = f"resumes/{saved_filename}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO student_resumes (student_id, title, file_name, file_path, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
    """, (uid(), title, filename, relative_path, now_str))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({'message': 'Resume uploaded successfully.', 'id': new_id, 'file_name': filename, 'file_path': relative_path}), 201

@app.route('/api/placements/resumes/<int:resume_id>/download', methods=['GET'])
def download_resume(resume_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_resumes WHERE id = ?", (resume_id,))
    res = cursor.fetchone()
    allowed = bool(res) and (res['student_id'] == uid() or staff_can_access_student(conn, res['student_id']))
    conn.close()

    if not res or not allowed:
        return jsonify({'error': 'Resume not found.'}), 404

    filename = os.path.basename(res['file_path'])
    return send_from_directory(RESUMES_UPLOAD_DIR, filename, as_attachment=True)

@app.route('/api/placements/resume-builder', methods=['GET', 'POST'])
def handle_resume_builder():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        full_name = data.get('full_name', g.user['name'])
        email = data.get('email', 'student@college.edu')
        phone = data.get('phone', '+91 98765 43210')
        headline = data.get('headline', '')
        summary = data.get('summary', '')
        education = json.dumps(data.get('education', []))
        skills = json.dumps(data.get('skills', []))
        projects = json.dumps(data.get('projects', []))
        certifications = json.dumps(data.get('certifications', []))

        cursor.execute("SELECT id FROM resume_builder_data WHERE student_id = ?", (uid(),))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("""
                UPDATE resume_builder_data
                SET full_name = ?, email = ?, phone = ?, headline = ?, summary = ?,
                    education_json = ?, skills_json = ?, projects_json = ?, certifications_json = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (full_name, email, phone, headline, summary, education, skills, projects, certifications, existing['id']))
        else:
            cursor.execute("""
                INSERT INTO resume_builder_data (student_id, full_name, email, phone, headline, summary, education_json, skills_json, projects_json, certifications_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (uid(), full_name, email, phone, headline, summary, education, skills, projects, certifications))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Resume builder profile updated successfully.'})

    cursor.execute("SELECT * FROM resume_builder_data WHERE student_id = ?", (uid(),))
    row = cursor.fetchone()
    conn.close()

    if row:
        builder_data = {
            'full_name': row['full_name'],
            'email': row['email'],
            'phone': row['phone'],
            'headline': row['headline'],
            'summary': row['summary'],
            'education': json.loads(row['education_json'] or '[]'),
            'skills': json.loads(row['skills_json'] or '[]'),
            'projects': json.loads(row['projects_json'] or '[]'),
            'certifications': json.loads(row['certifications_json'] or '[]'),
            'updated_at': row['updated_at']
        }
    else:
        builder_data = {
            'full_name': g.user['name'],
            'email': 'student@college.edu',
            'phone': '+91 98765 43210',
            'headline': 'Software Engineer | Systems & Distributed Computing',
            'summary': 'Final-year Computer Science undergraduate with 9.36 CGPA and hands-on experience in building scalable microservices and distributed consensus systems.',
            'education': [
                {'degree': 'B.E. Computer Science & Engineering', 'institution': 'Apex Institute of Engineering & Technology', 'year': '2021 - 2025', 'score': '9.36 CGPA'}
            ],
            'skills': ['C++', 'Python', 'Go', 'Docker', 'Kubernetes', 'PostgreSQL', 'React.js'],
            'projects': [
                {'title': 'Autonomous Drone Telemetry Mesh', 'tech': 'Go, gRPC', 'description': 'Low-latency telemetry streaming passing failover under 15ms.'}
            ],
            'certifications': ['AWS Certified Cloud Practitioner']
        }

    return jsonify({'resume_data': builder_data})

@app.route('/api/placements/interview-prep', methods=['GET'])
def get_interview_prep():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM interview_resources ORDER BY id ASC")
    resources = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM mock_questions ORDER BY id ASC")
    questions = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({
        'resources': resources,
        'mock_questions': questions
    })

# ==========================================================
# MODULE 11: PROJECTS HUB
# ==========================================================

@app.route('/api/projects', methods=['GET', 'POST'])
def handle_projects():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        title = (request.form.get('title') or data.get('title', '')).strip()
        desc = (request.form.get('description') or data.get('description', '')).strip()
        category = (request.form.get('category') or data.get('category', 'Capstone Project')).strip()
        tech = (request.form.get('technologies') or data.get('technologies', '')).strip()
        github = (request.form.get('github_url') or data.get('github_url', '')).strip()
        demo = (request.form.get('demo_url') or data.get('demo_url', '')).strip()
        team_status = (request.form.get('team_status') or data.get('team_status', 'Looking for Teammates')).strip()
        open_roles = (request.form.get('open_roles') or data.get('open_roles', '')).strip()
        guide = (request.form.get('guide_name') or data.get('guide_name', 'Dr. Ramesh Rao')).strip()

        doc_file = request.files.get('document_file')
        doc_path = ""
        if doc_file and doc_file.filename:
            saved_doc = f"doc_{int(datetime.now().timestamp())}_{secure_filename(doc_file.filename)}"
            doc_file.save(os.path.join(PROJECTS_UPLOAD_DIR, saved_doc))
            doc_path = f"projects/{saved_doc}"

        if not title or not desc or not tech:
            conn.close()
            return jsonify({'error': 'Project title, description, and technologies are required.'}), 400

        cursor.execute("SELECT name, usn FROM student_profiles WHERE user_id = ?", (uid(),))
        prof = cursor.fetchone()
        student_name = prof['name'] if prof else g.user['name']
        usn = prof['usn'] if prof else g.user['identifier']

        cursor.execute("""
            INSERT INTO projects (student_id, student_name, usn, title, category, description, technologies, github_url, demo_url, document_file, image_file, team_status, open_roles, guide_name, guide_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, 'Approved')
        """, (uid(), student_name, usn, title, category, desc, tech, github, demo, doc_path, team_status, open_roles, guide))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()

        return jsonify({'message': f'Project "{title}" showcased successfully.', 'id': new_id}), 201

    search = request.args.get('search', '').strip().lower()
    cat = request.args.get('category', 'ALL')
    team = request.args.get('team_status', 'ALL')

    query = """
        SELECT p.*,
               (SELECT COUNT(*) FROM project_feedback f WHERE f.project_id = p.id) as feedback_count,
               (SELECT AVG(f.score) FROM project_feedback f WHERE f.project_id = p.id) as avg_score
        FROM projects p
        WHERE 1=1
    """
    params = []

    if search:
        query += " AND (LOWER(p.title) LIKE ? OR LOWER(p.technologies) LIKE ? OR LOWER(p.description) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    if cat != 'ALL':
        query += " AND p.category = ?"
        params.append(cat)

    if team != 'ALL':
        query += " AND p.team_status = ?"
        params.append(team)

    query += " ORDER BY p.id DESC"
    cursor.execute(query, params)
    projects = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({'projects': projects})

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project_details(project_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    p_row = cursor.fetchone()
    if not p_row:
        conn.close()
        return jsonify({'error': 'Project not found.'}), 404

    project = dict(p_row)

    cursor.execute("SELECT * FROM project_feedback WHERE project_id = ? ORDER BY id DESC", (project_id,))
    project['feedback'] = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM project_teammate_requests WHERE project_id = ? ORDER BY id DESC", (project_id,))
    project['teammate_requests'] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return jsonify({'project': project})

@app.route('/api/projects/<int:project_id>/teammate-request', methods=['POST'])
def apply_project_teammate(project_id):
    data = request.get_json() or {}
    role = data.get('role_applied', 'Collaborator').strip()
    msg = data.get('message', '').strip()
    req_name = data.get('requester_name', 'Rahul Sharma').strip()
    req_usn = data.get('requester_usn', '1MS21CS092').strip()

    if not msg:
        return jsonify({'error': 'Please provide a brief message on how you can contribute.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO project_teammate_requests (project_id, requester_id, requester_name, requester_usn, role_applied, message, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    """, (project_id, uid(), req_name, req_usn, role, msg))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Teammate request submitted for {role}. Project owner notified.'}), 201

@app.route('/api/projects/teammate-requests/<int:req_id>', methods=['PUT'])
def update_teammate_request(req_id):
    data = request.get_json() or {}
    status = data.get('status', 'Accepted').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE project_teammate_requests SET status = ? WHERE id = ?", (status, req_id))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Teammate collaboration request marked as {status}.'})

@app.route('/api/projects/<int:project_id>/feedback', methods=['POST'])
def add_project_feedback(project_id):
    data = request.get_json() or {}
    faculty = (data.get('faculty_name') or data.get('guide_name') or 'Dr. Ramesh Rao').strip()
    score = int(data.get('score', 45))
    max_score = int(data.get('max_score', 50))
    comments = (data.get('comments') or data.get('feedback') or '').strip()

    if not comments:
        return jsonify({'error': 'Evaluation comments are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO project_feedback (project_id, faculty_name, score, max_score, comments)
        VALUES (?, ?, ?, ?, ?)
    """, (project_id, faculty, score, max_score, comments))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Faculty evaluation and score saved successfully.'}), 201

@app.route('/api/projects/<int:project_id>/document/download', methods=['GET'])
def download_project_document(project_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT document_file, title FROM projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row['document_file']:
        return jsonify({'error': 'No document attached to this project.'}), 404

    filename = os.path.basename(row['document_file'])
    return send_from_directory(PROJECTS_UPLOAD_DIR, filename, as_attachment=True)

# ==========================================================
# MODULE 12: EVENTS AND CLUBS
# ==========================================================

@app.route('/api/events', methods=['GET', 'POST'])
def handle_events():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        title = data.get('title', '').strip()
        cat = data.get('category', 'Workshop').strip()
        club = data.get('club_name', '').strip()
        event_date = data.get('event_date', '').strip()
        event_time = data.get('event_time', '10:00 AM').strip()
        venue = data.get('venue', '').strip()
        desc = data.get('description', '').strip()
        deadline = data.get('registration_deadline', '').strip()
        seats_total = int(data.get('seats_total', 100))

        if not title or not club or not event_date or not venue:
            conn.close()
            return jsonify({'error': 'Title, club name, event date, and venue are required.'}), 400

        cursor.execute("""
            INSERT INTO events (title, category, club_name, event_date, event_time, venue, description, registration_deadline, seats_total, seats_booked, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Upcoming', 'Admin')
        """, (title, cat, club, event_date, event_time, venue, desc, deadline, seats_total))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'message': f'Event "{title}" created successfully.', 'id': new_id}), 201

    cat = request.args.get('category', 'ALL')
    search = request.args.get('search', '').strip().lower()

    query = "SELECT * FROM events WHERE 1=1"
    params = []

    if cat != 'ALL':
        query += " AND category = ?"
        params.append(cat)

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(club_name) LIKE ? OR LOWER(description) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY event_date ASC"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id as reg_id, event_id, attendance_status, certificate_issued, certificate_file, certificate_title FROM event_registrations WHERE student_id = ?", (uid(),))
    reg_map = {r['event_id']: dict(r) for r in cursor.fetchall()}

    for row in rows:
        reg = reg_map.get(row['id'])
        row['is_registered'] = bool(reg)
        row['registration_id'] = reg['reg_id'] if reg else None
        row['attendance_status'] = reg['attendance_status'] if reg else 'Not Registered'
        row['certificate_issued'] = reg['certificate_issued'] if reg else 0
        row['certificate_title'] = reg['certificate_title'] if reg else ''

    conn.close()
    return jsonify({'events': rows})

@app.route('/api/events/<int:event_id>', methods=['PUT', 'DELETE'])
def manage_event(event_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': f'Event #{event_id} deleted.'})

    data = request.get_json() or {}
    cursor.execute("""
        UPDATE events
        SET title = COALESCE(NULLIF(?, ''), title),
            category = COALESCE(NULLIF(?, ''), category),
            club_name = COALESCE(NULLIF(?, ''), club_name),
            event_date = COALESCE(NULLIF(?, ''), event_date),
            event_time = COALESCE(NULLIF(?, ''), event_time),
            venue = COALESCE(NULLIF(?, ''), venue),
            description = COALESCE(NULLIF(?, ''), description),
            seats_total = COALESCE(?, seats_total),
            status = COALESCE(NULLIF(?, ''), status)
        WHERE id = ?
    """, (data.get('title'), data.get('category'), data.get('club_name'), data.get('event_date'),
          data.get('event_time'), data.get('venue'), data.get('description'), data.get('seats_total'),
          data.get('status'), event_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Event #{event_id} updated.'})

@app.route('/api/events/<int:event_id>/register', methods=['POST'])
def register_for_event(event_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    ev = cursor.fetchone()
    if not ev:
        conn.close()
        return jsonify({'error': 'Event not found.'}), 404

    cursor.execute("SELECT id FROM event_registrations WHERE event_id = ? AND student_id = ?", (event_id, uid()))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'You are already registered for this event.'}), 400

    if ev['seats_booked'] >= ev['seats_total']:
        conn.close()
        return jsonify({'error': 'Registration full. Maximum capacity reached.'}), 400

    cursor.execute("SELECT name, usn FROM student_profiles WHERE user_id = ?", (uid(),))
    prof = cursor.fetchone()
    student_name = prof['name'] if prof else g.user['name']
    usn = prof['usn'] if prof else g.user['identifier']

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    cursor.execute("""
        INSERT INTO event_registrations (event_id, student_id, student_name, usn, registered_at, attendance_status, certificate_issued)
        VALUES (?, ?, ?, ?, ?, 'Registered', 0)
    """, (event_id, uid(), student_name, usn, now_str))

    cursor.execute("UPDATE events SET seats_booked = seats_booked + 1 WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Successfully registered for {ev["title"]}. Seat confirmed!'}), 201

@app.route('/api/events/my-registrations', methods=['GET'])
def get_my_event_registrations():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.id as reg_id, r.registered_at, r.attendance_status, r.certificate_issued, r.certificate_file, r.certificate_title,
               e.id as event_id, e.title, e.category, e.club_name, e.event_date, e.event_time, e.venue, e.status as event_status
        FROM event_registrations r
        JOIN events e ON e.id = r.event_id
        WHERE r.student_id = ?
        ORDER BY r.id DESC
    """, (uid(),))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'registrations': rows})

@app.route('/api/events/<int:event_id>/certificate/upload', methods=['POST'])
def upload_event_certificate(event_id):
    student_usn = scoped_usn(request.form.get('usn'))
    cert_title = request.form.get('certificate_title', 'Certificate of Participation').strip()
    file = request.files.get('certificate')

    if not file or not file.filename:
        return jsonify({'error': 'No certificate file uploaded.'}), 400

    filename = secure_filename(file.filename)
    saved_filename = f"cert_{event_id}_{int(datetime.now().timestamp())}_{filename}"
    file_path = os.path.join(CERTIFICATES_UPLOAD_DIR, saved_filename)
    file.save(file_path)

    relative_path = f"certificates/{saved_filename}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE event_registrations
        SET certificate_issued = 1, certificate_file = ?, certificate_title = ?, attendance_status = 'Attended'
        WHERE event_id = ? AND usn = ?
    """, (relative_path, cert_title, event_id, student_usn))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Certificate issued for {student_usn}.', 'certificate_file': relative_path})

@app.route('/api/events/certificates/<int:reg_id>/download', methods=['GET'])
def download_event_certificate(reg_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT student_id, certificate_file, certificate_title FROM event_registrations WHERE id = ?", (reg_id,))
    row = cursor.fetchone()
    if row and row['student_id'] != uid() and not staff_can_access_student(conn, row['student_id']):
        row = None
    conn.close()

    if not row or not row['certificate_file']:
        return jsonify({'error': 'No certificate issued for this registration yet.'}), 404

    filename = os.path.basename(row['certificate_file'])
    return send_from_directory(CERTIFICATES_UPLOAD_DIR, filename, as_attachment=True)

# ==============================================================================
# LIBRARY MANAGEMENT MODULE
# ==============================================================================

@app.route('/api/library/books', methods=['GET'])
def get_library_books():
    search = request.args.get('search', '').strip().lower()
    category = request.args.get('category', '').strip()
    availability = request.args.get('availability', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM library_books WHERE 1=1"
    params = []

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(isbn) LIKE ? OR LOWER(shelf_location) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    if availability == 'available':
        query += " AND available_copies > 0"
    elif availability in ['borrowed', 'out_of_stock']:
        query += " AND available_copies = 0"

    query += " ORDER BY title ASC"
    cursor.execute(query, params)
    books = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT COUNT(*), SUM(total_copies), SUM(available_copies), SUM(issued_copies) FROM library_books")
    stats_row = cursor.fetchone()
    stats = {
        'total_titles': stats_row[0] or 0,
        'total_copies': stats_row[1] or 0,
        'available_copies': stats_row[2] or 0,
        'issued_copies': stats_row[3] or 0
    }
    conn.close()
    return jsonify({'books': books, 'stats': stats})

@app.route('/api/library/books', methods=['POST'])
def add_library_book():
    data = request.get_json() or {}
    isbn = (data.get('isbn') or '').strip()
    title = (data.get('title') or '').strip()
    author = (data.get('author') or '').strip()
    category = (data.get('category') or 'General').strip()
    publisher = (data.get('publisher') or '').strip()
    edition = (data.get('edition') or '1st Edition').strip()
    shelf_location = (data.get('shelf_location') or 'Rack General').strip()
    try:
        total_copies = int(data.get('total_copies') or 5)
    except (ValueError, TypeError):
        total_copies = 5

    if not isbn or not title or not author:
        return jsonify({'error': 'ISBN, Title, and Author are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM library_books WHERE isbn = ?", (isbn,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': f'Book with ISBN {isbn} already exists.'}), 409

    cursor.execute("""
        INSERT INTO library_books (isbn, title, author, category, publisher, edition, shelf_location, total_copies, available_copies, issued_copies)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (isbn, title, author, category, publisher, edition, shelf_location, total_copies, total_copies))
    book_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': 'Book added successfully to library catalog.', 'book_id': book_id}), 201

@app.route('/api/library/books/<int:book_id>', methods=['PUT'])
def update_library_book(book_id):
    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM library_books WHERE id = ?", (book_id,))
    book = cursor.fetchone()
    if not book:
        conn.close()
        return jsonify({'error': 'Book not found.'}), 404

    title = (data.get('title') or book['title']).strip()
    author = (data.get('author') or book['author']).strip()
    category = (data.get('category') or book['category']).strip()
    publisher = (data.get('publisher') or book['publisher']).strip()
    edition = (data.get('edition') or book['edition']).strip()
    shelf_location = (data.get('shelf_location') or book['shelf_location']).strip()
    try:
        total_copies = int(data.get('total_copies', book['total_copies']))
    except (ValueError, TypeError):
        total_copies = book['total_copies']

    issued_copies = book['issued_copies']
    if total_copies < issued_copies:
        conn.close()
        return jsonify({'error': f'Total copies ({total_copies}) cannot be less than currently issued copies ({issued_copies}).'}), 400

    available_copies = total_copies - issued_copies

    cursor.execute("""
        UPDATE library_books
        SET title = ?, author = ?, category = ?, publisher = ?, edition = ?, shelf_location = ?, total_copies = ?, available_copies = ?
        WHERE id = ?
    """, (title, author, category, publisher, edition, shelf_location, total_copies, available_copies, book_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Book details updated successfully.'})

@app.route('/api/library/books/<int:book_id>', methods=['DELETE'])
def delete_library_book(book_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT issued_copies FROM library_books WHERE id = ?", (book_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Book not found.'}), 404
    if row['issued_copies'] > 0:
        conn.close()
        return jsonify({'error': f'Cannot delete book while {row["issued_copies"]} copies are currently issued to students.'}), 400

    cursor.execute("DELETE FROM library_books WHERE id = ?", (book_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Book removed from library catalog.'})

@app.route('/api/library/my-books', methods=['GET'])
def get_my_library_books():
    student_usn = scoped_usn(request.args.get('usn'))
    today_str = datetime.now().strftime('%Y-%m-%d')
    today_date = datetime.strptime(today_str, '%Y-%m-%d').date()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.id, r.book_id, r.student_id, r.student_name, r.usn, r.issue_date, r.due_date,
               r.return_date, r.status, r.fine_amount, r.librarian_remarks,
               b.title, b.author, b.isbn, b.category, b.shelf_location
        FROM library_borrow_records r
        JOIN library_books b ON r.book_id = b.id
        WHERE r.usn = ? AND r.status != 'Returned'
        ORDER BY r.due_date ASC
    """, (student_usn,))
    raw_records = cursor.fetchall()

    active_books = []
    total_overdue_fines = 0.0
    reminders = []

    for r in raw_records:
        rec = dict(r)
        due_date = datetime.strptime(rec['due_date'], '%Y-%m-%d').date()
        days_diff = (due_date - today_date).days

        if days_diff < 0:
            rec['status'] = 'Overdue'
            overdue_days = abs(days_diff)
            rec['overdue_days'] = overdue_days
            rec['calculated_fine'] = overdue_days * 2.0  # Rs 2 per day
            total_overdue_fines += rec['calculated_fine']
            rec['days_remaining'] = days_diff
            reminders.append({
                'type': 'Overdue Alert',
                'severity': 'high',
                'book_title': rec['title'],
                'due_date': rec['due_date'],
                'message': f"Overdue by {overdue_days} day(s). Fine accrued: Rs {rec['calculated_fine']:.2f}. Please return immediately."
            })
        else:
            rec['overdue_days'] = 0
            rec['calculated_fine'] = 0.0
            rec['days_remaining'] = days_diff
            if days_diff <= 3:
                reminders.append({
                    'type': 'Return Reminder',
                    'severity': 'medium',
                    'book_title': rec['title'],
                    'due_date': rec['due_date'],
                    'message': f"Book '{rec['title']}' is due in {days_diff} day(s) on {rec['due_date']}."
                })

        active_books.append(rec)

    conn.close()
    return jsonify({
        'borrowed_books': active_books,
        'total_active': len(active_books),
        'total_overdue_fines': total_overdue_fines,
        'reminders': reminders
    })

@app.route('/api/library/history', methods=['GET'])
def get_library_history():
    student_usn = scoped_usn(request.args.get('usn'))
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.id, r.book_id, r.student_id, r.student_name, r.usn, r.issue_date, r.due_date,
               r.return_date, r.status, r.fine_amount, r.librarian_remarks,
               b.title, b.author, b.isbn, b.category
        FROM library_borrow_records r
        JOIN library_books b ON r.book_id = b.id
        WHERE r.usn = ? AND r.status = 'Returned'
        ORDER BY r.return_date DESC
    """, (student_usn,))
    history = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'history': history})

@app.route('/api/library/issue', methods=['POST'])
def issue_library_book():
    data = request.get_json() or {}
    book_id = data.get('book_id')
    usn = scoped_usn(data.get('usn'))
    student_name = scoped_name(data.get('student_name'))
    try:
        due_days = int(data.get('days', 14))
    except (ValueError, TypeError):
        due_days = 14

    issue_date = datetime.now().strftime('%Y-%m-%d')
    due_date = (datetime.now() + timedelta(days=due_days)).strftime('%Y-%m-%d')

    if not book_id:
        return jsonify({'error': 'Book ID is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM library_books WHERE id = ?", (book_id,))
    book = cursor.fetchone()
    if not book:
        conn.close()
        return jsonify({'error': 'Book not found.'}), 404

    if book['available_copies'] <= 0:
        conn.close()
        return jsonify({'error': 'No available copies left for this book.'}), 400

    cursor.execute("""
        UPDATE library_books
        SET available_copies = available_copies - 1, issued_copies = issued_copies + 1
        WHERE id = ?
    """, (book_id,))

    cursor.execute("""
        INSERT INTO library_borrow_records (book_id, student_id, student_name, usn, issue_date, due_date, status, fine_amount, librarian_remarks)
        VALUES (?, COALESCE((SELECT user_id FROM student_profiles WHERE usn = ?), 0), ?, ?, ?, ?, 'Issued', 0.0, 'Issued via Circulation Desk')
    """, (book_id, usn, student_name, usn, issue_date, due_date))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': f'Book "{book["title"]}" successfully issued to {usn}. Due on {due_date}.', 'record_id': record_id}), 201

@app.route('/api/library/return/<int:borrow_id>', methods=['POST'])
def return_library_book(borrow_id):
    data = request.get_json() or {}
    remarks = (data.get('remarks') or 'Returned in good condition').strip()
    return_date = datetime.now().strftime('%Y-%m-%d')
    today_date = datetime.strptime(return_date, '%Y-%m-%d').date()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM library_borrow_records WHERE id = ?", (borrow_id,))
    rec = cursor.fetchone()
    if rec and not is_staff() and rec['student_id'] != uid():
        conn.close()
        return jsonify({'error': "You don't have access."}), 403
    if not rec:
        conn.close()
        return jsonify({'error': 'Borrow record not found.'}), 404

    if rec['status'] == 'Returned':
        conn.close()
        return jsonify({'error': 'This book has already been returned.'}), 400

    due_date = datetime.strptime(rec['due_date'], '%Y-%m-%d').date()
    fine = 0.0
    if today_date > due_date:
        overdue_days = (today_date - due_date).days
        fine = float(overdue_days * 2.0)

    cursor.execute("""
        UPDATE library_borrow_records
        SET status = 'Returned', return_date = ?, fine_amount = ?, librarian_remarks = ?
        WHERE id = ?
    """, (return_date, fine, remarks, borrow_id))

    cursor.execute("""
        UPDATE library_books
        SET available_copies = available_copies + 1, issued_copies = MAX(0, issued_copies - 1)
        WHERE id = ?
    """, (rec['book_id'],))

    conn.commit()
    conn.close()
    return jsonify({
        'message': 'Book returned successfully.',
        'return_date': return_date,
        'fine_amount': fine
    })

@app.route('/api/library', methods=['GET'])
def get_library():
    return get_my_library_books()

# ==============================================================================
# CAMPUS SERVICES MODULE
# ==============================================================================

@app.route('/api/services/bus-routes', methods=['GET'])
def get_bus_routes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bus_routes ORDER BY route_number ASC")
    rows = cursor.fetchall()
    routes = []
    for r in rows:
        route_dict = dict(r)
        try:
            route_dict['stops'] = json.loads(route_dict.get('stops_and_timings_json') or '[]')
        except Exception:
            route_dict['stops'] = []
        routes.append(route_dict)
    conn.close()
    return jsonify({
        'routes': routes,
        'tracking_disclaimer': 'Simulation / Demo Tracking Mode Active. Hardware GPS feed is currently simulated.',
        'is_simulation': True
    })

@app.route('/api/services/canteen', methods=['GET'])
def get_canteen():
    category = request.args.get('category', '').strip()
    dietary = request.args.get('dietary', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM canteen_menu WHERE 1=1"
    params = []

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if dietary and dietary.lower() != 'all':
        query += " AND dietary = ?"
        params.append(dietary)

    if search:
        query += " AND (LOWER(item_name) LIKE ? OR LOWER(category) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])

    query += " ORDER BY category ASC, item_name ASC"
    cursor.execute(query, params)
    items = [dict(r) for r in cursor.fetchall()]
    conn.close()

    info = {
        'name': 'University Central Food Court & Canteen',
        'location': 'Campus Student Plaza, Ground Floor',
        'opening_hours': '07:30 AM - 08:30 PM (Monday to Sunday)',
        'breakfast_timings': '07:30 AM - 10:30 AM',
        'lunch_timings': '12:00 PM - 03:00 PM',
        'snacks_timings': '04:00 PM - 07:00 PM',
        'dinner_timings': '07:00 PM - 08:30 PM',
        'contact': '+91 80 2345 6750',
        'payment_methods': 'UPI, Campus RFID Smart Card, Cash'
    }
    return jsonify({'info': info, 'menu': items})

@app.route('/api/services/canteen/<int:item_id>/availability', methods=['PUT'])
def toggle_canteen_availability(item_id):
    data = request.get_json() or {}
    new_availability = data.get('availability', 'Available')
    if new_availability not in ['Available', 'Sold Out']:
        return jsonify({'error': 'Invalid status. Must be Available or Sold Out.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE canteen_menu SET availability = ? WHERE id = ?", (new_availability, item_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Item availability updated to {new_availability}.'})

@app.route('/api/services/lost-found', methods=['GET'])
def get_lost_found():
    report_type = request.args.get('type', '').strip()
    category = request.args.get('category', '').strip()
    status = request.args.get('status', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM lost_and_found WHERE 1=1"
    params = []

    if report_type and report_type.lower() != 'all':
        query += " AND LOWER(report_type) = LOWER(?)"
        params.append(report_type)

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if status and status.lower() != 'all':
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (LOWER(item_title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(location_reported) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    items = [dict(r) for r in cursor.fetchall()]

    for it in items:
        cursor.execute("SELECT COUNT(*) FROM lost_and_found_messages WHERE item_id = ?", (it['id'],))
        it['message_count'] = cursor.fetchone()[0]

    conn.close()
    return jsonify({'items': items})

@app.route('/api/services/lost-found', methods=['POST'])
def create_lost_found():
    data = request.get_json() or {}
    report_type = data.get('report_type', 'Lost')
    item_title = (data.get('item_title') or '').strip()
    category = (data.get('category') or 'Personal Items').strip()
    location_reported = (data.get('location_reported') or '').strip()
    date_reported = data.get('date_reported') or datetime.now().strftime('%Y-%m-%d')
    description = (data.get('description') or '').strip()
    reporter_name = g.user['name']
    reporter_usn = g.user['identifier']
    contact_email = (data.get('contact_email') or 'student@college.edu').strip()
    contact_phone = (data.get('contact_phone') or '+91 98765 43210').strip()
    claim_instructions = (data.get('claim_instructions') or 'Contact reporter or visit department office.').strip()

    if not item_title or not location_reported or not description:
        return jsonify({'error': 'Item title, location, and description are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO lost_and_found (
            report_type, item_title, category, location_reported, date_reported,
            description, reporter_name, reporter_usn, contact_email, contact_phone,
            status, claim_instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)
    """, (report_type, item_title, category, location_reported, date_reported,
          description, reporter_name, reporter_usn, contact_email, contact_phone, claim_instructions))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': f'{report_type} item report submitted successfully.', 'id': new_id}), 201

@app.route('/api/services/lost-found/<int:item_id>/status', methods=['PUT'])
def update_lost_found_status(item_id):
    data = request.get_json() or {}
    status = data.get('status', 'Resolved')
    if status not in ['Open', 'Claimed', 'Resolved']:
        return jsonify({'error': 'Invalid status. Must be Open, Claimed, or Resolved.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE lost_and_found SET status = ? WHERE id = ?", (status, item_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Status updated to {status}.'})

@app.route('/api/services/lost-found/<int:item_id>/messages', methods=['GET'])
def get_lost_found_messages(item_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lost_and_found_messages WHERE item_id = ? ORDER BY id ASC", (item_id,))
    messages = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'messages': messages})

@app.route('/api/services/lost-found/<int:item_id>/message', methods=['POST'])
def send_lost_found_message(item_id):
    data = request.get_json() or {}
    sender_name = g.user['name']
    sender_usn = g.user['identifier']
    sender_contact = (data.get('sender_contact') or '+91 98765 43210').strip()
    message = (data.get('message') or '').strip()

    if not message:
        return jsonify({'error': 'Message content is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM lost_and_found WHERE id = ?", (item_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Lost/Found item not found.'}), 404

    cursor.execute("""
        INSERT INTO lost_and_found_messages (item_id, sender_name, sender_usn, sender_contact, message)
        VALUES (?, ?, ?, ?, ?)
    """, (item_id, sender_name, sender_usn, sender_contact, message))
    msg_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': 'Inquiry message delivered to the item reporter.', 'id': msg_id}), 201

@app.route('/api/services/facilities', methods=['GET'])
def get_campus_facilities():
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM campus_facilities WHERE 1=1"
    params = []

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (LOWER(facility_name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(building_location) LIKE ? OR LOWER(key_features) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    query += " ORDER BY facility_name ASC"
    cursor.execute(query, params)
    facilities = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'facilities': facilities})

@app.route('/api/services', methods=['GET'])
def get_services():
    return jsonify({
        'shuttle_bus': {'route': 'Route 14 (Electronic City)', 'status': 'On Time', 'next_stop': 'Silk Board Junction (08:25 AM)'},
        'cafeteria': {'status': 'Open', 'crowd_level': 'Moderate', 'specials': 'Veg Thali, Paneer Wrap, Fresh Juice'}
    })

# ==============================================================================
# 15. COMMUNICATION & NOTIFICATIONS MODULE
# ==============================================================================

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    category = request.args.get('category', '').strip()
    status = request.args.get('status', '').strip().lower()
    role = request.args.get('role', 'all').strip().lower() if is_staff() else 'student'

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM notifications WHERE 1=1"
    params = []

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if status == 'unread':
        query += " AND is_read = 0"
    elif status == 'read':
        query += " AND is_read = 1"

    if role != 'all' and role:
        query += " AND (target_role = 'all' OR target_role = ?)"
        params.append(role)

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    notifs = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT COUNT(*) FROM notifications WHERE is_read = 0")
    unread_count = cursor.fetchone()[0]

    conn.close()
    return jsonify({'notifications': notifs, 'unread_count': unread_count})

@app.route('/api/notifications', methods=['POST'])
def publish_notification():
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    category = (data.get('category') or 'College Announcement').strip()
    department = (data.get('department') or 'Office of Academic Affairs').strip()
    content = (data.get('content') or '').strip()
    priority = (data.get('priority') or 'Normal').strip()
    target_role = (data.get('target_role') or 'all').strip()
    published_date = data.get('published_date') or datetime.now().strftime('%Y-%m-%d')

    if not title or not content:
        return jsonify({'error': 'Title and content are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notifications (title, category, department, content, priority, target_role, published_date, is_read)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    """, (title, category, department, content, priority, target_role, published_date))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': 'Official circular published successfully.', 'id': new_id}), 201

@app.route('/api/notifications/<int:notif_id>/read', methods=['PUT'])
def mark_notification_read(notif_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notif_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Notification marked as read.'})

@app.route('/api/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1")
    conn.commit()
    conn.close()
    return jsonify({'message': 'All notifications marked as read.'})

@app.route('/api/notifications/<int:notif_id>', methods=['DELETE'])
def delete_notification(notif_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notifications WHERE id = ?", (notif_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Notification deleted successfully.'})

@app.route('/api/communications/faculty-directory', methods=['GET'])
def get_faculty_directory():
    faculty = [
        {
            'name': 'Dr. Ramesh Rao (Head of Systems)',
            'department': 'Computer Science & Engineering',
            'designation': 'Professor & Head of Department',
            'email': 'ramesh.rao@college.edu',
            'office': 'CS Block 301, 3rd Floor',
            'consultation_hours': '10:00 AM - 12:00 PM (Tue, Thu)',
            'courses': ['CS601 Distributed Systems', 'CS602 Machine Learning']
        },
        {
            'name': 'Prof. Anil Deshmukh',
            'department': 'Computer Science & Engineering',
            'designation': 'Associate Professor',
            'email': 'anil.deshmukh@college.edu',
            'office': 'CS Block 204, 2nd Floor',
            'consultation_hours': '11:00 AM - 01:00 PM (Mon, Wed)',
            'courses': ['CS603 Compiler Design', 'CS502 Operating Systems']
        },
        {
            'name': 'Dr. Geetha S. (HoD ECE)',
            'department': 'Electronics & Communication',
            'designation': 'Professor & Head of Department',
            'email': 'geetha.s@college.edu',
            'office': 'EC Complex 102, Ground Floor',
            'consultation_hours': '02:00 PM - 04:00 PM (Mon, Fri)',
            'courses': ['EC601 Embedded IoT Systems', 'EC503 Digital Signal Processing']
        },
        {
            'name': 'Dr. Sunita Varma',
            'department': 'Campus Health & Medical Services',
            'designation': 'Senior Medical Officer',
            'email': 'sunita.varma@college.edu',
            'office': 'Health Pavilion Room 101',
            'consultation_hours': '09:00 AM - 01:00 PM (Daily)',
            'courses': ['HS101 Health & Preventive Care']
        }
    ]
    return jsonify({'faculty': faculty})

@app.route('/api/communications/appointments', methods=['GET'])
def get_faculty_appointments():
    student_usn = scoped_usn(request.args.get('usn'))
    role = g.user['role']

    conn = get_db()
    cursor = conn.cursor()
    if role in ['faculty', 'admin']:
        cursor.execute("SELECT * FROM faculty_appointments ORDER BY id DESC")
    else:
        cursor.execute("SELECT * FROM faculty_appointments WHERE usn = ? ORDER BY id DESC", (student_usn,))
    appts = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'appointments': appts})

@app.route('/api/communications/appointments', methods=['POST'])
def create_faculty_appointment():
    data = request.get_json() or {}
    faculty_name = (data.get('faculty_name') or '').strip()
    department = (data.get('department') or 'Computer Science').strip()
    purpose = (data.get('purpose') or '').strip()
    requested_date = (data.get('requested_date') or '').strip()
    requested_slot = (data.get('requested_slot') or '10:30 AM - 11:00 AM').strip()
    usn = scoped_usn(data.get('usn'))
    student_name = scoped_name(data.get('student_name'))

    if not faculty_name or not purpose or not requested_date:
        return jsonify({'error': 'Faculty name, consultation purpose, and requested date are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO faculty_appointments (student_id, student_name, usn, faculty_name, department, purpose, requested_date, requested_slot, status, faculty_remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '')
    """, (uid(), student_name, usn, faculty_name, department, purpose, requested_date, requested_slot))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': f'Appointment request submitted to {faculty_name}. Status: Pending.', 'id': new_id}), 201

@app.route('/api/communications/appointments/<int:appt_id>/status', methods=['PUT'])
def update_appointment_status(appt_id):
    data = request.get_json() or {}
    status = data.get('status', 'Confirmed')
    remarks = (data.get('remarks') or '').strip()

    if status not in ['Pending', 'Confirmed', 'Rescheduled', 'Completed', 'Cancelled']:
        return jsonify({'error': 'Invalid appointment status.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE faculty_appointments
        SET status = ?, faculty_remarks = ?
        WHERE id = ?
    """, (status, remarks, appt_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Appointment status updated to {status}.'})


# ==============================================================================
# 16. PERFORMANCE ANALYTICS MODULE
# ==============================================================================

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    conn = get_db()
    cursor = conn.cursor()
    sid = scoped_student_id(request.args.get('student_id'))
    if sid != uid() and not staff_can_access_student(conn, sid):
        conn.close()
        return jsonify({'error': "You don't have access."}), 403
    target = cursor.execute("SELECT semester FROM users WHERE id = ?", (sid,)).fetchone()
    current_sem = (target['semester'] if target else None) or 0

    # 1. Fetch Semester SGPA History & calculate CGPA progression
    cursor.execute("""
        SELECT semester, total_credits, total_credit_points, sgpa
        FROM semester_gpa_history
        WHERE student_id = ?
        ORDER BY semester ASC
    """, (sid,))
    gpa_rows = cursor.fetchall()

    sgpa_history = []
    cum_credits = 0.0
    cum_points = 0.0
    for r in gpa_rows:
        sem_num = r['semester']
        creds = float(r['total_credits'])
        pts = float(r['total_credit_points'])
        sgpa_val = float(r['sgpa'])

        cum_credits += creds
        cum_points += pts
        cgpa_val = round(cum_points / cum_credits, 2) if cum_credits > 0 else 0.0

        sgpa_history.append({
            'semester': f"Sem {sem_num}",
            'semester_number': sem_num,
            'credits': creds,
            'grade_points': pts,
            'sgpa': sgpa_val,
            'cgpa': cgpa_val
        })

    # Academic Improvement or Decline Trend Calculation
    trend_info = {'direction': 'Consistent', 'delta': 0.0, 'label': 'Stable Academic Pace'}
    if len(sgpa_history) >= 2:
        latest = sgpa_history[-1]['sgpa']
        prev = sgpa_history[-2]['sgpa']
        delta = round(latest - prev, 2)
        if delta > 0:
            trend_info = {
                'direction': 'Improvement',
                'delta': delta,
                'label': f"Academic Improvement: +{delta:.2f} SGPA compared to {sgpa_history[-2]['semester']}"
            }
        elif delta < 0:
            trend_info = {
                'direction': 'Decline',
                'delta': delta,
                'label': f"Academic Decline: {delta:.2f} SGPA compared to {sgpa_history[-2]['semester']}"
            }

    # 2. Fetch Subject-wise Attendance
    cursor.execute("""
        SELECT id, course_code, course_title, attended_hours, total_hours, od_hours, faculty_name
        FROM attendance
        WHERE user_id = ?
        ORDER BY course_title ASC
    """, (sid,))
    att_rows = cursor.fetchall()

    subject_attendance = []
    low_attendance_alerts = []
    total_conducted = 0
    total_attended = 0

    for r in att_rows:
        tc = r['total_hours']
        ac = r['attended_hours']
        od = r['od_hours']
        sub_name = r['course_title']
        sub_code = r['course_code']
        pct = round(((ac + od) / tc * 100), 1) if tc > 0 else 0.0
        absent = max(0, tc - (ac + od))

        total_conducted += tc
        total_attended += (ac + od)

        status_tag = 'Good'
        needed_for_75 = 0
        needed_for_85 = 0

        if pct < 75.0:
            status_tag = 'Critical Shortage'
            needed_for_75 = max(0, math.ceil((0.75 * tc - (ac + od)) / (1 - 0.75)))
            needed_for_85 = max(0, math.ceil((0.85 * tc - (ac + od)) / (1 - 0.85)))
            low_attendance_alerts.append({
                'subject': sub_name,
                'code': sub_code,
                'percentage': pct,
                'severity': 'Critical',
                'message': f"Shortage below mandatory 75% ({pct}%). Attend next {needed_for_75} consecutive classes to reach 75%, and {needed_for_85} to reach 85%."
            })
        elif pct < 85.0:
            status_tag = 'Warning'
            needed_for_85 = max(0, math.ceil((0.85 * tc - (ac + od)) / (1 - 0.85)))
            low_attendance_alerts.append({
                'subject': sub_name,
                'code': sub_code,
                'percentage': pct,
                'severity': 'Warning',
                'message': f"Below recommended 85% threshold ({pct}%). Attend next {needed_for_85} consecutive classes to safely qualify for honors."
            })

        subject_attendance.append({
            'subject': sub_name,
            'code': sub_code,
            'total_classes': tc,
            'attended_classes': ac,
            'absent_classes': absent,
            'od_classes': od,
            'percentage': pct,
            'faculty': r['faculty_name'],
            'status': status_tag
        })

    overall_attendance_pct = round((total_attended / total_conducted * 100), 1) if total_conducted > 0 else 0.0

    # 3. Fetch Subject-wise Marks for Current Semester
    cursor.execute("""
        SELECT id, course_code, course_title, credits, internal_marks, lab_marks, external_marks, total_marks, grade, status
        FROM academic_marks
        WHERE user_id = ? AND semester = ?
        ORDER BY course_title ASC
    """, (sid, current_sem))
    marks_rows = cursor.fetchall()

    subject_marks = []
    marks_improvement_alerts = []
    total_marks_sum = 0
    subject_count = len(marks_rows)

    for r in marks_rows:
        tot = r['total_marks']
        ext = r['external_marks']
        sub_name = r['course_title']
        sub_code = r['course_code']
        grade = r['grade']
        total_marks_sum += tot

        if tot < 80 or ext < 50:
            marks_improvement_alerts.append({
                'subject': sub_name,
                'code': sub_code,
                'total_marks': tot,
                'external_marks': ext,
                'grade': grade,
                'suggestion': f"Current score is {tot}/100. Target internal test revisions and lab assignments to boost total above 80 (Grade A+)."
            })

        subject_marks.append({
            'subject': sub_name,
            'code': sub_code,
            'internal_marks': r['internal_marks'],
            'lab_marks': r['lab_marks'],
            'external_marks': ext,
            'total_marks': tot,
            'grade': grade,
            'credits': r['credits'],
            'status': r['status']
        })

    overall_marks_avg = round(total_marks_sum / subject_count, 1) if subject_count > 0 else 0.0

    current_sgpa = sgpa_history[-1]['sgpa'] if sgpa_history else 0.0
    cumulative_cgpa = sgpa_history[-1]['cgpa'] if sgpa_history else 0.0
    who = cursor.execute("SELECT name, identifier, department, semester FROM users WHERE id = ?", (sid,)).fetchone()

    conn.close()
    return jsonify({
        'student': {
            'name': who['name'] if who else '',
            'usn': who['identifier'] if who else '',
            'department': who['department'] if who else '',
            'semester': who['semester'] if who else 0,
            'batch': ''
        },
        'sgpa_history': sgpa_history,
        'current_sgpa': current_sgpa,
        'cumulative_cgpa': cumulative_cgpa,
        'trend': trend_info,
        'subject_attendance': subject_attendance,
        'overall_attendance_pct': overall_attendance_pct,
        'low_attendance_alerts': low_attendance_alerts,
        'subject_marks': subject_marks,
        'overall_marks_avg': overall_marks_avg,
        'marks_improvement_alerts': marks_improvement_alerts,
        'academic_standing': 'First Class with Distinction (FCD)'
    })


# ==============================================================================
# 17. FACULTY DOUBT PORTAL MODULE
# ==============================================================================

@app.route('/api/doubts', methods=['GET'])
def get_doubts():
    subject = request.args.get('subject', '').strip()
    status = request.args.get('status', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM faculty_doubts WHERE 1=1"
    params = []
    if not is_staff():
        query += " AND student_id = ?"
        params.append(uid())

    if subject and subject.lower() != 'all':
        query += " AND (subject_code = ? OR subject_name = ?)"
        params.extend([subject, subject])

    if status and status.lower() != 'all':
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(question) LIKE ? OR LOWER(faculty_name) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    doubts = [dict(r) for r in cursor.fetchall()]

    for d in doubts:
        cursor.execute("SELECT * FROM doubt_responses WHERE doubt_id = ? ORDER BY id ASC", (d['id'],))
        d['responses'] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return jsonify({'doubts': doubts})

@app.route('/api/doubts', methods=['POST'])
def submit_doubt():
    subject_code = request.form.get('subject_code') or ''
    subject_name = request.form.get('subject_name') or ''
    faculty_name = request.form.get('faculty_name') or 'Dr. Ramesh Rao (Head of Systems)'
    title = request.form.get('title') or ''
    question = request.form.get('question') or ''
    usn = scoped_usn(request.form.get('usn'))
    student_name = scoped_name(request.form.get('student_name'))

    if not subject_code or not title or not question:
        data = request.get_json(silent=True) or {}
        subject_code = data.get('subject_code') or subject_code
        subject_name = data.get('subject_name') or subject_name
        faculty_name = data.get('faculty_name') or faculty_name
        title = data.get('title') or title
        question = data.get('question') or question
        usn = data.get('usn') or usn
        student_name = data.get('student_name') or student_name

    if not title or not question:
        return jsonify({'error': 'Doubt title and question details are required.'}), 400

    attachment_rel = ''
    file = request.files.get('attachment')
    if file and file.filename:
        filename = secure_filename(file.filename)
        saved_filename = f"doubt_{int(datetime.now().timestamp())}_{filename}"
        file_path = os.path.join(DOUBTS_UPLOAD_DIR, saved_filename)
        file.save(file_path)
        attachment_rel = f"doubts/{saved_filename}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO faculty_doubts (student_id, student_name, usn, subject_code, subject_name, faculty_name, title, question, attachment_file, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')
    """, (uid(), student_name, usn, subject_code, subject_name, faculty_name, title, question, attachment_rel))
    doubt_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': 'Doubt submitted successfully to faculty member.', 'doubt_id': doubt_id}), 201

@app.route('/api/doubts/<int:doubt_id>/respond', methods=['POST'])
def respond_to_doubt(doubt_id):
    # Name and role always come from the session, never the client.
    responder_name = g.user['name']
    responder_role = 'faculty' if is_staff() else 'student'
    response_text = request.form.get('response_text') or (request.get_json(silent=True) or {}).get('response_text') or ''

    if not response_text:
        return jsonify({'error': 'Response text cannot be empty.'}), 400

    if not is_staff():
        owner_conn = get_db()
        owner = owner_conn.execute("SELECT student_id FROM faculty_doubts WHERE id = ?", (doubt_id,)).fetchone()
        owner_conn.close()
        if not owner or owner['student_id'] != uid():
            return jsonify({'error': "You don't have access."}), 403

    attachment_rel = ''
    file = request.files.get('attachment')
    if file and file.filename:
        filename = secure_filename(file.filename)
        saved_filename = f"doubt_reply_{int(datetime.now().timestamp())}_{filename}"
        file_path = os.path.join(DOUBTS_UPLOAD_DIR, saved_filename)
        file.save(file_path)
        attachment_rel = f"doubts/{saved_filename}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO doubt_responses (doubt_id, responder_name, responder_role, response_text, attachment_file)
        VALUES (?, ?, ?, ?, ?)
    """, (doubt_id, responder_name, responder_role, response_text, attachment_rel))

    if responder_role == 'faculty':
        cursor.execute("UPDATE faculty_doubts SET status = 'Answered' WHERE id = ?", (doubt_id,))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Response submitted successfully.'}), 201

@app.route('/api/doubts/<int:doubt_id>/status', methods=['PUT'])
def update_doubt_status(doubt_id):
    data = request.get_json() or {}
    new_status = data.get('status', 'Resolved')
    if new_status not in ['Submitted', 'Under Review', 'Answered', 'Resolved']:
        return jsonify({'error': 'Invalid doubt status.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE faculty_doubts SET status = ? WHERE id = ?", (new_status, doubt_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Doubt status updated to {new_status}.'})

# ==========================================================
# 19. FACULTY MENTOR MODULE ENDPOINTS
# ==========================================================

@app.route('/api/mentor/my-mentor', methods=['GET'])
def get_my_mentor():
    student_id = scoped_student_id(request.args.get('student_id'))
    role = g.user['role']

    conn = get_db()
    cursor = conn.cursor()

    if role == 'faculty':
        cursor.execute("SELECT * FROM faculty_mentors ORDER BY id ASC LIMIT 1")
        mentor = cursor.fetchone()
        if not mentor:
            conn.close()
            return jsonify({'error': 'Faculty mentor profile not found.'}), 404
        mentor_dict = dict(mentor)

        cursor.execute("""
            SELECT a.*, p.cgpa, p.overall_attendance, p.email, p.phone
            FROM mentor_assignments a
            LEFT JOIN student_profiles p ON a.student_id = p.user_id
            WHERE a.mentor_id = ?
            ORDER BY a.student_name ASC
        """, (mentor_dict['id'],))
        mentees = [dict(r) for r in cursor.fetchall()]
        mentor_dict['mentees'] = mentees
        mentor_dict['total_mentees'] = len(mentees)

        cursor.execute("SELECT * FROM mentor_slots WHERE mentor_id = ? AND is_active = 1", (mentor_dict['id'],))
        mentor_dict['slots'] = [dict(s) for s in cursor.fetchall()]

        conn.close()
        return jsonify(mentor_dict)

    cursor.execute("""
        SELECT a.id as assignment_id, a.student_id, a.usn, a.student_name, a.department as student_dept,
               a.semester as student_sem, a.section, a.group_name, a.assigned_date, a.academic_year, a.status as assignment_status,
               m.id as mentor_id, m.faculty_id, m.name as mentor_name, m.department as mentor_dept,
               m.designation as mentor_designation, m.qualification as mentor_qualification,
               m.specialization as mentor_specialization, m.subjects_handled, m.email as mentor_email,
               m.phone as mentor_phone, m.office_room, m.consultation_hours, m.photo_url, m.bio
        FROM mentor_assignments a
        JOIN faculty_mentors m ON a.mentor_id = m.id
        WHERE a.student_id = ?
    """, (student_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return jsonify({'error': 'No assigned faculty mentor found.'}), 404

    result = dict(row)
    mentor_id = result['mentor_id']

    cursor.execute("""
        SELECT a.student_id, a.usn, a.student_name, a.department, a.semester, a.section,
               p.cgpa, p.overall_attendance, p.email
        FROM mentor_assignments a
        LEFT JOIN student_profiles p ON a.student_id = p.user_id
        WHERE a.mentor_id = ?
        ORDER BY a.student_name ASC
    """, (mentor_id,))
    result['peers'] = [dict(p) for p in cursor.fetchall()]

    cursor.execute("SELECT * FROM mentor_slots WHERE mentor_id = ? AND is_active = 1", (mentor_id,))
    result['slots'] = [dict(s) for s in cursor.fetchall()]

    conn.close()
    return jsonify(result)

@app.route('/api/mentor/profile/<int:mentor_id>', methods=['GET'])
def get_mentor_profile(mentor_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM faculty_mentors WHERE id = ?", (mentor_id,))
    mentor = cursor.fetchone()
    if not mentor:
        conn.close()
        return jsonify({'error': 'Faculty mentor not found.'}), 404

    mentor_dict = dict(mentor)
    cursor.execute("SELECT COUNT(*) FROM mentor_assignments WHERE mentor_id = ?", (mentor_id,))
    mentor_dict['mentees_count'] = cursor.fetchone()[0]

    cursor.execute("SELECT * FROM mentor_slots WHERE mentor_id = ? AND is_active = 1", (mentor_id,))
    mentor_dict['slots'] = [dict(s) for s in cursor.fetchall()]

    conn.close()
    return jsonify(mentor_dict)

@app.route('/api/mentor/messages', methods=['GET', 'POST'])
def handle_mentor_messages():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        mentor_id = data.get('mentor_id', 1)
        student_id = scoped_student_id(data.get('student_id'))
        sender_role = ('faculty' if is_staff() else 'student')
        sender_name = g.user['name']
        message = (data.get('message') or '').strip()
        subject = (data.get('subject') or 'Mentoring Inquiry').strip()

        if not message:
            conn.close()
            return jsonify({'error': 'Message content cannot be empty.'}), 400

        cursor.execute("SELECT name FROM faculty_mentors WHERE id = ?", (mentor_id,))
        m_row = cursor.fetchone()
        mentor_name = m_row['name'] if m_row else 'Faculty Mentor'

        cursor.execute("SELECT student_name FROM mentor_assignments WHERE student_id = ?", (student_id,))
        s_row = cursor.fetchone()
        student_name = s_row['student_name'] if s_row else 'Student'

        cursor.execute("""
            INSERT INTO mentor_messages (mentor_id, student_id, student_name, mentor_name, sender_role, sender_name, subject, message, is_read)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (mentor_id, student_id, student_name, mentor_name, sender_role, sender_name, subject, message))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'message': 'Message sent successfully.', 'id': new_id}), 201

    student_id = scoped_student_id(request.args.get('student_id'))
    mentor_id = request.args.get('mentor_id', type=int)

    if mentor_id:
        cursor.execute("""
            SELECT * FROM mentor_messages
            WHERE mentor_id = ? AND student_id = ?
            ORDER BY created_at ASC
        """, (mentor_id, student_id))
    else:
        cursor.execute("""
            SELECT * FROM mentor_messages
            WHERE student_id = ?
            ORDER BY created_at ASC
        """, (student_id,))

    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify(rows)

@app.route('/api/mentor/discussions', methods=['GET', 'POST'])
def handle_mentor_discussions():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        mentor_id = data.get('mentor_id', 1)
        group_name = data.get('group_name', 'CSE Batch 2021-2025 Mentor Group A')
        creator_id = uid()
        creator_name = g.user['name']
        creator_role = ('faculty' if is_staff() else 'student')
        category = (data.get('category') or 'Academic').strip()
        title = (data.get('title') or '').strip()
        content = (data.get('content') or '').strip()

        if not title or not content:
            conn.close()
            return jsonify({'error': 'Discussion title and content are required.'}), 400

        is_pinned = 1 if (creator_role == 'faculty' and data.get('is_pinned')) else 0

        cursor.execute("""
            INSERT INTO mentor_discussions (mentor_id, group_name, creator_id, creator_name, creator_role, category, title, content, is_pinned, status, views_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 1)
        """, (mentor_id, group_name, creator_id, creator_name, creator_role, category, title, content, is_pinned))
        conn.commit()
        disc_id = cursor.lastrowid
        conn.close()
        return jsonify({'message': 'Discussion topic created successfully.', 'id': disc_id}), 201

    mentor_id = request.args.get('mentor_id', 1, type=int)
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip().lower()

    query = "SELECT * FROM mentor_discussions WHERE mentor_id = ? AND status != 'Archived'"
    params = [mentor_id]

    if category and category != 'All':
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY is_pinned DESC, created_at DESC"
    cursor.execute(query, params)
    topics = [dict(t) for t in cursor.fetchall()]

    for t in topics:
        cursor.execute("""
            SELECT * FROM mentor_discussion_replies
            WHERE discussion_id = ?
            ORDER BY created_at ASC
        """, (t['id'],))
        t['replies'] = [dict(r) for r in cursor.fetchall()]
        t['replies_count'] = len(t['replies'])

    conn.close()
    return jsonify(topics)

@app.route('/api/mentor/discussions/<int:topic_id>/reply', methods=['POST'])
def add_discussion_reply(topic_id):
    data = request.get_json() or {}
    reply_text = (data.get('reply_text') or '').strip()
    author_name = g.user['name']
    author_role = ('faculty' if is_staff() else 'student')
    author_id = uid()

    if not reply_text:
        return jsonify({'error': 'Reply text cannot be empty.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO mentor_discussion_replies (discussion_id, author_id, author_name, author_role, reply_text)
        VALUES (?, ?, ?, ?, ?)
    """, (topic_id, author_id, author_name, author_role, reply_text))
    cursor.execute("UPDATE mentor_discussions SET views_count = views_count + 1 WHERE id = ?", (topic_id,))
    conn.commit()
    new_reply_id = cursor.lastrowid
    conn.close()
    return jsonify({'message': 'Reply posted successfully.', 'reply_id': new_reply_id}), 201

@app.route('/api/mentor/discussions/<int:topic_id>/pin', methods=['PUT'])
def toggle_pin_discussion(topic_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT is_pinned FROM mentor_discussions WHERE id = ?", (topic_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Topic not found.'}), 404

    new_pin = 0 if row['is_pinned'] else 1
    cursor.execute("UPDATE mentor_discussions SET is_pinned = ? WHERE id = ?", (new_pin, topic_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f"Discussion topic {'pinned' if new_pin else 'unpinned'} successfully.", 'is_pinned': new_pin})

@app.route('/api/mentor/discussions/<int:topic_id>', methods=['DELETE'])
def delete_discussion(topic_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM mentor_discussion_replies WHERE discussion_id = ?", (topic_id,))
    cursor.execute("DELETE FROM mentor_discussions WHERE id = ?", (topic_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Discussion topic deleted successfully.'})

@app.route('/api/mentor/meetings', methods=['GET'])
def get_mentor_meetings():
    student_id = request.args.get('student_id', type=int)
    mentor_id = request.args.get('mentor_id', type=int)
    role = g.user['role']

    conn = get_db()
    cursor = conn.cursor()

    if role == 'faculty' and mentor_id:
        cursor.execute("SELECT * FROM mentor_meetings WHERE mentor_id = ? ORDER BY requested_date DESC, id DESC", (mentor_id,))
    elif role == 'admin':
        cursor.execute("SELECT * FROM mentor_meetings ORDER BY requested_date DESC, id DESC")
    else:
        sid = scoped_student_id(student_id)
        cursor.execute("SELECT * FROM mentor_meetings WHERE student_id = ? ORDER BY requested_date DESC, id DESC", (sid,))

    meetings = [dict(m) for m in cursor.fetchall()]
    conn.close()
    return jsonify(meetings)

@app.route('/api/mentor/meetings/request', methods=['POST'])
def request_meeting():
    data = request.get_json() or {}
    mentor_id = data.get('mentor_id', 1)
    student_id = scoped_student_id(data.get('student_id'))
    student_name = scoped_name(data.get('student_name'))
    usn = scoped_usn(data.get('usn'))
    requested_date = (data.get('requested_date') or '').strip()
    requested_slot = (data.get('requested_slot') or '').strip()
    meeting_type = (data.get('meeting_type') or 'Academic Guidance').strip()
    agenda = (data.get('agenda') or '').strip()
    platform = (data.get('meeting_platform') or 'Google Meet').strip()

    if not requested_date or not requested_slot or not agenda:
        return jsonify({'error': 'Date, time slot, and meeting agenda are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO mentor_meetings (mentor_id, student_id, student_name, usn, requested_date, requested_slot, meeting_type, agenda, status, meeting_platform, meeting_link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Requested', ?, '')
    """, (mentor_id, student_id, student_name, usn, requested_date, requested_slot, meeting_type, agenda, platform))

    meeting_id = cursor.lastrowid
    cursor.execute("""
        INSERT INTO mentor_audit_logs (student_id, usn, action_type, performed_by, role, description)
        VALUES (?, ?, 'MEETING_REQUESTED', ?, 'student', ?)
    """, (student_id, usn, student_name, f"Requested {meeting_type} meeting for {requested_date} at {requested_slot}."))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Meeting request submitted successfully.', 'id': meeting_id}), 201

@app.route('/api/mentor/meetings/<int:meeting_id>/status', methods=['PUT'])
def update_meeting_status(meeting_id):
    data = request.get_json() or {}
    new_status = (data.get('status') or '').strip()
    meeting_link = (data.get('meeting_link') or '').strip()
    mentor_notes = (data.get('mentor_notes') or '').strip()

    if new_status not in ['Requested', 'Approved', 'Rejected', 'Completed']:
        return jsonify({'error': 'Invalid meeting status.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM mentor_meetings WHERE id = ?", (meeting_id,))
    meeting = cursor.fetchone()
    if not meeting:
        conn.close()
        return jsonify({'error': 'Meeting record not found.'}), 404

    if new_status == 'Approved' and not meeting_link:
        meeting_link = "https://meet.google.com/vzk-ymjw-qda"

    cursor.execute("""
        UPDATE mentor_meetings
        SET status = ?, meeting_link = ?, mentor_notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (new_status, meeting_link, mentor_notes, meeting_id))

    cursor.execute("""
        INSERT INTO mentor_audit_logs (student_id, usn, action_type, performed_by, role, description)
        VALUES (?, ?, 'MEETING_STATUS_CHANGED', 'Dr. K. V. Sharma', 'faculty', ?)
    """, (meeting['student_id'], meeting['usn'], f"Meeting #{meeting_id} status changed to {new_status}."))

    conn.commit()
    conn.close()
    return jsonify({'message': f'Meeting marked as {new_status}.', 'meeting_link': meeting_link})

@app.route('/api/mentor/mentor-book', methods=['GET'])
def get_digital_mentor_book():
    student_id = scoped_student_id(request.args.get('student_id'))

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.*, u.email as user_email, u.name as user_name, u.identifier as user_usn,
               a.group_name, a.assigned_date, a.academic_year,
               m.id as mentor_id, m.name as mentor_name, m.faculty_id as mentor_faculty_id,
               m.department as mentor_department, m.designation as mentor_designation,
               m.email as mentor_email, m.phone as mentor_phone, m.office_room as mentor_office
        FROM student_profiles p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN mentor_assignments a ON a.student_id = p.user_id
        LEFT JOIN faculty_mentors m ON a.mentor_id = m.id
        WHERE p.user_id = ?
    """, (student_id,))
    student_info = cursor.fetchone()

    if not student_info:
        cursor.execute("""
            SELECT p.*, u.email as user_email, u.name as user_name, u.identifier as user_usn,
                   a.group_name, a.assigned_date, a.academic_year,
                   m.id as mentor_id, m.name as mentor_name, m.faculty_id as mentor_faculty_id,
                   m.department as mentor_department, m.designation as mentor_designation,
                   m.email as mentor_email, m.phone as mentor_phone, m.office_room as mentor_office
            FROM student_profiles p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN mentor_assignments a ON a.student_id = p.user_id
            LEFT JOIN faculty_mentors m ON a.mentor_id = m.id
            LIMIT 1
        """)
        student_info = cursor.fetchone()

    info_dict = dict(student_info) if student_info else {}

    cursor.execute("SELECT * FROM semester_gpa_history WHERE student_id = ? ORDER BY semester ASC", (student_id,))
    gpa_history = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM academic_marks WHERE user_id = ? ORDER BY semester DESC, course_code ASC", (student_id,))
    marks_records = [dict(m) for m in cursor.fetchall()]

    cursor.execute("SELECT * FROM attendance WHERE user_id = ? ORDER BY course_code ASC", (student_id,))
    attendance_records = [dict(a) for a in cursor.fetchall()]

    total_conducted = sum(r.get('total_hours', 0) for r in attendance_records)
    total_attended = sum(r.get('attended_hours', 0) for r in attendance_records)
    total_od = sum(r.get('od_hours', 0) for r in attendance_records)
    overall_att_pct = round((total_attended / total_conducted * 100), 2) if total_conducted > 0 else 88.4

    cursor.execute("SELECT * FROM mentor_book_sessions WHERE student_id = ? ORDER BY session_date DESC, id DESC", (student_id,))
    sessions = [dict(s) for s in cursor.fetchall()]

    cursor.execute("SELECT * FROM mentor_book_development WHERE student_id = ?", (student_id,))
    dev_row = cursor.fetchone()
    development = dict(dev_row) if dev_row else {
        'technical_skills': 'Python, Go, C++, React.js, Docker, Git',
        'projects': 'Autonomous Drone Telemetry Mesh',
        'certifications': 'AWS Certified Cloud Practitioner',
        'internship_details': 'Systems Software Intern at CloudPulse Technologies',
        'achievements': 'First Runner-Up at National Smart Campus Hackathon',
        'extracurricular_activities': 'Technical Lead at CSE Open Source Society'
    }

    cursor.execute("SELECT * FROM mentor_book_remarks WHERE student_id = ? ORDER BY semester DESC", (student_id,))
    remarks = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM mentor_student_feedback WHERE student_id = ? ORDER BY submitted_at DESC", (student_id,))
    feedback_list = [dict(f) for f in cursor.fetchall()]

    cursor.execute("SELECT * FROM mentor_audit_logs WHERE student_id = ? ORDER BY created_at DESC LIMIT 15", (student_id,))
    audit_logs = [dict(l) for l in cursor.fetchall()]

    conn.close()

    return jsonify({
        'student_info': info_dict,
        'academics': {
            'cgpa': info_dict.get('cgpa', 9.12),
            'gpa_history': gpa_history,
            'subject_marks': marks_records
        },
        'attendance': {
            'overall_percentage': overall_att_pct,
            'total_conducted': total_conducted,
            'total_attended': total_attended,
            'total_od': total_od,
            'records': attendance_records,
            'status': 'Eligible for Examinations' if overall_att_pct >= 75.0 else 'Shortage Alert'
        },
        'sessions': sessions,
        'development': development,
        'remarks': remarks,
        'feedback': feedback_list,
        'audit_logs': audit_logs
    })

@app.route('/api/mentor/mentor-book/session', methods=['POST'])
def add_mentor_book_session():
    data = request.get_json() or {}
    student_id = scoped_student_id(data.get('student_id'))
    usn = scoped_usn(data.get('usn'))
    student_name = scoped_name(data.get('student_name'))
    mentor_id = data.get('mentor_id', 1)
    session_date = (data.get('session_date') or '').strip()
    session_type = (data.get('session_type') or 'Progress Review').strip()
    semester = data.get('semester', 6)
    topics = (data.get('topics_discussed') or '').strip()
    concerns = (data.get('student_concerns') or '').strip()
    suggestions = (data.get('mentor_suggestions') or '').strip()
    action_items = (data.get('action_items') or '').strip()
    next_date = (data.get('next_meeting_date') or '').strip()
    recorded_by = (data.get('recorded_by') or 'Dr. K. V. Sharma (Faculty Mentor)').strip()

    if not session_date or not topics or not suggestions:
        return jsonify({'error': 'Session date, topics discussed, and mentor suggestions are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO mentor_book_sessions (student_id, usn, student_name, mentor_id, session_date, session_type, semester, topics_discussed, student_concerns, mentor_suggestions, action_items, next_meeting_date, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (student_id, usn, student_name, mentor_id, session_date, session_type, semester, topics, concerns, suggestions, action_items, next_date, recorded_by))

    cursor.execute("""
        INSERT INTO mentor_audit_logs (student_id, usn, action_type, performed_by, role, description)
        VALUES (?, ?, 'SESSION_RECORDED', ?, 'faculty', ?)
    """, (student_id, usn, recorded_by, f"Logged {session_type} mentoring session for Semester {semester} on {session_date}."))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Mentoring session record added successfully.'}), 201

@app.route('/api/mentor/mentor-book/remarks', methods=['PUT'])
def update_mentor_remarks():
    data = request.get_json() or {}
    student_id = scoped_student_id(data.get('student_id'))
    usn = scoped_usn(data.get('usn'))
    semester = data.get('semester', 6)
    mentor_id = data.get('mentor_id', 1)
    obs = (data.get('academic_observations') or '').strip()
    strengths = (data.get('strengths') or '').strip()
    weaknesses = (data.get('weaknesses') or '').strip()
    improvement = (data.get('areas_requiring_improvement') or '').strip()
    recs = (data.get('mentor_recommendations') or '').strip()
    followup = (data.get('follow_up_notes') or '').strip()
    updated_by = (data.get('updated_by') or 'Dr. K. V. Sharma (Chief Academic Mentor)').strip()

    if not obs or not recs:
        return jsonify({'error': 'Academic observations and mentor recommendations are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO mentor_book_remarks (student_id, usn, semester, mentor_id, academic_observations, strengths, weaknesses, areas_requiring_improvement, mentor_recommendations, follow_up_notes, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(student_id, semester) DO UPDATE SET
            academic_observations = excluded.academic_observations,
            strengths = excluded.strengths,
            weaknesses = excluded.weaknesses,
            areas_requiring_improvement = excluded.areas_requiring_improvement,
            mentor_recommendations = excluded.mentor_recommendations,
            follow_up_notes = excluded.follow_up_notes,
            updated_by = excluded.updated_by,
            updated_at = CURRENT_TIMESTAMP
    """, (student_id, usn, semester, mentor_id, obs, strengths, weaknesses, improvement, recs, followup, updated_by))

    cursor.execute("""
        INSERT INTO mentor_audit_logs (student_id, usn, action_type, performed_by, role, description)
        VALUES (?, ?, 'REMARKS_UPDATED', ?, 'faculty', ?)
    """, (student_id, usn, updated_by, f"Updated official mentor remarks for Semester {semester}."))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Official mentor remarks updated successfully.'})

@app.route('/api/mentor/mentor-book/development', methods=['PUT'])
def update_student_development():
    data = request.get_json() or {}
    student_id = scoped_student_id(data.get('student_id'))
    usn = scoped_usn(data.get('usn'))
    skills = (data.get('technical_skills') or '').strip()
    projects = (data.get('projects') or '').strip()
    certifications = (data.get('certifications') or '').strip()
    internships = (data.get('internship_details') or '').strip()
    achievements = (data.get('achievements') or '').strip()
    extracurricular = (data.get('extracurricular_activities') or '').strip()
    updated_by = g.user['name']

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO mentor_book_development (student_id, usn, technical_skills, projects, certifications, internship_details, achievements, extracurricular_activities, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(student_id) DO UPDATE SET
            technical_skills = excluded.technical_skills,
            projects = excluded.projects,
            certifications = excluded.certifications,
            internship_details = excluded.internship_details,
            achievements = excluded.achievements,
            extracurricular_activities = excluded.extracurricular_activities,
            updated_by = excluded.updated_by,
            updated_at = CURRENT_TIMESTAMP
    """, (student_id, usn, skills, projects, certifications, internships, achievements, extracurricular, updated_by))

    cursor.execute("""
        INSERT INTO mentor_audit_logs (student_id, usn, action_type, performed_by, role, description)
        VALUES (?, ?, 'DEVELOPMENT_UPDATED', ?, 'student', 'Updated student technical skills and development portfolio.')
    """, (student_id, usn, updated_by))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Student development records updated successfully.'})

@app.route('/api/mentor/mentor-book/feedback', methods=['POST'])
def submit_student_feedback():
    data = request.get_json() or {}
    student_id = scoped_student_id(data.get('student_id'))
    usn = scoped_usn(data.get('usn'))
    student_name = scoped_name(data.get('student_name'))
    mentor_id = data.get('mentor_id', 1)
    meeting_id = data.get('meeting_id')
    title = (data.get('session_title') or 'Mentoring Guidance Session').strip()
    rating = data.get('rating', 5)
    usefulness = (data.get('usefulness') or 'Highly Beneficial').strip()
    feedback_text = (data.get('feedback_text') or '').strip()
    suggestions = (data.get('suggestions') or '').strip()

    if not feedback_text:
        return jsonify({'error': 'Feedback text is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO mentor_student_feedback (student_id, usn, student_name, mentor_id, meeting_id, session_title, rating, usefulness, feedback_text, suggestions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (student_id, usn, student_name, mentor_id, meeting_id, title, rating, usefulness, feedback_text, suggestions))

    cursor.execute("""
        INSERT INTO mentor_audit_logs (student_id, usn, action_type, performed_by, role, description)
        VALUES (?, ?, 'FEEDBACK_SUBMITTED', ?, 'student', ?)
    """, (student_id, usn, student_name, f"Submitted {rating}-star mentoring session feedback for '{title}'."))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Mentoring session feedback recorded successfully.'}), 201

@app.route('/api/mentor/admin/overview', methods=['GET'])
def get_admin_mentor_overview():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT m.*, COUNT(a.id) as mentees_count
        FROM faculty_mentors m
        LEFT JOIN mentor_assignments a ON m.id = a.mentor_id
        GROUP BY m.id
        ORDER BY m.id ASC
    """)
    mentors = [dict(m) for m in cursor.fetchall()]

    cursor.execute("""
        SELECT a.*, p.cgpa, p.overall_attendance, p.email, p.phone, m.name as mentor_name, m.faculty_id as mentor_faculty_id
        FROM mentor_assignments a
        LEFT JOIN student_profiles p ON a.student_id = p.user_id
        LEFT JOIN faculty_mentors m ON a.mentor_id = m.id
        ORDER BY a.group_name ASC, a.student_name ASC
    """)
    assigned_students = [dict(s) for s in cursor.fetchall()]

    cursor.execute("""
        SELECT a.group_name, a.mentor_id, m.name as mentor_name, a.department, a.semester, a.academic_year,
               COUNT(a.id) as total_students
        FROM mentor_assignments a
        LEFT JOIN faculty_mentors m ON a.mentor_id = m.id
        GROUP BY a.group_name, a.mentor_id
        ORDER BY a.group_name ASC
    """)
    groups = [dict(g) for g in cursor.fetchall()]

    cursor.execute("SELECT COUNT(*) FROM faculty_mentors")
    total_mentors = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM mentor_assignments")
    total_assigned_students = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM mentor_book_sessions")
    total_sessions_logged = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM mentor_meetings WHERE status = 'Requested'")
    pending_meetings = cursor.fetchone()[0]

    cursor.execute("SELECT AVG(rating) FROM mentor_student_feedback")
    avg_feedback_rating = round(cursor.fetchone()[0] or 5.0, 2)

    cursor.execute("SELECT COUNT(*) FROM mentor_discussions")
    total_discussions = cursor.fetchone()[0]

    cursor.execute("SELECT * FROM mentor_audit_logs ORDER BY created_at DESC LIMIT 20")
    audit_logs = [dict(l) for l in cursor.fetchall()]

    conn.close()

    return jsonify({
        'mentors': mentors,
        'assigned_students': assigned_students,
        'groups': groups,
        'metrics': {
            'total_mentors': total_mentors,
            'total_assigned_students': total_assigned_students,
            'total_sessions_logged': total_sessions_logged,
            'pending_meetings': pending_meetings,
            'avg_feedback_rating': avg_feedback_rating,
            'total_discussions': total_discussions
        },
        'audit_logs': audit_logs
    })

@app.route('/api/mentor/admin/assign', methods=['POST'])
def admin_assign_mentor():
    data = request.get_json() or {}
    student_id = data.get('student_id')
    mentor_id = data.get('mentor_id')
    group_name = (data.get('group_name') or 'CSE Batch 2021-2025 Mentor Group A').strip()

    if not student_id or not mentor_id:
        return jsonify({'error': 'Student ID and Mentor ID are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT name, identifier, department, semester FROM users WHERE id = ?", (student_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({'error': 'Student user record not found.'}), 404

    cursor.execute("SELECT name FROM faculty_mentors WHERE id = ?", (mentor_id,))
    mentor = cursor.fetchone()
    if not mentor:
        conn.close()
        return jsonify({'error': 'Faculty mentor not found.'}), 404

    cursor.execute("""
        INSERT INTO mentor_assignments (student_id, usn, student_name, department, semester, section, mentor_id, group_name, assigned_date, academic_year, status)
        VALUES (?, ?, ?, ?, ?, 'B', ?, ?, CURRENT_DATE, '2025-2026', 'Active')
        ON CONFLICT(student_id) DO UPDATE SET
            mentor_id = excluded.mentor_id,
            group_name = excluded.group_name,
            assigned_date = CURRENT_DATE,
            status = 'Active'
    """, (student_id, user['identifier'], user['name'], user['department'], user['semester'] or 6, mentor_id, group_name))

    cursor.execute("""
        INSERT INTO mentor_audit_logs (student_id, usn, action_type, performed_by, role, description)
        VALUES (?, ?, 'MENTOR_REASSIGNED', 'Dean Academics', 'admin', ?)
    """, (student_id, user['identifier'], f"Assigned mentor {mentor['name']} (Group: {group_name}) to {user['name']}."))

    conn.commit()
    conn.close()
    return jsonify({'message': f"Assigned mentor {mentor['name']} to student {user['name']} successfully."})

@app.route('/api/mentor/mentees', methods=['GET'])
def get_faculty_mentees():
    mentor_id = request.args.get('mentor_id', 1, type=int)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.*, p.cgpa, p.overall_attendance, p.email, p.phone,
               (SELECT session_date FROM mentor_book_sessions WHERE student_id = a.student_id ORDER BY session_date DESC LIMIT 1) as last_session_date
        FROM mentor_assignments a
        LEFT JOIN student_profiles p ON a.student_id = p.user_id
        WHERE a.mentor_id = ?
        ORDER BY a.student_name ASC
    """, (mentor_id,))
    mentees = [dict(m) for m in cursor.fetchall()]
    conn.close()
    return jsonify(mentees)

# ==========================================================
# 20. FEES MANAGEMENT MODULE ENDPOINTS
# ==========================================================

import uuid


def _generate_txn_id():
    return f"TXN-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def _generate_receipt_number():
    return f"RCP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"


@app.route('/api/fees/student-details', methods=['GET'])
def get_student_fee_details():
    """Return student profile + fee summary for a given semester."""
    student_id = fee_student_id(request.args.get('student_id'))
    semester = request.args.get('semester', type=int)
    academic_year = request.args.get('academic_year', '2025-2026')

    conn = get_db()
    cursor = conn.cursor()

    # Resolve student profile
    cursor.execute("""
        SELECT p.*, u.name, u.identifier as usn_u, u.department as dept_u, u.semester as sem_u
        FROM student_profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
    """, (student_id,))
    profile = cursor.fetchone()
    if not profile:
        cursor.execute("""
            SELECT p.*, u.name, u.identifier as usn_u, u.department as dept_u, u.semester as sem_u
            FROM student_profiles p
            JOIN users u ON p.user_id = u.id
            LIMIT 1
        """)
        profile = cursor.fetchone()

    if not profile:
        conn.close()
        return jsonify({'error': 'Student profile not found.'}), 404

    profile_dict = dict(profile)
    target_sem = semester or profile_dict.get('sem_u') or profile_dict.get('semester', 6)

    # Fetch fee records for target semester
    cursor.execute("""
        SELECT r.*, fs.due_date, fs.description, fs.partial_payment_allowed
        FROM student_fee_records r
        JOIN fee_structures fs ON r.fee_structure_id = fs.id
        WHERE r.student_id = ? AND r.semester = ? AND r.academic_year = ?
        ORDER BY r.fee_category ASC
    """, (student_id, target_sem, academic_year))
    fee_records = [dict(r) for r in cursor.fetchall()]

    if not fee_records:
        # Build from structure if no personal record exists
        cursor.execute("""
            SELECT * FROM fee_structures
            WHERE department = ? AND semester = ? AND academic_year = ? AND is_active = 1
            ORDER BY fee_category ASC
        """, (profile_dict.get('dept_u', 'Computer Science & Engineering'), target_sem, academic_year))
        structures = cursor.fetchall()
        fee_records = [{
            **dict(s),
            'fee_structure_id': s['id'],
            'amount_paid': 0.0,
            'outstanding_amount': s['total_amount'],
            'payment_status': 'Pending',
            'student_id': student_id,
        } for s in structures]

    total_payable = sum(r['total_amount'] for r in fee_records)
    total_paid = sum(r['amount_paid'] for r in fee_records)
    total_outstanding = sum(r['outstanding_amount'] for r in fee_records)

    # Available semesters for this student
    cursor.execute("""
        SELECT DISTINCT semester FROM student_fee_records
        WHERE student_id = ? ORDER BY semester DESC
    """, (student_id,))
    available_sems = [row['semester'] for row in cursor.fetchall()] or [target_sem]

    conn.close()

    return jsonify({
        'student': {
            'name': profile_dict.get('name', g.user['name']),
            'usn': profile_dict.get('usn') or profile_dict.get('usn_u', g.user['identifier']),
            'department': profile_dict.get('department') or profile_dict.get('dept_u'),
            'semester': target_sem,
            'academic_year': academic_year,
            'section': profile_dict.get('section', 'B'),
            'cgpa': profile_dict.get('cgpa', 9.12),
        },
        'fee_records': fee_records,
        'summary': {
            'total_payable': round(total_payable, 2),
            'total_paid': round(total_paid, 2),
            'total_outstanding': round(total_outstanding, 2),
            'semester': target_sem,
            'academic_year': academic_year,
        },
        'available_semesters': available_sems,
    })


@app.route('/api/fees/payment/initiate', methods=['POST'])
def initiate_fee_payment():
    """
    Initiate a demo payment transaction.
    In production this would call a real payment gateway and return a session/order ID.
    Here we return a demo order_id and the full amount for client to confirm.
    We do NOT mark the transaction as Successful at this stage.
    """
    data = request.get_json() or {}
    student_id = fee_student_id(data.get('student_id'))
    semester = data.get('semester', 6)
    academic_year = data.get('academic_year', '2025-2026')
    selected_record_ids = data.get('selected_record_ids', [])  # list of student_fee_record ids
    payment_amount = data.get('payment_amount', 0.0)
    payment_method = data.get('payment_method', 'Demo')

    if payment_amount <= 0:
        return jsonify({'error': 'Payment amount must be greater than zero.'}), 400
    if not selected_record_ids:
        return jsonify({'error': 'At least one fee component must be selected for payment.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Validate records belong to this student
    placeholders = ','.join(['?' for _ in selected_record_ids])
    cursor.execute(f"""
        SELECT id, fee_category, outstanding_amount FROM student_fee_records
        WHERE id IN ({placeholders}) AND student_id = ?
    """, selected_record_ids + [student_id])
    records = cursor.fetchall()
    if len(records) != len(selected_record_ids):
        conn.close()
        return jsonify({'error': 'Invalid fee record selection.'}), 400

    total_outstanding = sum(r['outstanding_amount'] for r in records)
    if payment_amount > total_outstanding + 0.01:
        conn.close()
        return jsonify({'error': f'Payment amount Rs. {payment_amount:,.2f} exceeds outstanding balance Rs. {total_outstanding:,.2f}.'}), 400

    # Build breakdown
    breakdown = {r['fee_category']: min(r['outstanding_amount'], payment_amount) for r in records}
    fee_categories_str = ', '.join(breakdown.keys())

    # Create a PENDING transaction record
    txn_id = _generate_txn_id()

    cursor.execute("""
        SELECT student_name FROM student_fee_records WHERE student_id = ? LIMIT 1
    """, (student_id,))
    srow = cursor.fetchone()
    student_name = srow['student_name'] if srow else g.user['name']

    cursor.execute("""
        SELECT usn FROM student_fee_records WHERE student_id = ? LIMIT 1
    """, (student_id,))
    urow = cursor.fetchone()
    usn = urow['usn'] if urow else g.user['identifier']

    cursor.execute("""
        INSERT INTO fee_transactions
        (transaction_id, student_id, usn, student_name, payment_amount, payment_method,
         payment_status, gateway_reference, payment_date, receipt_number, payment_breakdown,
         fee_categories, academic_year, semester, remarks)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', '', '', NULL, ?, ?, ?, ?, 'Payment initiated. Awaiting gateway confirmation.')
    """, (txn_id, student_id, usn, student_name, payment_amount, payment_method,
          json.dumps(breakdown), fee_categories_str, academic_year, semester))

    conn.commit()
    txn_db_id = cursor.lastrowid
    conn.close()

    # Return demo order details for the client to display the payment confirmation screen
    return jsonify({
        'order_id': txn_id,
        'transaction_id': txn_id,
        'fee_categories': fee_categories_str,
        'transaction_db_id': txn_db_id,
        'payment_amount': payment_amount,
        'payment_method': payment_method,
        'fee_breakdown': breakdown,
        'status': 'Pending',
        'demo_mode': True,
        'message': 'Demo payment initiated. Confirm payment to simulate gateway approval.',
    }), 201


@app.route('/api/fees/payment/confirm', methods=['POST'])
def confirm_fee_payment():
    """
    Confirm a pending payment (demo mode: always succeeds).
    In production: verify gateway webhook/callback before calling this.
    Updates student_fee_records and marks transaction as Successful.
    """
    data = request.get_json() or {}
    transaction_id = data.get('transaction_id') or data.get('order_id', '')
    selected_record_ids = data.get('selected_record_ids', [])
    payment_amount = data.get('payment_amount', 0.0)
    simulate_failure = data.get('simulate_failure', False)  # for testing failed path

    if not transaction_id:
        return jsonify({'error': 'Transaction ID is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM fee_transactions WHERE transaction_id = ?", (transaction_id,))
    txn = cursor.fetchone()
    if not txn or (txn['student_id'] != uid() and g.user['role'] != 'admin'):
        conn.close()
        return jsonify({'error': 'Transaction record not found.'}), 404
    if txn['payment_status'] != 'Pending':
        conn.close()
        return jsonify({'error': f"Transaction already in status: {txn['payment_status']}."}), 400

    if simulate_failure:
        cursor.execute("""
            UPDATE fee_transactions SET payment_status = 'Failed',
            remarks = 'Payment failed: Gateway returned error code 402. No funds debited.',
            payment_date = ?
            WHERE transaction_id = ?
        """, (datetime.now().strftime('%Y-%m-%d'), transaction_id))
        conn.commit()
        conn.close()
        return jsonify({
            'success': False,
            'transaction_id': transaction_id,
            'status': 'Failed',
            'message': 'Payment failed. No amount has been debited from your account.',
        })

    # Success path: update each fee record proportionally
    if selected_record_ids:
        placeholders = ','.join(['?' for _ in selected_record_ids])
        cursor.execute(f"""
            SELECT id, fee_category, outstanding_amount, amount_paid, total_amount
            FROM student_fee_records
            WHERE id IN ({placeholders})
        """, selected_record_ids)
        records = cursor.fetchall()

        remaining = float(payment_amount)
        for r in records:
            if remaining <= 0:
                break
            deduct = min(float(r['outstanding_amount']), remaining)
            new_paid = round(float(r['amount_paid']) + deduct, 2)
            new_outstanding = round(float(r['total_amount']) - new_paid, 2)
            new_status = 'Paid' if new_outstanding <= 0.01 else 'Partial'
            cursor.execute("""
                UPDATE student_fee_records
                SET amount_paid = ?, outstanding_amount = ?, payment_status = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_paid, new_outstanding, new_status, r['id']))
            remaining -= deduct

    # Generate receipt and mark successful
    receipt_no = _generate_receipt_number()
    gateway_ref = f"DEMO-GW-{uuid.uuid4().hex[:10].upper()}"
    cursor.execute("""
        UPDATE fee_transactions
        SET payment_status = 'Successful',
            gateway_reference = ?,
            payment_date = ?,
            receipt_number = ?,
            remarks = 'Payment confirmed via demo gateway. Transaction successful.'
        WHERE transaction_id = ?
    """, (gateway_ref, datetime.now().strftime('%Y-%m-%d'), receipt_no, transaction_id))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'transaction_id': transaction_id,
        'receipt_number': receipt_no,
        'gateway_reference': gateway_ref,
        'status': 'Successful',
        'payment_amount': payment_amount,
        'payment_date': datetime.now().strftime('%Y-%m-%d'),
        'message': 'Payment confirmed and recorded successfully. Download your receipt below.',
    })


@app.route('/api/fees/transactions', methods=['GET'])
def get_fee_transactions():
    """Return payment transaction history for a student or all (admin)."""
    student_id = fee_student_id(request.args.get('student_id'))
    role = g.user['role']
    semester = request.args.get('semester', type=int)
    academic_year = request.args.get('academic_year', '')

    conn = get_db()
    cursor = conn.cursor()

    if role == 'admin':
        query = "SELECT * FROM fee_transactions WHERE 1=1"
        params = []
    else:
        query = "SELECT * FROM fee_transactions WHERE student_id = ?"
        params = [student_id]

    if semester:
        query += " AND semester = ?"
        params.append(semester)
    if academic_year:
        query += " AND academic_year = ?"
        params.append(academic_year)

    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    txns = [dict(t) for t in cursor.fetchall()]

    # Decode payment_breakdown JSON for each
    for t in txns:
        try:
            t['payment_breakdown'] = json.loads(t['payment_breakdown']) if t['payment_breakdown'] else {}
        except Exception:
            t['payment_breakdown'] = {}

    conn.close()
    return jsonify(txns)


@app.route('/api/fees/receipt/<string:transaction_id>', methods=['GET'])
def get_fee_receipt(transaction_id):
    """Return receipt details for a successful transaction."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM fee_transactions WHERE transaction_id = ?", (transaction_id,))
    txn = cursor.fetchone()
    conn.close()

    if not txn or (txn['student_id'] != uid() and g.user['role'] != 'admin'):
        return jsonify({'error': 'Transaction not found.'}), 404
    if txn['payment_status'] != 'Successful':
        return jsonify({'error': f"Receipt not available for transactions with status '{txn['payment_status']}'."}), 400

    txn_dict = dict(txn)
    try:
        txn_dict['payment_breakdown'] = json.loads(txn_dict['payment_breakdown'])
    except Exception:
        txn_dict['payment_breakdown'] = {}

    return jsonify(txn_dict)


@app.route('/api/fees/structures', methods=['GET'])
def get_fee_structures():
    """Return fee structures (admin uses department/semester filter)."""
    department = request.args.get('department', '')
    semester = request.args.get('semester', type=int)
    academic_year = request.args.get('academic_year', '2025-2026')

    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM fee_structures WHERE academic_year = ?"
    params = [academic_year]
    if department:
        query += " AND department = ?"
        params.append(department)
    if semester:
        query += " AND semester = ?"
        params.append(semester)
    query += " ORDER BY department ASC, semester ASC, fee_category ASC"

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify(rows)


@app.route('/api/fees/structures', methods=['POST'])
def add_fee_structure():
    """Admin: add a new fee structure."""
    data = request.get_json() or {}
    department = (data.get('department') or '').strip()
    semester = data.get('semester')
    academic_year = (data.get('academic_year') or '2025-2026').strip()
    fee_category = (data.get('fee_category') or '').strip()
    total_amount = data.get('total_amount', 0.0)
    due_date = (data.get('due_date') or '').strip()
    description = (data.get('description') or '').strip()
    partial_allowed = 1 if data.get('partial_payment_allowed', True) else 0

    if not all([department, semester, fee_category, due_date]) or total_amount <= 0:
        return jsonify({'error': 'Department, semester, fee category, amount, and due date are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO fee_structures
            (department, semester, academic_year, fee_category, total_amount, due_date,
             description, is_active, partial_payment_allowed)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (department, semester, academic_year, fee_category,
              total_amount, due_date, description, partial_allowed))
        conn.commit()
        new_id = cursor.lastrowid
    except Exception as e:
        conn.close()
        return jsonify({'error': f'Fee structure already exists or data conflict: {str(e)}'}), 409
    conn.close()
    return jsonify({'message': 'Fee structure added successfully.', 'id': new_id}), 201


@app.route('/api/fees/structures/<int:structure_id>', methods=['PUT'])
def update_fee_structure(structure_id):
    """Admin: update an existing fee structure."""
    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM fee_structures WHERE id = ?", (structure_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Fee structure not found.'}), 404

    total_amount = data.get('total_amount', existing['total_amount'])
    due_date = data.get('due_date', existing['due_date'])
    description = data.get('description', existing['description'])
    is_active = 1 if data.get('is_active', existing['is_active']) else 0
    partial_allowed = 1 if data.get('partial_payment_allowed', existing['partial_payment_allowed']) else 0

    cursor.execute("""
        UPDATE fee_structures
        SET total_amount = ?, due_date = ?, description = ?,
            is_active = ?, partial_payment_allowed = ?
        WHERE id = ?
    """, (total_amount, due_date, description, is_active, partial_allowed, structure_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Fee structure updated successfully.'})


@app.route('/api/fees/admin/overview', methods=['GET'])
def get_admin_fees_overview():
    """Admin overview: collection stats, pending payments, department summaries."""
    academic_year = request.args.get('academic_year', '2025-2026')

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as total_records,
            SUM(total_amount) as total_payable,
            SUM(amount_paid) as total_collected,
            SUM(outstanding_amount) as total_outstanding
        FROM student_fee_records
        WHERE academic_year = ?
    """, (academic_year,))
    overall = dict(cursor.fetchone())

    cursor.execute("""
        SELECT department, semester,
            SUM(total_amount) as payable,
            SUM(amount_paid) as collected,
            SUM(outstanding_amount) as outstanding,
            COUNT(*) as students
        FROM student_fee_records
        WHERE academic_year = ?
        GROUP BY department, semester
        ORDER BY department, semester
    """, (academic_year,))
    dept_summary = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT fee_category,
            SUM(total_amount) as payable,
            SUM(amount_paid) as collected,
            SUM(outstanding_amount) as outstanding
        FROM student_fee_records
        WHERE academic_year = ?
        GROUP BY fee_category
    """, (academic_year,))
    category_summary = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT student_id, usn, student_name, department, semester,
            SUM(outstanding_amount) as total_outstanding
        FROM student_fee_records
        WHERE academic_year = ? AND payment_status != 'Paid'
        GROUP BY student_id
        HAVING total_outstanding > 0
        ORDER BY total_outstanding DESC
    """, (academic_year,))
    pending_students = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT COUNT(*) as total_txns,
            SUM(CASE WHEN payment_status = 'Successful' THEN payment_amount ELSE 0 END) as successful_amount,
            COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN payment_status = 'Failed' THEN 1 END) as failed_count
        FROM fee_transactions
        WHERE academic_year = ?
    """, (academic_year,))
    txn_stats = dict(cursor.fetchone())

    conn.close()

    return jsonify({
        'overall': overall,
        'dept_summary': dept_summary,
        'category_summary': category_summary,
        'pending_students': pending_students,
        'transaction_stats': txn_stats,
        'academic_year': academic_year,
    })


@app.route('/api/fees/report', methods=['GET'])
def get_fee_report():
    """Return a complete fee report for a student."""
    student_id = fee_student_id(request.args.get('student_id'))
    academic_year = request.args.get('academic_year', '2025-2026')

    conn = get_db()
    cursor = conn.cursor()

    # All semesters for this student
    cursor.execute("""
        SELECT semester,
            SUM(total_amount) as payable,
            SUM(amount_paid) as paid,
            SUM(outstanding_amount) as outstanding
        FROM student_fee_records
        WHERE student_id = ? AND academic_year = ?
        GROUP BY semester
        ORDER BY semester DESC
    """, (student_id, academic_year))
    semester_summary = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT fee_category,
            SUM(total_amount) as payable,
            SUM(amount_paid) as paid,
            SUM(outstanding_amount) as outstanding
        FROM student_fee_records
        WHERE student_id = ? AND academic_year = ?
        GROUP BY fee_category
        ORDER BY fee_category
    """, (student_id, academic_year))
    category_breakdown = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT SUM(total_amount), SUM(amount_paid), SUM(outstanding_amount)
        FROM student_fee_records
        WHERE student_id = ? AND academic_year = ?
    """, (student_id, academic_year))
    r = cursor.fetchone()
    totals = {'payable': r[0] or 0, 'paid': r[1] or 0, 'outstanding': r[2] or 0}

    cursor.execute("""
        SELECT * FROM fee_transactions WHERE student_id = ? AND academic_year = ?
        ORDER BY created_at DESC
    """, (student_id, academic_year))
    transactions = [dict(t) for t in cursor.fetchall()]
    for t in transactions:
        try:
            t['payment_breakdown'] = json.loads(t['payment_breakdown'])
        except Exception:
            t['payment_breakdown'] = {}

    cursor.execute("""
        SELECT a.*, s.name as scholarship_name, s.max_amount, s.scholarship_type
        FROM scholarship_applications a
        JOIN scholarships s ON a.scholarship_id = s.id
        WHERE a.student_id = ?
        ORDER BY a.submitted_at DESC
    """, (student_id,))
    scholarships = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, name, identifier as usn, department, semester, email FROM users WHERE id = ?", (student_id,))
    st_row = cursor.fetchone()
    student = dict(st_row) if st_row else {
        'id': student_id, 'name': '', 'usn': '', 'department': '', 'semester': 0
    }

    conn.close()

    return jsonify({
        'student': student,
        'semester_summary': semester_summary,
        'category_breakdown': category_breakdown,
        'totals': totals,
        'transactions': transactions,
        'scholarships': scholarships,
        'academic_year': academic_year,
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    })


@app.route('/api/fees/scholarships', methods=['GET'])
def get_scholarships():
    """Return available scholarships."""
    academic_year = request.args.get('academic_year', '2025-2026')
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM scholarships
        WHERE academic_year = ? AND is_active = 1
        ORDER BY scholarship_type, name
    """, (academic_year,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify(rows)


@app.route('/api/fees/scholarships', methods=['POST'])
def add_scholarship():
    """Admin: create a new scholarship."""
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    eligibility = (data.get('eligibility_criteria') or '').strip()
    max_amount = data.get('max_amount', 0.0)
    scholarship_type = (data.get('scholarship_type') or 'Merit').strip()
    applicable_dept = (data.get('applicable_departments') or 'All').strip()
    min_cgpa = data.get('min_cgpa', 0.0)
    max_income = data.get('max_family_income', 0.0)
    academic_year = (data.get('academic_year') or '2025-2026').strip()
    deadline = (data.get('application_deadline') or '').strip()

    if not all([name, description, eligibility, deadline]) or max_amount <= 0:
        return jsonify({'error': 'Name, description, eligibility, max amount, and deadline are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scholarships
        (name, description, eligibility_criteria, max_amount, scholarship_type,
         applicable_departments, min_cgpa, max_family_income, academic_year, application_deadline, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    """, (name, description, eligibility, max_amount, scholarship_type,
          applicable_dept, min_cgpa, max_income, academic_year, deadline))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'message': 'Scholarship created successfully.', 'id': new_id}), 201


@app.route('/api/fees/scholarship-applications', methods=['GET'])
def get_scholarship_applications():
    """Return scholarship applications (student: own; admin: all)."""
    student_id = fee_student_id(request.args.get('student_id'))
    role = g.user['role']

    conn = get_db()
    cursor = conn.cursor()

    if role == 'admin':
        cursor.execute("""
            SELECT a.*, s.name as scholarship_name, s.max_amount, s.scholarship_type
            FROM scholarship_applications a
            JOIN scholarships s ON a.scholarship_id = s.id
            ORDER BY a.submitted_at DESC
        """)
    else:
        cursor.execute("""
            SELECT a.*, s.name as scholarship_name, s.max_amount, s.scholarship_type,
                   s.eligibility_criteria
            FROM scholarship_applications a
            JOIN scholarships s ON a.scholarship_id = s.id
            WHERE a.student_id = ?
            ORDER BY a.submitted_at DESC
        """, (student_id,))

    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify(rows)


@app.route('/api/fees/scholarship-applications', methods=['POST'])
def submit_scholarship_application():
    """Student: submit a scholarship application."""
    data = request.get_json() or {}
    scholarship_id = data.get('scholarship_id')
    student_id = fee_student_id(data.get('student_id'))
    application_text = (data.get('application_text') or '').strip()

    if not scholarship_id or not application_text:
        return jsonify({'error': 'Scholarship ID and application statement are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Fetch student profile
    cursor.execute("""
        SELECT p.usn, p.name, p.department, p.semester, p.cgpa
        FROM student_profiles p WHERE p.user_id = ?
    """, (student_id,))
    profile = cursor.fetchone()
    if not profile:
        conn.close()
        return jsonify({'error': 'Student profile not found.'}), 404

    # Prevent duplicate application
    cursor.execute("""
        SELECT id FROM scholarship_applications
        WHERE scholarship_id = ? AND student_id = ?
    """, (scholarship_id, student_id))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'You have already submitted an application for this scholarship.'}), 409

    cursor.execute("""
        INSERT INTO scholarship_applications
        (scholarship_id, student_id, usn, student_name, department, semester, cgpa,
         application_text, supporting_document, status, approved_amount, admin_remarks,
         submitted_at, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 'Submitted', 0.0, '', CURRENT_TIMESTAMP, '')
    """, (scholarship_id, student_id, profile['usn'], profile['name'],
          profile['department'], profile['semester'], profile['cgpa'],
          application_text))

    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'message': 'Scholarship application submitted successfully.', 'id': new_id}), 201


@app.route('/api/fees/scholarship-applications/<int:app_id>/review', methods=['PUT'])
def review_scholarship_application(app_id):
    """Admin: approve, reject, or update a scholarship application."""
    data = request.get_json() or {}
    new_status = (data.get('status') or '').strip()
    admin_remarks = (data.get('admin_remarks') or '').strip()
    approved_amount = data.get('approved_amount', 0.0)

    valid_statuses = ['Submitted', 'Under Review', 'Approved', 'Rejected']
    if new_status not in valid_statuses:
        return jsonify({'error': f"Status must be one of: {', '.join(valid_statuses)}."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scholarship_applications WHERE id = ?", (app_id,))
    app_row = cursor.fetchone()
    if not app_row:
        conn.close()
        return jsonify({'error': 'Application not found.'}), 404

    cursor.execute("""
        UPDATE scholarship_applications
        SET status = ?, admin_remarks = ?, approved_amount = ?,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (new_status, admin_remarks, approved_amount, app_id))

    # If approved, optionally create a fee concession record by reducing outstanding
    if new_status == 'Approved' and approved_amount > 0:
        cursor.execute("""
            UPDATE student_fee_records
            SET amount_paid = MIN(total_amount, amount_paid + ?),
                outstanding_amount = MAX(0, outstanding_amount - ?),
                payment_status = CASE WHEN outstanding_amount - ? <= 0.01 THEN 'Paid' ELSE 'Partial' END,
                last_updated = CURRENT_TIMESTAMP
            WHERE student_id = ? AND fee_category = 'Tuition Fees'
              AND semester = ? AND academic_year = '2025-2026'
        """, (approved_amount, approved_amount, approved_amount,
              app_row['student_id'], app_row['semester']))

    conn.commit()
    conn.close()
    return jsonify({'message': f'Application {new_status.lower()} successfully.'})


# Static React Frontend Serving
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api'):
        return jsonify({'error': 'Not found'}), 404
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    if os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({'message': 'College Student Management Portal API Server Running', 'endpoints': '/api/*'})

if __name__ == '__main__':
    print("Starting Flask Server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
