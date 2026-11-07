"""Roster lookups and the public user shape."""
import os
import re

from flask import g

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
ROLES = ('student', 'faculty', 'admin')


def normalize_email(value):
    return (value or '').strip().lower()


def allowed_domains():
    raw = os.environ.get('ALLOWED_EMAIL_DOMAINS', 'gmail.com')
    return {d.strip().lower().lstrip('@') for d in raw.split(',') if d.strip()}


def email_allowed(email):
    email = normalize_email(email)
    if not EMAIL_RE.match(email):
        return False
    domains = allowed_domains()
    if '*' in domains or not domains:
        return True
    return email.rsplit('@', 1)[1] in domains


def roster_user(conn, email):
    """Active roster user for an allowed email, else None."""
    email = normalize_email(email)
    if not email_allowed(email):
        return None
    row = conn.execute("SELECT * FROM users WHERE email = ? AND active = 1", (email,)).fetchone()
    return row


def classes_for(conn, user_id):
    rows = conn.execute(
        "SELECT id, department, semester, COALESCE(section, 'A') AS section, COALESCE(subject_code, '21CS61') AS subject_code, COALESCE(subject_name, 'Software Engineering') AS subject_name FROM teacher_classes WHERE user_id = ? ORDER BY department, semester, section", (user_id,)
    ).fetchall()
    classes_list = [dict(r) for r in rows] if rows else []

    # Check if teacher is designated as Class Teacher in teacher_profiles
    tprof = conn.execute(
        "SELECT is_class_teacher, class_teacher_dept, class_teacher_sem, class_teacher_section FROM teacher_profiles WHERE user_id = ?",
        (user_id,)
    ).fetchone()

    if tprof and tprof['is_class_teacher'] and tprof['class_teacher_dept'] and tprof['class_teacher_sem']:
        ct_dept = str(tprof['class_teacher_dept']).strip()
        ct_sem = int(tprof['class_teacher_sem'])
        ct_sec = str(tprof['class_teacher_section'] or 'A').strip().upper()

        has_ct = any(
            c.get('department') == ct_dept and int(c.get('semester', 0)) == ct_sem and str(c.get('section', 'A')).upper() == ct_sec
            for c in classes_list
        )
        if not has_ct:
            conn.execute(
                "INSERT INTO teacher_classes (user_id, department, semester, section, subject_code, subject_name) VALUES (?, ?, ?, ?, '21CS71', 'Class Teacher & Core Subject')",
                (user_id, ct_dept, ct_sem, ct_sec)
            )
            conn.commit()
            classes_list.append({
                'department': ct_dept,
                'semester': ct_sem,
                'section': ct_sec,
                'subject_code': '21CS71',
                'subject_name': 'Class Teacher & Core Subject'
            })

    if classes_list:
        return classes_list
    u = conn.execute("SELECT department FROM users WHERE id = ?", (user_id,)).fetchone()
    dept = (u['department'] if u and u['department'] else 'Computer Science & Engineering').strip()
    sem_rows = conn.execute("SELECT DISTINCT semester FROM users WHERE role = 'student' AND department = ? ORDER BY semester", (dept,)).fetchall()
    sems = [r['semester'] for r in sem_rows] if sem_rows else [6]
    for s in sems:
        conn.execute(
            "INSERT INTO teacher_classes (user_id, department, semester, section, subject_code, subject_name) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, dept, s, 'A', '21CS61', 'Software Engineering')
        )
    conn.commit()
    fresh = conn.execute(
        "SELECT id, department, semester, COALESCE(section, 'A') AS section, COALESCE(subject_code, '21CS61') AS subject_code, COALESCE(subject_name, 'Software Engineering') AS subject_name FROM teacher_classes WHERE user_id = ? ORDER BY department, semester", (user_id,)
    ).fetchall()
    return [dict(r) for r in fresh]


def public_user(conn, row):
    user = {
        'id': row['id'],
        'email': row['email'],
        'role': row['role'],
        'name': row['name'],
        'identifier': row['identifier'],
        'department': row['department'],
        'semester': row['semester'],
        'has_password': bool(row['password_hash']),
    }
    onboarded = bool(row.get('onboarding_completed', False))
    if row['role'] == 'student':
        prof = conn.execute("SELECT usn, section, dob, academic_year FROM student_profiles WHERE user_id = ?", (row['id'],)).fetchone()
        user['profile'] = dict(prof) if prof else None
    elif row['role'] in ('faculty', 'admin'):
        prof = conn.execute("SELECT designation, dob, is_class_teacher, class_teacher_dept, class_teacher_sem, class_teacher_section, usn_start, usn_end, cabin_room FROM teacher_profiles WHERE user_id = ?", (row['id'],)).fetchone()
        user['profile'] = dict(prof) if prof else None
        user['classes'] = classes_for(conn, row['id'])
    user['onboarding_completed'] = onboarded
    return user


def current_user():
    return getattr(g, 'user', None)


def current_user_id():
    return g.user['id']


def is_staff():
    return g.user['role'] in ('faculty', 'admin')


def scoped_student_id(requested=None):
    """Students always act as themselves. Staff may name a student, defaulting to themselves."""
    if not is_staff():
        return g.user['id']
    try:
        return int(requested) if requested not in (None, '') else g.user['id']
    except (TypeError, ValueError):
        return g.user['id']


def staff_can_access_student(conn, student_user_id):
    """Admins reach everyone; faculty access students in their assigned branch+semester or department."""
    if g.user['role'] == 'admin':
        return True
    if g.user['role'] != 'faculty':
        return g.user['id'] == student_user_id
    row = conn.execute(
        """SELECT 1 FROM users u JOIN teacher_classes c
           ON c.department = u.department AND c.semester = u.semester
           WHERE u.id = ? AND u.role = 'student' AND c.user_id = ?""",
        (student_user_id, g.user['id']),
    ).fetchone()
    if row:
        return True
    std = conn.execute("SELECT department FROM users WHERE id = ?", (student_user_id,)).fetchone()
    if std and (std['department'] == g.user.get('department') or not g.user.get('department')):
        return True
    return False
    return row is not None


def scoped_usn(requested=None):
    """Students always act as their own USN; staff may name one."""
    if not is_staff():
        return g.user['identifier']
    return (requested or '').strip() or g.user['identifier']


def scoped_name(requested=None):
    if not is_staff():
        return g.user['name']
    return (requested or '').strip() or g.user['name']


def fee_student_id(requested=None):
    """Fee records: admins may name any student; everyone else sees only their own."""
    if g.user['role'] != 'admin':
        return g.user['id']
    try:
        return int(requested) if requested not in (None, '') else g.user['id']
    except (TypeError, ValueError):
        return g.user['id']
