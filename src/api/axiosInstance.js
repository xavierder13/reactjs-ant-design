// src/api/axiosInstance.js

import axios from 'axios'
import { getToken, clearTokens } from '../utils/tokenHelper'

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

// Response interceptor — handle 401 globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
        clearTokens()
        window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default axiosInstance