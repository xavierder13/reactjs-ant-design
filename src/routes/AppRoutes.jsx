// src/routes/AppRoutes.jsx
import useAuth from '../hooks/useAuth';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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
import KpiTemplatePage from '../pages/kpi/KpiTemplatePage';

// Errors
import UnauthorizePage from '../pages/errors/UnauthorizePage';
import NotFoundPage from '../pages/errors/NotFoundPage';

// ─── Permission-based routes config ───────────────────────────────────────────
const permissionRoutes = [
  { permission: 'hr-payroll-dashboard', path: '/dashboard',         element: <DashboardPage /> },
  { permission: 'user-list',            path: '/user/index',        element: <UserIndex /> },
  { permission: 'role-list',            path: '/role/index',        element: <RoleIndex /> },
  { permission: 'permission-list',      path: '/permission/index',  element: <PermissionIndex /> },
  { permission: 'kpi-template-list',    path: '/kpi/templates',     element: <KpiTemplatePage /> },
];

// ─── Smart Redirect — finds first accessible route from permissionRoutes ──────
const SmartRedirect = () => {
  const { hasPermission } = useAuth();

  const firstAccessible = permissionRoutes.find(({ permission }) =>
    hasPermission(permission)
  );

  return firstAccessible
    ? <Navigate to={firstAccessible.path} replace />
    : <Navigate to='/unauthorize' replace />;
};

// ─── App Routes ────────────────────────────────────────────────────────────────
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Guest only ───────────────────────────────────────── */}
        <Route element={<GuestRoute />}>
          <Route path='/login' element={<LoginPage />} />
        </Route>

        {/* ── Protected — no permission required ──────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path='/'             element={<SmartRedirect />} />
            <Route path='/user/profile' element={<UserProfile />} />
          </Route>
        </Route>

        {/* ── Protected — permission based (dynamic) ───────────── */}
        {permissionRoutes.map(({ permission, path, element }) => (
          <Route key={path} element={<ProtectedRoute permission={permission} />}>
            <Route element={<MainLayout />}>
              <Route path={path} element={element} />
            </Route>
          </Route>
        ))}

        {/* ── Errors ──────────────────────────────────────────── */}
        <Route path='/unauthorize' element={<UnauthorizePage />} />
        <Route path='*'            element={<NotFoundPage />} />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;