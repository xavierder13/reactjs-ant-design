// The vueportal API address this page uses — with fallback.
//
// VITE_API_BASE_URL may list several addresses, comma-separated, e.g. the
// LAN backend and the public domain:
//   VITE_API_BASE_URL=http://192.168.1.29:8000/api,https://portal.addessahub.com/api
//
// Priority (the order listed within each group):
//   - page opened over http  → the http addresses first, then the https ones
//   - page opened over https → the https addresses only (a secure page can't
//     call a plain-http API — the browser blocks it as mixed content)
// The first address in that order that answers is used. All are probed at
// once (PROBE_TIMEOUT_MS each), so a dead one costs one timeout, not one per
// address. "Answers" = the server responded at all (any status); only a
// network failure (unreachable, refused, timed out, bad certificate) skips it.
// When a request later fails the same way, the API client calls
// `reselectApiBaseUrl()` to move to the next address that answers.
// A single address is used as is, without probing.

const PROBE_TIMEOUT_MS = 3000;

const configured = String(import.meta.env.VITE_API_BASE_URL ?? '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const protocolOf = (url) => {
  try {
    return new URL(url, window.location.href).protocol;
  } catch {
    return '';
  }
};

// The addresses in priority order for this page.
export const API_CANDIDATES = (() => {
  const http = configured.filter((url) => protocolOf(url) === 'http:');
  const https = configured.filter((url) => protocolOf(url) === 'https:');
  const other = configured.filter((url) => !['http:', 'https:'].includes(protocolOf(url))); // e.g. a relative "/api"
  if (window.location.protocol === 'https:') {
    return https.length ? [...https, ...other] : configured;
  }
  return [...http, ...https, ...other];
})();

let current = API_CANDIDATES[0] ?? '';
let selecting = null;

// Resolves true when the server answers (opaque no-cors response = reachable).
const probe = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', credentials: 'omit', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

// Probe every candidate in parallel; settle on the highest-priority one that
// answered (waiting only as long as a higher-priority probe is still out).
const select = () => new Promise((resolve) => {
  const results = new Array(API_CANDIDATES.length);
  const settle = () => {
    for (let i = 0; i < results.length; i += 1) {
      if (results[i] === undefined) return;        // a higher priority is still pending
      if (results[i]) { resolve(API_CANDIDATES[i]); return; }
    }
    resolve(null);                                 // none answered
  };
  API_CANDIDATES.forEach((url, i) => {
    probe(url).then((ok) => { results[i] = ok; settle(); });
  });
});

const runSelection = () => {
  if (!selecting) {
    selecting = select().then((url) => {
      // none answered: keep the current one, so requests fail with a clear error
      if (url) current = url;
      return current;
    }).finally(() => { selecting = null; });
  }
  return selecting;
};

// First call (app start) probes; later calls get the chosen address.
let initial = API_CANDIDATES.length > 1 ? runSelection() : Promise.resolve(current);
export const getApiBaseUrl = () => initial;

// After a network failure: probe again and switch to the address that
// answers now. Resolves to the (possibly unchanged) address.
export const reselectApiBaseUrl = () => {
  if (API_CANDIDATES.length < 2) return Promise.resolve(current);
  initial = runSelection();
  return initial;
};

// The address in use right now (synchronous; the first candidate until the
// startup probe settles).
export const currentApiBaseUrl = () => current;

// The backend's origin (API address without its trailing /api), for its web
// routes such as profile pictures.
export const backendOrigin = () => current.replace(/\/api\/?$/, '');
