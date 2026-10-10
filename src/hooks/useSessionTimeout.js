// src/hooks/useSessionTimeout.js
//
// Idle logout for the signed-in layout (MainLayout), the React port of the
// Vue app's Home.vue idle handling:
// - Real activity (mouse, keys, touch, wheel) is this tab's; it is also
//   written to localStorage so the other tabs — all on the same token —
//   count it too (a busy tab keeps an untouched one alive).
// - A heartbeat to the backend, at most every 5 min, while the user is
//   active: typing into a form sends no API call, and the backend's idle
//   window only sees API calls.
// - After 30 min with no activity in any tab, ask the backend every minute
//   with a check-only call (X-Session-Check: passive — it must not extend
//   the window itself) whether the session is really over; the 401 it gets
//   then is handled by the axios interceptor (→ /login with the reason).
// The 8 h absolute expiry needs nothing here: its 401 ends the session the
// same way. See utils/session.js.
import { useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
  IDLE_TIMEOUT_MS, ACTIVITY_KEY, ACTIVITY_BROADCAST_THROTTLE_MS, HEARTBEAT_THROTTLE_MS,
  IDLE_CONFIRM_INTERVAL_MS, ACTIVITY_EVENTS, PASSIVE_HEADERS,
} from '../utils/session';

const CHECK_EVERY_MS = 15 * 1000;

const readShared = () => {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
};

const useSessionTimeout = () => {
  useEffect(() => {
    let lastLocal = Date.now();
    let lastBroadcast = 0;
    let lastHeartbeat = Date.now(); // the page load's own /auth/init counted
    let confirmTimer = null;

    const stopConfirming = () => {
      clearInterval(confirmTimer);
      confirmTimer = null;
    };

    // check-only: a 401 here is the interceptor's (session over → /login)
    const confirmWithServer = () => {
      axiosInstance.get('/auth/init', { headers: PASSIVE_HEADERS }).catch(() => {});
    };

    const check = () => {
      const idle = Date.now() - Math.max(lastLocal, readShared()) >= IDLE_TIMEOUT_MS;
      if (idle && !confirmTimer) {
        confirmWithServer();
        confirmTimer = setInterval(confirmWithServer, IDLE_CONFIRM_INTERVAL_MS);
      } else if (!idle && confirmTimer) {
        stopConfirming();
      }
    };

    const onActivity = () => {
      const now = Date.now();
      lastLocal = now;
      if (confirmTimer) stopConfirming();
      if (now - lastBroadcast > ACTIVITY_BROADCAST_THROTTLE_MS) {
        lastBroadcast = now;
        try { localStorage.setItem(ACTIVITY_KEY, String(now)); } catch { /* other tabs just won't see it */ }
      }
      if (now - lastHeartbeat > HEARTBEAT_THROTTLE_MS) {
        lastHeartbeat = now;
        axiosInstance.get('/auth/init').catch(() => {});
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    // a laptop waking up / a tab coming back: decide at once, not on the next tick
    document.addEventListener('visibilitychange', check);
    const ticker = setInterval(check, CHECK_EVERY_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      document.removeEventListener('visibilitychange', check);
      clearInterval(ticker);
      stopConfirming();
    };
  }, []);
};

export default useSessionTimeout;
