import React, { useEffect, useRef, useState } from 'react';
import './auth.css';
import { openExternal, isNative } from '../api';
import { authApi, googleStartUrl, saveSession } from '../auth-api';

const RESEND_SECONDS = 60;

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
];

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function Eye({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M3 3l18 18" />}
    </svg>
  );
}

export default function AuthScreen({ onLoginSuccess, initialError = '', onBackToGateway, portalName = 'Student' }) {
  const [config, setConfig] = useState({ google: false, email: true, loaded: false });
  // mode: 'signin' | 'signup' | 'forgot' | 'code_login'
  const [mode, setMode] = useState('signin');
  // step for signup: 'form' | 'verify'
  const [signupStep, setSignupStep] = useState('form');

  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [usn, setUsn] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const isTeacher = portalName.toLowerCase().includes('teacher');

  // OTP Code
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status
  const [error, setError] = useState(initialError);
  const [errorCode, setErrorCode] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    let live = true;
    authApi.config()
      .then((c) => { if (live) setConfig({ google: !!c.google, email: !!c.email, loaded: true }); })
      .catch(() => { if (live) setConfig({ google: false, email: true, loaded: true }); });
    return () => { live = false; };
  }, []);

  useEffect(() => () => clearInterval(timer.current), []);

  function startResendTimer() {
    clearInterval(timer.current);
    setResendIn(RESEND_SECONDS);
    timer.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) { clearInterval(timer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function switchMode(next) {
    setMode(next);
    setSignupStep('form');
    setCode('');
    setNewPassword('');
    setError('');
    setErrorCode('');
    setInfo('');
  }

  async function run(action) {
    setBusy(true);
    setError('');
    setErrorCode('');
    try {
      await action();
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
      setErrorCode(err.code || '');
    } finally {
      setBusy(false);
    }
  }

  const finish = (session) => onLoginSuccess(saveSession(session));

  // --- SIGN IN FLOW (Email + Password) ---
  const handleSignIn = () => run(async () => {
    if (!email.trim() || !password) throw new Error('Enter your email and password.');
    finish(await authApi.login(email.trim(), password, remember));
  });

  // --- SIGN UP FLOW STEP 1: Send OTP ---
  const handleRequestSignup = () => run(async () => {
    if (!name.trim()) throw new Error('Please enter your full name.');
    if (!email.trim()) throw new Error('Please enter your email address.');
    if (!password || password.length < 8) throw new Error('Password must be at least 8 characters.');
    const res = await authApi.requestSignupCode({
      email: email.trim(),
      name: name.trim(),
      password,
    });
    setInfo(res.message || `Verification code sent to ${email}`);
    setSignupStep('verify');
    startResendTimer();
  });

  // --- SIGN UP FLOW STEP 2: Verify OTP & Create Account ---
  const handleVerifySignup = (codeToVerify) => run(async () => {
    const c = (codeToVerify || code).trim();
    if (c.length !== 6) throw new Error('Enter the 6-digit verification code.');
    const session = await authApi.verifySignup({
      email: email.trim(),
      name: name.trim(),
      password,
      department,
      usn: isTeacher ? '' : usn.trim(),
      role: isTeacher ? 'faculty' : 'student',
      code: c,
    });
    finish(session);
  });

  // --- CODE LOGIN FLOW (Fallback OTP for login) ---
  const handleRequestLoginCode = () => run(async () => {
    if (!email.trim()) throw new Error('Enter your email address.');
    const res = await authApi.requestCode(email.trim(), mode === 'forgot' ? 'reset' : 'login');
    setInfo(res.message);
    setSignupStep('verify');
    startResendTimer();
  });

  const handleVerifyLoginCode = (codeToVerify) => run(async () => {
    const c = (codeToVerify || code).trim();
    if (c.length !== 6) throw new Error('Enter the 6-digit code.');
    if (mode === 'forgot') {
      if (newPassword.length < 8) throw new Error('Use at least 8 characters.');
      finish(await authApi.resetPassword(email.trim(), c, newPassword));
    } else {
      finish(await authApi.verifyCode(email.trim(), c, remember));
    }
  });

  function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (mode === 'signin') {
      handleSignIn();
    } else if (mode === 'signup') {
      if (signupStep === 'form') handleRequestSignup();
      else handleVerifySignup();
    } else if (mode === 'code_login' || mode === 'forgot') {
      if (signupStep === 'form') handleRequestLoginCode();
      else handleVerifyLoginCode();
    }
  }

  function handleCodeChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    if (val.length === 6) {
      if (mode === 'signup') handleVerifySignup(val);
      else if (mode === 'code_login') handleVerifyLoginCode(val);
    }
  }

  async function google() {
    const url = googleStartUrl(remember);
    if (isNative()) await openExternal(url);
    else window.location.assign(url);
  }

  // Titles & Headings
  let title = 'Sign in to MSEC';
  let subtitle = 'Enter your email and password to access your portal.';

  if (mode === 'signup') {
    if (signupStep === 'form') {
      title = 'Create an Account';
      subtitle = isTeacher ? 'Register your faculty account. An OTP will be sent to verify your email.' : 'Register your student profile. An OTP will be sent to verify your email.';
    } else {
      title = 'Verify Your Email';
      subtitle = `We sent a 6-digit verification code to ${email}`;
    }
  } else if (mode === 'forgot') {
    title = 'Reset Password';
    subtitle = "We'll email you a code to set a new password.";
  } else if (mode === 'code_login') {
    if (signupStep === 'form') {
      title = 'Sign In with Code';
      subtitle = 'We will email a 6-digit code to your registered email.';
    } else {
      title = 'Check your email';
      subtitle = `We sent a 6-digit code to ${email}`;
    }
  }

  return (
    <div className="auth" data-qa="auth-screen">
      <header className="auth__brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/favicon.svg" width="40" height="40" alt="" />
          <span className="auth__wordmark">MSEC<small>{portalName}</small></span>
        </div>
        {onBackToGateway && (
          <button
            type="button"
            onClick={onBackToGateway}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--muted)',
              cursor: 'pointer'
            }}
          >
            ← Portals
          </button>
        )}
      </header>

      <main className="auth__panel">
        {/* Top Switcher: Sign In vs Create Account */}
        {mode !== 'forgot' && mode !== 'code_login' && (
          <div className="auth__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={`auth__tab ${mode === 'signin' ? 'auth__tab--active' : ''}`}
              onClick={() => switchMode('signin')}
            >
              <span>Sign In</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth__tab ${mode === 'signup' ? 'auth__tab--active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              <span>Create Account</span>
            </button>
          </div>
        )}

        <h1 className="auth__title">{title}</h1>
        <p className="auth__sub">{subtitle}</p>

        {mode === 'signin' && config.google && (
          <>
            <button type="button" className="auth__google" onClick={google} disabled={busy}>
              <GoogleG />
              <span>Continue with Google</span>
            </button>
            <div className="auth__or" role="separator"><span>OR</span></div>
          </>
        )}

        {error && (
          <div className="auth__error" role="alert">
            <span>{error}</span>
          </div>
        )}
        {info && !error && <p className="auth__info" role="status">{info}</p>}

        <form className="auth__form" onSubmit={onSubmit} noValidate>
          {/* ==================== SIGN IN VIEW ==================== */}
          {mode === 'signin' && (
            <>
              <label className="auth__field">
                <span className="visually-hidden">Email</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email address"
                  aria-label="Email address"
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </label>

              <div className="auth__field auth__field--password">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Password"
                  aria-label="Password"
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth__eye"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <Eye open={showPassword} />
                </button>
              </div>

              <div className="auth__row">
                <label className="auth__check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <button type="button" className="auth__link" onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="auth__submit" disabled={busy}>
                {busy ? 'Signing in...' : 'Sign In'}
              </button>

              <button
                type="button"
                className="auth__link auth__link--center"
                style={{ marginTop: '6px' }}
                onClick={() => switchMode('signup')}
              >
                Don't have an account? <strong>Create one here</strong>
              </button>
            </>
          )}

          {/* ==================== SIGN UP VIEW: STEP 1 (FORM) ==================== */}
          {mode === 'signup' && signupStep === 'form' && (
            <>
              <label className="auth__field">
                <span className="visually-hidden">Full Name</span>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Full Name (e.g. Reshma Banu)"
                  value={name}
                  disabled={busy}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </label>

              <label className="auth__field">
                <span className="visually-hidden">Email</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email address (will receive OTP)"
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="auth__field">
                <span className="visually-hidden">Department</span>
                <select
                  value={department}
                  disabled={busy}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    height: '54px',
                    boxSizing: 'border-box',
                    padding: '0 16px',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '15px',
                  }}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </label>

              {!isTeacher && (
                <label className="auth__field">
                  <span className="visually-hidden">USN (Optional)</span>
                  <input
                    type="text"
                    placeholder="USN (Optional, e.g. 1MS21CS084)"
                    value={usn}
                    disabled={busy}
                    onChange={(e) => setUsn(e.target.value)}
                  />
                </label>
              )}

              <div className="auth__field auth__field--password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Set Password (min 8 characters)"
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth__eye"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <Eye open={showPassword} />
                </button>
              </div>

              <button type="submit" className="auth__submit" disabled={busy}>
                {busy ? 'Sending OTP code...' : 'Continue & Verify Email'}
              </button>

              <button
                type="button"
                className="auth__link auth__link--center"
                style={{ marginTop: '6px' }}
                onClick={() => switchMode('signin')}
              >
                Already have an account? <strong>Sign in</strong>
              </button>
            </>
          )}

          {/* ==================== SIGN UP VIEW: STEP 2 (OTP VERIFICATION) ==================== */}
          {mode === 'signup' && signupStep === 'verify' && (
            <>
              <div className="auth__email-badge">
                <span>Code sent to: <strong>{email}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSignupStep('form');
                    setCode('');
                    setError('');
                  }}
                >
                  Edit details
                </button>
              </div>

              <label className="auth__field">
                <span className="visually-hidden">6-digit verification code</span>
                <input
                  className="auth__code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="• • • • • •"
                  maxLength={6}
                  value={code}
                  disabled={busy}
                  onChange={handleCodeChange}
                  autoFocus
                />
              </label>

              <button type="submit" className="auth__submit" disabled={busy}>
                {busy ? 'Verifying & Creating Account...' : 'Verify Code & Create Account'}
              </button>

              <button
                type="button"
                className="auth__link auth__link--center"
                disabled={busy || resendIn > 0}
                onClick={handleRequestSignup}
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            </>
          )}

          {/* ==================== FORGOT PASSWORD VIEW ==================== */}
          {mode === 'forgot' && (
            <>
              {signupStep === 'form' ? (
                <>
                  <label className="auth__field">
                    <span className="visually-hidden">Email</span>
                    <input
                      type="email"
                      inputMode="email"
                      placeholder="Enter your registered email"
                      value={email}
                      disabled={busy}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </label>
                  <button type="submit" className="auth__submit" disabled={busy}>
                    {busy ? 'Sending reset code...' : 'Send Reset Code'}
                  </button>
                </>
              ) : (
                <>
                  <label className="auth__field">
                    <input
                      className="auth__code"
                      inputMode="numeric"
                      placeholder="6-digit code"
                      maxLength={6}
                      value={code}
                      disabled={busy}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      autoFocus
                    />
                  </label>
                  <label className="auth__field">
                    <input
                      type="password"
                      placeholder="New password (8+ characters)"
                      value={newPassword}
                      disabled={busy}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </label>
                  <button type="submit" className="auth__submit" disabled={busy}>
                    {busy ? 'Resetting password...' : 'Set New Password'}
                  </button>
                </>
              )}

              <button
                type="button"
                className="auth__link auth__link--center"
                style={{ marginTop: '8px' }}
                onClick={() => switchMode('signin')}
              >
                Back to Sign In
              </button>
            </>
          )}
        </form>

        <p className="auth__footer">MS Engineering College {isTeacher ? 'Faculty Portal' : 'Student Portal'}</p>
      </main>
    </div>
  );
}
