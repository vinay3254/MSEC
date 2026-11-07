"""Send sign-in codes through EmailJS. Codes are never logged, except in local dev when explicitly enabled."""
import os
import threading
import time

import requests

_lock = threading.Lock()
_last_send = [0.0]
KEYS = ('EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY')


class EmailError(Exception):
    pass


def dev_log_codes():
    return os.environ.get('AUTH_DEV_LOG_CODES') == '1' and os.environ.get('FLASK_ENV') != 'production'


def email_enabled():
    return all((os.environ.get(k) or '').strip() for k in KEYS) or dev_log_codes()


def send_code(email, name, code, purpose):
    if not all((os.environ.get(k) or '').strip() for k in KEYS):
        if dev_log_codes():
            print(f'[auth dev] {purpose} code for {email}: {code}', flush=True)
            return
        raise EmailError('Email sign-in is not configured.')
    body = {
        'service_id': os.environ['EMAILJS_SERVICE_ID'],
        'template_id': os.environ['EMAILJS_TEMPLATE_ID'],
        'user_id': os.environ['EMAILJS_PUBLIC_KEY'],
        'template_params': {
            'to_email': email, 'email': email, 'to_name': name or 'Student',
            'otp': code, 'passcode': code, 'expires_minutes': 5,
            'purpose': 'reset your password' if purpose == 'reset' else 'sign in',
        },
    }
    if os.environ.get('EMAILJS_PRIVATE_KEY'):
        body['accessToken'] = os.environ['EMAILJS_PRIVATE_KEY']
    # EmailJS allows about one request per second.
    with _lock:
        wait = _last_send[0] + 1.1 - time.time()
        if wait > 0:
            time.sleep(wait)
        _last_send[0] = time.time()
        headers = {
            'Origin': os.environ.get('PUBLIC_ORIGIN', 'http://localhost:3000'),
            'Referer': f"{os.environ.get('PUBLIC_ORIGIN', 'http://localhost:3000')}/",
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        try:
            resp = requests.post('https://api.emailjs.com/api/v1.0/email/send', json=body, headers=headers, timeout=10)
        except requests.RequestException:
            raise EmailError('Could not send the email code. Try again shortly.') from None
    if resp.status_code != 200:
        if dev_log_codes():
            print(f'[auth dev fallback] {purpose} code for {email}: {code} (EmailJS returned {resp.status_code}: {resp.text})', flush=True)
            return
        raise EmailError(f'Could not send the email code ({resp.status_code}): {resp.text}')
