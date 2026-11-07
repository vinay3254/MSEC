"""Auth blueprint: /api/auth/*."""
import os

from flask import Blueprint, g, jsonify, redirect, request
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_db
from . import email as mail
from . import google, otp, ratelimit
from .tokens import issue_download_token, issue_token
from .users import normalize_email, public_user, roster_user

# A real hash so unknown emails cost the same time as wrong passwords.
_DUMMY_HASH = generate_password_hash('not-a-real-password')

MIN_PASSWORD = 8
PW_EMAIL_LIMIT, PW_IP_LIMIT, PW_WINDOW = 5, 30, 15 * 60
CODE_EMAIL_WINDOW = 60
CODE_IP_LIMIT, CODE_IP_WINDOW = 10, 3600
CODE_SENT = 'If this email is registered, a code was sent.'

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

DEV_ORIGINS = [
    'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://localhost:5000',
    'capacitor://localhost', 'http://localhost', 'https://localhost',
]


def cors_origins():
    extra = [o.strip().rstrip('/') for key in ('PUBLIC_ORIGIN', 'TEACHER_ORIGIN')
             for o in os.environ.get(key, '').split(',') if o.strip()]
    return extra + DEV_ORIGINS + ['http://localhost:4173', 'http://127.0.0.1:4173']


@bp.get('/me')
def me():
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (g.user['id'],)).fetchone()
    user = public_user(conn, row)
    conn.close()
    return jsonify({'user': user})


@bp.post('/download-token')
def download_token():
    """Short-lived token for links opened outside fetch (new tab, system browser)."""
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (g.user['id'],)).fetchone()
    conn.close()
    return jsonify({'token': issue_download_token(row)})


@bp.post('/logout-all')
def logout_all():
    conn = get_db()
    conn.execute("UPDATE users SET token_version = token_version + 1 WHERE id = ?", (g.user['id'],))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Signed out on every device.'})


def client_ip():
    return request.remote_addr or 'unknown'


def body():
    return request.get_json(silent=True) or {}


def session_response(conn, row, remember=False):
    return jsonify({'token': issue_token(row, remember), 'user': public_user(conn, row)})


def too_many(seconds):
    return jsonify({'error': f'Too many attempts. Try again in {ratelimit.minutes(seconds)} min.'}), 429


def google_enabled():
    return google.google_enabled()


@bp.get('/config')
def config():
    return jsonify({
        'google': google_enabled(),
        'email': mail.email_enabled(),
        # Apps on other origins (teacher desk) must start Google sign-in here so the binding cookie matches the callback.
        'google_start': f'{google.public_origin()}/api/auth/google/start',
    })


@bp.post('/login')
def login():
    data = body()
    email = normalize_email(data.get('email'))
    password = data.get('password') or ''
    remember = bool(data.get('remember'))
    if not email or not password:
        return jsonify({'error': 'Enter your email and password.'}), 400
    conn = get_db()
    try:
        ekey, ikey = f'pw:email:{email}', f'pw:ip:{client_ip()}'
        wait = max(ratelimit.blocked(conn, ekey, PW_EMAIL_LIMIT, PW_WINDOW), ratelimit.blocked(conn, ikey, PW_IP_LIMIT, PW_WINDOW))
        if wait:
            return too_many(wait)
        row = roster_user(conn, email)
        if row and not row['password_hash']:
            return jsonify({'error': 'No password set. Sign in with Google or a code, then set one.', 'code': 'no_password'}), 409
        ok = check_password_hash(row['password_hash'] if row else _DUMMY_HASH, password)
        if not row or not ok:
            ratelimit.hit(conn, ekey, PW_WINDOW)
            ratelimit.hit(conn, ikey, PW_WINDOW)
            return jsonify({'error': 'Invalid email or password.'}), 401
        ratelimit.clear(conn, ekey)
        return session_response(conn, row, remember)
    finally:
        conn.close()


