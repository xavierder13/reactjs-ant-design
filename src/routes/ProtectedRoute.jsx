// src/routes/ProtectedRoute.jsx

import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import axiosInstance from '../api/axiosInstance';
import useAuth from '../hooks/useAuth';
import { getToken } from '../utils/tokenHelper';
import { setSessionSettings } from '../utils/session';

const ProtectedRoute = ({ permissions = [], selfService = false }) => {
  const token = getToken();
  const { user, isLoaded, setAuth, setLoaded, hasAnyPermission, hasRole } = useAuth();
  const [loading, setLoading] = useState(!isLoaded);

  useEffect(() => {
    const loadUser = async () => {
      if (!isLoaded && token) {
        try {
          // the page's first check: an ended session (e.g. the first visit of the day) goes to /login through the
          // router below (token cleared → Step 1) instead of the interceptor's full reload, which flashed the
          // screen twice (router to /login, then the reload)
          const { data } = await axiosInstance.get('/auth/init', { sessionEndHandledByCaller: true });

          setAuth(data.user, data.user_roles, data.user_permissions);
          setSessionSettings(data.session);
          setLoaded();
        } catch {
          // an ended session: the interceptor cleared the token and kept the reason → Step 1 redirects
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUser();
  }, [isLoaded]);

  // Step 1: No token → redirect to login
  if (!token) return <Navigate to='/login' replace />;

  // Step 2: Still loading → show spinner
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size='large' />
      </div>
    );
  }

  // Step 3: Has permissions to check → verify at least one matches
  // (product rule: the Administrator can open every page)
  if (permissions.length > 0 && !hasRole('Administrator') && !hasAnyPermission(...permissions)) {
    return <Navigate to='/unauthorize' replace />;
  }

  // Step 3b: My Workspace pages → only an account linked to an employee
  // (users.employee_id) or an Employee Self-Service one (as the menu)
  if (selfService && !user?.employee_id && !hasRole('Employee Self-Service')) {
    return <Navigate to='/unauthorize' replace />;
  }

  // Step 4: All good → render page
  return <Outlet />;
};

export default ProtectedRoute;