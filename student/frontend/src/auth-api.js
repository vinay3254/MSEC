import { apiRequest, apiUrl, isNative, setToken, setUser } from './api';

const post = (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body || {}) });

export function saveSession({ token, user }) {
  setToken(token);
  setUser(user);
  return user;
}

export const authApi = {
  config: () => apiRequest('/auth/config'),
  me: () => apiRequest('/auth/me'),
  login: (email, password, remember) => post('/auth/login', { email, password, remember }),
  requestCode: (email, purpose = 'login') => post('/auth/code/request', { email, purpose }),
  verifyCode: (email, code, remember) => post('/auth/code/verify', { email, code, remember }),
  requestSignupCode: (data) => post('/auth/signup/request', data),
  verifySignup: (data) => post('/auth/signup/verify', data),
  resetPassword: (email, code, newPassword) => post('/auth/password/reset', { email, code, new_password: newPassword }),
  exchangeGoogle: (code) => post('/auth/google/exchange', { code }),
  setPassword: (currentPassword, newPassword) =>
    post('/auth/password', { ...(currentPassword ? { current_password: currentPassword } : {}), new_password: newPassword }),
  logoutAll: () => post('/auth/logout-all'),
};

export function googleStartUrl(remember) {
  const platform = isNative() ? 'android' : 'web';
  return apiUrl(`/api/auth/google/start?platform=${platform}${remember ? '&remember=1' : ''}`);
}

export const GOOGLE_ERRORS = {
  not_registered: "This email isn't registered with MSEC. Use the Gmail your college registered.",
  google_conflict: "This Google account doesn't match the registered one. Ask your admin.",
  google_cancelled: 'Google sign-in was cancelled.',
  google_failed: 'Google sign-in failed. Try again.',
};

// Parses "#/auth-return?code=..." (web) or "msecstudent://auth-return?code=..." (Android).
export function parseAuthReturn(url) {
  if (!url) return null;
  const marker = url.indexOf('auth-return');
  if (marker === -1) return null;
  const query = url.slice(marker).split('?')[1] || '';
  const params = new URLSearchParams(query);
  if (params.get('code')) return { code: params.get('code') };
  if (params.get('error')) return { error: params.get('error') };
  return null;
}
