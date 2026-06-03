// src/utils/tokenHelper.js

const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const removeToken = () => localStorage.removeItem(TOKEN_KEY)

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)
export const setRefreshToken = (token) => localStorage.setItem(REFRESH_TOKEN_KEY, token)
export const removeRefreshToken = () => localStorage.removeItem(REFRESH_TOKEN_KEY)

export const clearTokens = () => {
  removeToken()
  removeRefreshToken()
}