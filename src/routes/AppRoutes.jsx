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
import KpiTemplateIndex  from '../pages/kpi/templates/KpiTemplateIndex';
import CreateKpiTemplate from '../pages/kpi/templates/CreateKpiTemplate';
import EditKpiTemplate   from '../pages/kpi/templates/EditKpiTemplate';
import KpiEvaluationIndex  from '../pages/kpi/evaluations/KpiEvaluationIndex';
import KpiEvaluationCreate from '../pages/kpi/evaluations/KpiEvaluationCreate';
import KpiEvaluationView   from '../pages/kpi/evaluations/KpiEvaluationView';
import KpiMyEvaluationIndex from '../pages/kpi/my-evaluations/KpiMyEvaluationIndex';
import KpiMyEvaluationForm  from '../pages/kpi/my-evaluations/KpiMyEvaluationForm';
import KpiEvaluationPrint from '../pages/kpi/evaluations/KpiEvaluationPrint';
import EmployeeMasterData from '../pages/employee_master_data/EmployeeMasterData';
import CreateEmployee from '../pages/employee_master_data/CreateEmployee';
import EditEmployee from '../pages/employee_master_data/EditEmployee';
import ViewEmployee from '../pages/employee_master_data/ViewEmployee';
import JobApplicantList from '../pages/recruitment/JobApplicantList';

// Errors
import UnauthorizePage from '../pages/errors/UnauthorizePage';
import NotFoundPage from '../pages/errors/NotFoundPage';

// ─── Permission-based routes config ───────────────────────────────────────────
const permissionRoutes = [
  { permissions: ['hr-payroll-dashboard'],      path: '/dashboard',        element: <DashboardPage /> },
  { permissions: ['user-list'],                 path: '/users',       element: <UserIndex /> },
  { permissions: ['role-list'],                 path: '/roles',       element: <RoleIndex /> },
  { permissions: ['permission-list'],           path: '/permissions', element: <PermissionIndex /> },
  { permissions: ['employee-master-data-list'], path: '/employees', element: <EmployeeMasterData /> },  
  { permissions: ['employee-master-data-list'], path: '/employees/:id', element: <ViewEmployee /> }, 
  { permissions: ['employee-master-data-create'], path: '/employees/create', element: <CreateEmployee /> },
  { permissions: ['careers-applicant-list'], path: '/recruitment/:url', element: <JobApplicantList /> },

  // KPI Template Routes
  { permissions: ['kpi-template-list'],         path: '/kpi-templates',        element: <KpiTemplateIndex /> },
  { permissions: ['kpi-template-create'],       path: '/kpi-templates/create', element: <CreateKpiTemplate /> },  
  { permissions: ['kpi-template-edit'],         path: '/kpi-templates/:id/edit', element: <EditKpiTemplate /> },  

    // HR/Supervisor evaluation routes
  { permissions: ['kpi-evaluation-list'],   path: '/kpi-evaluations', element: <KpiEvaluationIndex /> },
  { permissions: ['kpi-evaluation-create'], path: '/kpi-evaluations/create', element: <KpiEvaluationCreate /> },
  { permissions: ['kpi-evaluation-list'],   path: '/kpi-evaluations/:id', element: <KpiEvaluationView /> },
  { permissions: ['kpi-evaluation-print'],  path: '/kpi-evaluations/:id/print', element: <KpiEvaluationPrint /> },

  // Employee self-service routes
  { permissions: ['kpi-self-evaluation-list'],   path: '/my-evaluations', element: <KpiMyEvaluationIndex /> },
  { permissions: ['kpi-self-evaluation-create', 'kpi-self-evaluation-edit'],   path: '/my-evaluations/:id', element: <KpiMyEvaluationForm /> },
  
];

// ─── Smart Redirect ───────────────────────────────────────────────────────────
const SmartRedirect = () => {
  const { hasAnyPermission, hasRole } = useAuth();

  // If employee role → redirect to self evaluation
  if (hasRole('KPI Self Evaluation')) {
    return <Navigate to='/my-evaluations' replace />;
  }

  const firstAccessible = permissionRoutes.find(({ permissions }) =>
    hasAnyPermission(...permissions)
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