// src/utils/session.js
//
// Session expiry — the React side of vueportal's CheckSessionActivity
// (a session duration per token + an idle window refreshed by every API
// call; a call with X-Session-Check: passive is checked but does not
// refresh it). Both come from Session Settings (Administrator only, default
// 8 h / 60 min); /auth/login and /auth/init send them as `session`, kept in
// localStorage so every tab and a reload use the same values. The idle timer, cross-tab activity sync and heartbeat
// live in hooks/useSessionTimeout.js; the 401 handling in api/axiosInstance.

const SESSION_SETTINGS_KEY = 'session_settings';
const DEFAULT_IDLE_MINUTES = 60;

// Save the `session` values of a login / init response.
export const setSessionSettings = (session) => {
  if (!session) return;
  try { localStorage.setItem(SESSION_SETTINGS_KEY, JSON.stringify(session)); } catch { /* storage blocked: defaults */ }
};
const idleMinutes = () => {
  try {
    return Number(JSON.parse(localStorage.getItem(SESSION_SETTINGS_KEY))?.idle_timeout_minutes) || DEFAULT_IDLE_MINUTES;
  } catch {
    return DEFAULT_IDLE_MINUTES;
  }
};
export const getIdleTimeoutMs = () => idleMinutes() * 60 * 1000;

// "45 minutes", "1 hour", "1 hour 30 minutes"
export const durationText = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const part = (n, unit) => (n ? `${n} ${unit}${n === 1 ? '' : 's'}` : '');
  return [part(h, 'hour'), part(m, 'minute')].filter(Boolean).join(' ') || '0 minutes';
};
// Real activity is shared with the other tabs through this localStorage key
// (every tab uses the same token, so one busy tab keeps all of them alive).
export const ACTIVITY_KEY = 'last_activity_at';
export const ACTIVITY_BROADCAST_THROTTLE_MS = 5000;
// A page of plain fields sends no API call while the user types: tell the
// backend they are present, at most every 5 min or half the idle window
// (whichever is shorter), so the backend's window never lapses meanwhile.
export const getHeartbeatThrottleMs = () => Math.min(5 * 60 * 1000, getIdleTimeoutMs() / 2);
// Once this tab thinks it is idle, ask the backend (passively) this often
// whether the shared session is really over.
export const IDLE_CONFIRM_INTERVAL_MS = 60 * 1000;
export const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];

// Header for check-only calls (idle confirmation, automatic refreshes):
// spread into an axios config — { headers: PASSIVE_HEADERS }.
export const PASSIVE_HEADERS = { 'X-Session-Check': 'passive' };

const ENDED_MESSAGES = {
  'Your session has expired due to inactivity.': () => `Your session expired after ${durationText(idleMinutes())} of inactivity. Please log in again.`,
  'Your session has expired.': () => 'Your session reached its time limit. Please log in again.',
  'Unauthenticated.': () => 'Your session has ended. Please log in again.',
};
const REASON_KEY = 'session_ended_reason';

// A 401 that ends the session (expired / revoked / idle token) — not the
// 401 "Unauthorized" the <Module>Maintenance middlewares answer for a
// missing permission, which must not log anyone out.
export const isSessionEnded = (error) => error?.response?.status === 401
  && Object.prototype.hasOwnProperty.call(ENDED_MESSAGES, error.response.data?.message);

// Remember why, for the login page (survives the redirect's reload).
const rememberReason = (reason) => {
  try {
    sessionStorage.setItem(REASON_KEY, reason);
  } catch { /* storage blocked: the login page just shows no reason */ }
};

export const rememberEndReason = (error) => rememberReason(ENDED_MESSAGES[error.response.data.message]());

// Another tab logged out or had its session end: it cleared the shared
// token, so this tab leaves too instead of staying on a page whose calls
// now fail. Full page load, so no state of the old session survives.
let leaving = false;
export const leaveEndedSession = () => {
  if (leaving || window.location.pathname === '/login') return;
  leaving = true;
  // keep a more specific reason this tab's own 401 already stored (its
  // redirect fires visibilitychange → check → here)
  let stored = null;
  try { stored = sessionStorage.getItem(REASON_KEY); } catch { /* storage blocked */ }
  if (!stored) rememberReason('Your session has ended. Please log in again.');
  window.location.assign('/login');
};

export const takeEndReason = () => {
  try {
    const reason = sessionStorage.getItem(REASON_KEY);
    sessionStorage.removeItem(REASON_KEY);
    return reason;
  } catch {
    return null;
  }
};
