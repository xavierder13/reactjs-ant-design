// src/utils/session.js
//
// Session expiry — the React side of vueportal's CheckSessionActivity
// (absolute 8 h token lifetime + 1 h idle window per token, refreshed by
// every API call; a call with X-Session-Check: passive is checked but does
// not refresh it). The idle timer, cross-tab activity sync and heartbeat
// live in hooks/useSessionTimeout.js; the 401 handling in api/axiosInstance.

// Must match CheckSessionActivity::IDLE_TIMEOUT_MINUTES on the backend.
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
// Real activity is shared with the other tabs through this localStorage key
// (every tab uses the same token, so one busy tab keeps all of them alive).
export const ACTIVITY_KEY = 'last_activity_at';
export const ACTIVITY_BROADCAST_THROTTLE_MS = 5000;
// A page of plain fields sends no API call while the user types: tell the
// backend they are present, at most this often (well under the idle window).
export const HEARTBEAT_THROTTLE_MS = 5 * 60 * 1000;
// Once this tab thinks it is idle, ask the backend (passively) this often
// whether the shared session is really over.
export const IDLE_CONFIRM_INTERVAL_MS = 60 * 1000;
export const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];

// Header for check-only calls (idle confirmation, automatic refreshes):
// spread into an axios config — { headers: PASSIVE_HEADERS }.
export const PASSIVE_HEADERS = { 'X-Session-Check': 'passive' };

const ENDED_MESSAGES = {
  'Your session has expired due to inactivity.': 'Your session expired after 1 hour of inactivity. Please log in again.',
  'Unauthenticated.': 'Your session has ended. Please log in again.',
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

export const rememberEndReason = (error) => rememberReason(ENDED_MESSAGES[error.response.data.message]);

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