@bp.post('/code/request')
def code_request():
    data = body()
    email = normalize_email(data.get('email'))
    purpose = 'reset' if data.get('purpose') == 'reset' else 'login'
    if not email or '@' not in email:
        return jsonify({'error': 'Enter a valid email.'}), 400
    if not mail.email_enabled():
        return jsonify({'error': 'Email codes are not available right now.'}), 503
    conn = get_db()
    try:
        ekey, ikey = f'code:email:{email}', f'code:ip:{client_ip()}'
        if ratelimit.blocked(conn, ekey, 1, CODE_EMAIL_WINDOW):
            return jsonify({'error': 'Wait a minute before requesting another code.'}), 429
        wait = ratelimit.blocked(conn, ikey, CODE_IP_LIMIT, CODE_IP_WINDOW)
        if wait:
            return too_many(wait)
        ratelimit.hit(conn, ekey, CODE_EMAIL_WINDOW)
        ratelimit.hit(conn, ikey, CODE_IP_WINDOW)
        row = roster_user(conn, email)
        if row:
            code = otp.create_code(conn, email, purpose)
            try:
                mail.send_code(email, row['name'], code, purpose)
            except mail.EmailError as exc:
                return jsonify({'error': str(exc)}), 502
        return jsonify({'message': CODE_SENT})
    finally:
        conn.close()


def _check_code(conn, email, purpose, code):
    """Return (row, error_response)."""
    result = otp.verify_code(conn, email, purpose, code)
    if result == 'locked':
        return None, (jsonify({'error': 'Too many wrong attempts. Request a new code.'}), 429)
    row = roster_user(conn, email) if result == 'ok' else None
    if not row:
        return None, (jsonify({'error': 'That code is wrong or expired.'}), 401)
    return row, None


@bp.post('/code/verify')
def code_verify():
    data = body()
    email = normalize_email(data.get('email'))
    conn = get_db()
    try:
        row, err = _check_code(conn, email, 'login', data.get('code'))
        if err:
            return err
        return session_response(conn, row, bool(data.get('remember')))
    finally:
        conn.close()


@bp.post('/password/reset')
def password_reset():
    data = body()
    email = normalize_email(data.get('email'))
    new_password = data.get('new_password') or ''
    if len(new_password) < MIN_PASSWORD:
        return jsonify({'error': f'Use at least {MIN_PASSWORD} characters.'}), 400
    conn = get_db()
    try:
        row, err = _check_code(conn, email, 'reset', data.get('code'))
        if err:
            return err
        conn.execute("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
                     (generate_password_hash(new_password), row['id']))
        conn.commit()
        ratelimit.clear(conn, f'pw:email:{email}')
        fresh = conn.execute("SELECT * FROM users WHERE id = ?", (row['id'],)).fetchone()
        return session_response(conn, fresh)
    finally:
        conn.close()


@bp.post('/password')
def set_password():
    data = body()
    new_password = data.get('new_password') or ''
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (g.user['id'],)).fetchone()
        if row['password_hash']:
            if not data.get('current_password'):
                return jsonify({'error': 'Enter your current password.'}), 400
            if not check_password_hash(row['password_hash'], data['current_password']):
                return jsonify({'error': 'Current password is wrong.'}), 401
        if len(new_password) < MIN_PASSWORD:
            return jsonify({'error': f'Use at least {MIN_PASSWORD} characters.'}), 400
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (generate_password_hash(new_password), row['id']))
        conn.commit()
        return jsonify({'message': 'Password saved.'})
    finally:
        conn.close()


def _cookie_kwargs():
    return {
        'httponly': True,
        'samesite': 'Lax',
        'secure': google.public_origin().startswith('https:'),
        'path': google.COOKIE_PATH,
    }


@bp.get('/google/start')
def google_start():
    if not google.google_enabled():
        return jsonify({'error': 'Google sign-in is not available right now.'}), 503
    requested = request.args.get('platform')
    platform = requested if requested in ('android', 'teacher') else 'web'
    remember = request.args.get('remember') in ('1', 'true')
    conn = get_db()
    try:
        url, browser = google.new_flow(conn, platform, remember)
    finally:
        conn.close()
    resp = redirect(url, code=302)
    resp.set_cookie(google.COOKIE, browser, max_age=google.FLOW_TTL, **_cookie_kwargs())
    return resp


@bp.get('/google/callback')
def google_callback():
    state = request.args.get('state', '')
    conn = get_db()
    try:
        platform = google.flow_platform(conn, state)
        flow = google.consume_flow(conn, state, request.cookies.get(google.COOKIE, ''))
        if not flow:
            target = google.return_url(platform, error='google_failed')
        elif request.args.get('error'):
            target = google.return_url(flow['platform'], error='google_cancelled')
        elif not request.args.get('code'):
            target = google.return_url(flow['platform'], error='google_failed')
        else:
            try:
                token = google.exchange_code(request.args['code'], flow['code_verifier'])
                payload = google.verify_id_token(token)
                user = google.roster_user_for(conn, payload, flow)
                code = google.issue_exchange(conn, flow, user['id'])
                target = google.return_url(flow['platform'], code=code)
            except google.GoogleError as exc:
                target = google.return_url(flow['platform'], error=exc.reason)
    finally:
        conn.close()
    resp = redirect(target, code=302)
    resp.delete_cookie(google.COOKIE, **{k: v for k, v in _cookie_kwargs().items() if k in ('path', 'secure', 'samesite', 'httponly')})
    return resp


