// src/routes/ProtectedRoute.jsx

import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import axiosInstance from '../api/axiosInstance';
import useAuth from '../hooks/useAuth';
import { getToken } from '../utils/tokenHelper';

const ProtectedRoute = ({ permissions = [] }) => {
  const token                                                    = getToken();
  const { isLoaded, setAuth, setLoaded, hasAnyPermission } = useAuth();
  const [loading, setLoading]                                    = useState(!isLoaded);

  useEffect(() => {
    const loadUser = async () => {
      if (!isLoaded && token) {
        try {
          const { data } = await axiosInstance.get('/auth/init');
          setAuth(data.user, data.user_roles, data.user_permissions);
          setLoaded();
        } catch (error) {
          // axiosInstance interceptor handles 401 redirect
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
  if (permissions.length > 0 && !hasAnyPermission(...permissions)) {
    return <Navigate to='/unauthorize' replace />;
  }

  // Step 4: All good → render page
  return <Outlet />;
};

export default ProtectedRoute;