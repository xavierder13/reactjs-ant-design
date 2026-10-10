// src/api/axiosInstance.js

import axios from 'axios'
import { getToken, clearTokens } from '../utils/tokenHelper'
import { isSessionEnded, rememberEndReason } from '../utils/session'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',        // ← important for Laravel to return JSON
  }
})

// Request interceptor — attach token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — a 401 that ends the session (token expired after
// 8 h, revoked, or idle 30 min — utils/session.js) clears the token and
// goes to /login, which says why. A permission 401 ("Unauthorized" from a
// <Module>Maintenance middleware) is left to the page.
let redirecting = false
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')

    if (!isLoginRequest && isSessionEnded(error) && getToken() && !redirecting) {
      redirecting = true
      rememberEndReason(error)
      clearTokens()
      window.location.assign('/login')
    }

    return Promise.reject(error)
  }
)

export default axiosInstance