@bp.post('/google/exchange')
def google_exchange():
    code = body().get('code') or ''
    conn = get_db()
    try:
        redeemed = google.redeem_exchange(conn, code)
        row = None
        if redeemed:
            uid, remember = redeemed
            row = conn.execute("SELECT * FROM users WHERE id = ? AND active = 1", (uid,)).fetchone()
        if not row:
            return jsonify({'error': 'Google sign-in expired. Try again.'}), 401
        return session_response(conn, row, remember)
    finally:
        conn.close()


@bp.post('/signup/request')
def signup_request():
    data = body()
    email = normalize_email(data.get('email'))
    name = (data.get('name') or '').strip()
    password = data.get('password') or ''
    if not email or '@' not in email:
        return jsonify({'error': 'Please enter a valid email address.'}), 400
    if not name:
        return jsonify({'error': 'Please enter your full name.'}), 400
    if len(password) < MIN_PASSWORD:
        return jsonify({'error': f'Password must be at least {MIN_PASSWORD} characters.'}), 400

    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({'error': 'An account with this email already exists. Please sign in.'}), 409

        code = otp.create_code(conn, email, 'signup')
        try:
            mail.send_code(email, name, code, 'verify your new account')
        except mail.EmailError as exc:
            return jsonify({'error': str(exc)}), 502
        return jsonify({'message': f'Verification code sent to {email}'})
    finally:
        conn.close()


@bp.post('/signup/verify')
def signup_verify():
    data = body()
    email = normalize_email(data.get('email'))
    name = (data.get('name') or '').strip()
    password = data.get('password') or ''
    code = (data.get('code') or '').strip()
    department = (data.get('department') or 'Computer Science & Engineering').strip()
    usn = (data.get('usn') or '').strip()

    if not email or not password or not code or not name:
        return jsonify({'error': 'Please provide all required fields.'}), 400
    if len(password) < MIN_PASSWORD:
        return jsonify({'error': f'Password must be at least {MIN_PASSWORD} characters.'}), 400

    conn = get_db()
    try:
        res = otp.verify_code(conn, email, 'signup', code)
        if res != 'ok':
            return jsonify({'error': 'Invalid or expired verification code.'}), 401

        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({'error': 'Account already exists. Please sign in.'}), 409

        import secrets
        role = data.get('role', 'student').strip().lower()
        if role not in ('student', 'faculty'):
            role = 'student'

        pwd_hash = generate_password_hash(password)

        if role == 'faculty':
            fac_id = usn if usn else f"EMP{secrets.randbelow(900) + 100}"
            conn.execute(
                "INSERT INTO users (email, password_hash, role, name, identifier, department, semester, active) VALUES (?, ?, 'faculty', ?, ?, ?, 0, 1)",
                (email, pwd_hash, name, fac_id, department)
            )
            user_row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            # Assign standard department classes
            conn.execute("INSERT INTO teacher_classes (user_id, department, semester) VALUES (?, ?, 6)", (user_row['id'], department))
            conn.execute("INSERT INTO teacher_classes (user_id, department, semester) VALUES (?, ?, 4)", (user_row['id'], department))
        else:
            if not usn:
                usn = f"1MS24CS{secrets.randbelow(900) + 100}"
            conn.execute(
                "INSERT INTO users (email, password_hash, role, name, identifier, department, semester, active) VALUES (?, ?, 'student', ?, ?, ?, 1, 1)",
                (email, pwd_hash, name, usn, department)
            )
            user_row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            conn.execute(
                "INSERT INTO student_profiles (user_id, usn, name, department, college_name, semester, section, email) VALUES (?, ?, ?, ?, 'MS Engineering College', 1, 'A', ?)",
                (user_row['id'], usn, name, department, email)
            )

        conn.commit()

        return session_response(conn, user_row, remember=True)
    finally:
        conn.close()
