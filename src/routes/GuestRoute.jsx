// src/routes/GuestRoute.jsx

import { Navigate, Outlet } from 'react-router-dom'
import { getToken } from '../utils/tokenHelper'

const GuestRoute = () => {
  const token = getToken()

  // If user has token → redirect to dashboard
  if (token) return <Navigate to="/dashboard" replace />

  // If no token → render guest page (login, etc.)
  return <Outlet />
}

export default GuestRoute