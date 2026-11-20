// src/api/axiosInstance.js

import axios from 'axios'
import { getToken, clearTokens } from '../utils/tokenHelper'
import { isSessionEnded, rememberEndReason } from '../utils/session'
import { getApiBaseUrl, reselectApiBaseUrl } from '../utils/apiBaseUrl'

// The API address comes from utils/apiBaseUrl.js (VITE_API_BASE_URL may list
// LAN and public addresses, with fallback) — set on each request below.
const axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',        // ← important for Laravel to return JSON
  }
})

// Request interceptor — attach token to every request but the sign-in:
// another tab's (possibly idle-expired) token must not ride along with it
axiosInstance.interceptors.request.use(
  async (config) => {
    // the address chosen at start-up (waits for its probe), or the one a retry names
    if (!config.apiRetried) config.baseURL = await getApiBaseUrl()
    const token = getToken()
    if (token && !config.url?.includes('/auth/login')) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — a 401 that ends the session (session duration
// reached, revoked, or idle — Session Settings, utils/session.js) clears the token and
// goes to /login, which says why — also when another tab already cleared
// the token (this tab then sent none). A permission 401 ("Unauthorized"
// from a <Module>Maintenance middleware) is left to the page.
//
// A network failure (no response at all: server unreachable / refused) moves
// to the next API address that answers (utils/apiBaseUrl.js). A read (GET /
// HEAD) is then retried once on it; a save is not — it may have reached the
// server — so it fails and the user tries again (now on the new address).
const isNetworkFailure = (error) => !error.response && !axios.isCancel(error)
  && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED')

let redirecting = false
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    if (config && !config.apiRetried && isNetworkFailure(error)) {
      const failed = config.baseURL
      const next = await reselectApiBaseUrl()
      const method = (config.method || 'get').toLowerCase()
      if (next && next !== failed && (method === 'get' || method === 'head')) {
        return axiosInstance({ ...config, baseURL: next, apiRetried: true })
      }
    }

    const isLoginRequest = error.config?.url?.includes('/auth/login')

    if (!isLoginRequest && isSessionEnded(error) && window.location.pathname !== '/login' && !redirecting) {
      rememberEndReason(error)
      clearTokens()
      // a caller that leaves by itself (ProtectedRoute's first check — no session state in this page yet) goes to
      // /login through the router, without a reload; everyone else gets the full page load
      if (!error.config?.sessionEndHandledByCaller) {
        redirecting = true
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance