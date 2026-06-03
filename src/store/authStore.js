// src/store/authStore.js

import { create } from 'zustand'
import { setToken, setRefreshToken, clearTokens } from '../utils/tokenHelper'

const useAuthStore = create((set) => ({

  // ── State ──────────────────────────────────────────
  user:            null,
  roles:           [],
  permissions:     [],
  isAuthenticated: false,
  isLoaded: false,

  // ── Actions ────────────────────────────────────────
  setAuth: (user, roles, permissions) => {
    set({
        user,
        roles,
        permissions,
        isAuthenticated: true,
    })
  },

  setTokens: (accessToken, refreshToken) => {
    setToken(accessToken)
    setRefreshToken(refreshToken)
  },

  setLoaded: () => set({ isLoaded: true }),

  clearAuth: () => {
    clearTokens()
    set({
        user:            null,
        roles:           [],
        permissions:     [],
        isAuthenticated: false,
    })
  },

}))

export default useAuthStore