"""Central request guard: every /api/* request needs a valid session unless its endpoint is public.

Role rules live here so the full access policy is readable in one place.
"""
from flask import g, jsonify, request

from database import get_db
from .tokens import verify_token

PUBLIC_ENDPOINTS = {
    'static',
    'serve_upload',
    'serve_frontend',
    'verify_student_credential',
    'auth.config',
    'auth.login',
    'auth.code_request',
    'auth.code_verify',
    'auth.password_reset',
    'auth.google_start',
    'auth.google_callback',
    'auth.google_exchange',
    'auth.signup_request',
    'auth.signup_verify',
}

STAFF = ('faculty', 'admin')
ADMIN = ('admin',)

# endpoint -> roles (all methods) or {METHOD: roles}
ROLE_RULES = {
    # Academics and attendance records
    'update_marks': STAFF,
    'mark_attendance': STAFF,
    'add_timetable_entry': STAFF,
    'update_timetable_entry': STAFF,
    'delete_timetable_entry': STAFF,
    # Assignments, notes, exams
    'create_assignment': STAFF,
    'evaluate_assignment': STAFF,
    'list_assignment_submissions': STAFF,
    'upload_study_material': STAFF,
    'toggle_hall_ticket_publish': STAFF,
    # Placements
    'handle_placement_drives': {'POST': STAFF},
    'update_application_status': STAFF,
    # Projects
    'add_project_feedback': STAFF,
    # Events
    'handle_events': {'POST': STAFF},
    'manage_event': STAFF,
    'upload_event_certificate': STAFF,
    # Library
    'add_library_book': STAFF,
    'update_library_book': STAFF,
    'delete_library_book': STAFF,
    'issue_library_book': STAFF,
    # Campus services
    'toggle_canteen_availability': STAFF,
    # Notifications
    'publish_notification': STAFF,
    'delete_notification': STAFF,
    # Communications and doubts
    'update_appointment_status': STAFF,
    'update_doubt_status': STAFF,
    # Mentoring
    'toggle_pin_discussion': STAFF,
    'delete_discussion': STAFF,
    'update_meeting_status': STAFF,
    'add_mentor_book_session': STAFF,
    'update_mentor_remarks': STAFF,
    'get_faculty_mentees': STAFF,
    'get_admin_mentor_overview': ADMIN,
    'admin_assign_mentor': ADMIN,
    # Fees
    'add_fee_structure': ADMIN,
    'update_fee_structure': ADMIN,
    'get_admin_fees_overview': ADMIN,
    'add_scholarship': ADMIN,
    'review_scholarship_application': ADMIN,
}


PREFIX_RULES = {'teacher.': STAFF, 'admin.': ADMIN}


def roles_for(endpoint, method):
    for prefix, roles in PREFIX_RULES.items():
        if endpoint.startswith(prefix):
            return roles
    rule = ROLE_RULES.get(endpoint)
    if isinstance(rule, dict):
        return rule.get(method)
    return rule


def bearer_token():
    header = request.headers.get('Authorization', '')
    if header.startswith('Bearer '):
        return header[7:].strip()
    return ''


def load_session(endpoint=''):
    """Resolve g.user from the bearer token, or from ?dl= on download endpoints. Returns the user row or None."""
    conn = get_db()
    try:
        row = verify_token(conn, bearer_token())
        if not row and 'download' in endpoint and request.method == 'GET' and request.args.get('dl'):
            row = verify_token(conn, request.args['dl'], scope='download')
    finally:
        conn.close()
    g.user = dict(row) if row else None
    return g.user


def guard():
    if request.method == 'OPTIONS':
        return None
    endpoint = request.endpoint or ''
    if endpoint in PUBLIC_ENDPOINTS:
        load_session()  # optional: public routes may still use a session if present
        return None
    if not request.path.startswith('/api/') and endpoint:
        return None
    if not load_session(endpoint):
        return jsonify({'error': 'Sign in to continue.'}), 401
    allowed = roles_for(endpoint, request.method)
    if endpoint == 'teacher.teacher_onboarding':
        allowed = None
    if allowed and g.user['role'] not in allowed:
        return jsonify({'error': "You don't have access."}), 403
    return None


def install(app):
    app.before_request(guard)
