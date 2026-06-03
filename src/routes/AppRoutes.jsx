// src/routes/AppRoutes.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// Guards
import ProtectedRoute from './ProtectedRoute';
import GuestRoute from './GuestRoute';

// Layouts
import MainLayout from '../layouts/MainLayout';

// Auth
import LoginPage from '../pages/auth/LoginPage';

// Pages
import DashboardPage from '../pages/dashboard/DashboardPage';
import UserProfile from '../pages/user/UserProfile';
import UserIndex from '../pages/user/UserIndex';
import RoleIndex from '../pages/role/RoleIndex';
import PermissionIndex from '../pages/permission/PermissionIndex';
import KpiTemplateIndex from '../pages/kpi/KpiTemplateIndex';
import KpiTemplate from '../pages/kpi/KpiTemplate';

// Errors
import UnauthorizePage from '../pages/errors/UnauthorizePage';
import NotFoundPage from '../pages/errors/NotFoundPage';

// ─── Permission-based routes config ───────────────────────────────────────────
const permissionRoutes = [
  { permissions: ['hr-payroll-dashboard'],              path: '/dashboard',        element: <DashboardPage /> },
  { permissions: ['user-list'],                         path: '/user/index',       element: <UserIndex /> },
  { permissions: ['role-list'],                         path: '/role/index',       element: <RoleIndex /> },
  { permissions: ['permission-list'],                   path: '/permission/index', element: <PermissionIndex /> },
  { permissions: ['kpi-template-list'],                 path: '/kpi/index',        element: <KpiTemplateIndex /> },
  { permissions: ['kpi-template-create'], path: '/kpi/template-create', element: <KpiTemplate /> },  
  { permissions: ['kpi-template-edit'], path: '/kpi/template-edit/:id', element: <KpiTemplate /> },  
];

// ─── Smart Redirect ───────────────────────────────────────────────────────────
const SmartRedirect = () => {
  const { hasAnyPermission } = useAuth();

  const firstAccessible = permissionRoutes.find(({ permissions }) =>
    hasAnyPermission(...permissions)   // ← spread array into rest params
  );

  return firstAccessible
    ? <Navigate to={firstAccessible.path} replace />
    : <Navigate to='/unauthorize' replace />;
};

// ─── App Routes ───────────────────────────────────────────────────────────────
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Guest only ─────────────────────────────────────── */}
        <Route element={<GuestRoute />}>
          <Route path='/login' element={<LoginPage />} />
        </Route>

        {/* ── Protected — no permission required ─────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path='/'             element={<SmartRedirect />} />
            <Route path='/user/profile' element={<UserProfile />} />
          </Route>
        </Route>

        {/* ── Protected — permission based (dynamic) ─────────── */}
        {permissionRoutes.map(({ permissions, path, element }) => (
          <Route key={path} element={<ProtectedRoute permissions={permissions} />}>
            <Route element={<MainLayout />}>
              <Route path={path} element={element} />
            </Route>
          </Route>
        ))}

        {/* ── Errors ─────────────────────────────────────────── */}
        <Route path='/unauthorize' element={<UnauthorizePage />} />
        <Route path='*'            element={<NotFoundPage />} />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;