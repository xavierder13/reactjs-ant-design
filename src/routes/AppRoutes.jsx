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
import WorkforceDashboardPage from '../pages/dashboard/workforce/WorkforceDashboardPage';
import UserProfile from '../pages/user/UserProfile';
import UserIndex from '../pages/user/UserIndex';
import RoleIndex from '../pages/role/RoleIndex';
import CreateRole from '../pages/role/CreateRole';
import EditRole from '../pages/role/EditRole';
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
import KpiConsolidatedReport from '../pages/kpi/reports/KpiConsolidatedReport';
import KpiDashboard from '../pages/kpi/dashboard/KpiDashboard';
import EmployeeMasterData from '../pages/employee_master_data/EmployeeMasterData';
import CreateEmployee from '../pages/employee_master_data/CreateEmployee';
import EditEmployee from '../pages/employee_master_data/EditEmployee';
import ViewEmployee from '../pages/employee_master_data/ViewEmployee';
import AcknowledgmentReportIndex from '../pages/employee_master_data/acknowledgment_report/AcknowledgmentReportIndex';
import BranchManpowerReport from '../pages/employee_master_data/branch_manpower/BranchManpowerReport';
import CareersPositionIndex from '../pages/recruitment/setup/position/CareersPositionIndex';
import CareersRankIndex from '../pages/recruitment/setup/rank/CareersRankIndex';
import HiringOfficerIndex from '../pages/recruitment/setup/hiring_officer/HiringOfficerIndex';
import CareersBranchIndex from '../pages/recruitment/setup/branch/CareersBranchIndex';
import JobVacancyIndex from '../pages/recruitment/setup/job_vacancy/JobVacancyIndex';
import AcknowledgmentReportView from '../pages/employee_master_data/acknowledgment_report/AcknowledgmentReportView';
import HiredThisMonth from '../pages/employee_master_data/lists/HiredThisMonth';
import CareersSyncedList from '../pages/employee_master_data/lists/CareersSyncedList';
import ForRegularization from '../pages/employee_master_data/lists/ForRegularization';
import ResignedEmployees from '../pages/employee_master_data/lists/ResignedEmployees';
import OpenNteList from '../pages/employee_master_data/lists/OpenNteList';
import OpenDisciplinaryList from '../pages/employee_master_data/lists/OpenDisciplinaryList';
import ReferralCodeList from '../pages/employee_master_data/referral_codes/ReferralCodeList';
import NewHiredList from '../pages/employee_master_data/new_hired/NewHiredList';
import Vacancies from '../pages/recruitment/Vacancies';
import JobApplicantList from '../pages/recruitment/JobApplicantList';
import { APPLICANT_STAGES } from '../pages/recruitment/applicants/stages';
import ManpowerRequestIndex from '../pages/manpower_request/request/ManpowerRequestIndex';
import CreateManpowerRequest from '../pages/manpower_request/request/CreateManpowerRequest';
import EditManpowerRequest from '../pages/manpower_request/request/EditManpowerRequest';
import ViewManpowerRequest from '../pages/manpower_request/request/ViewManpowerRequest';
import ManpowerRequestPrint from '../pages/manpower_request/request/ManpowerRequestPrint';
import AreaIndex from '../pages/area/AreaIndex';
import HolidayCalendarIndex from '../pages/record_management/holiday_calendar/HolidayCalendarIndex';
import LeaveApplicationIndex from '../pages/leave/LeaveApplicationIndex';
import LeaveBalances from '../pages/leave/LeaveBalances';
import LeaveTypeIndex from '../pages/leave/types/LeaveTypeIndex';
import CompanyIndex from '../pages/record_management/company/CompanyIndex';
import BranchIndex from '../pages/record_management/branch/BranchIndex';
import DepartmentIndex from '../pages/record_management/department/DepartmentIndex';
import PositionIndex from '../pages/record_management/position/PositionIndex';
import RankIndex from '../pages/record_management/rank/RankIndex';
import PromodizerBrandIndex from '../pages/record_management/promodizer_brand/PromodizerBrandIndex';

// Errors
import UnauthorizePage from '../pages/errors/UnauthorizePage';
import NotFoundPage from '../pages/errors/NotFoundPage';

// ─── Permission-based routes config ───────────────────────────────────────────
const permissionRoutes = [
  { permissions: ['hr-payroll-dashboard'],      path: '/dashboard',        element: <DashboardPage /> },
  { permissions: ['hr-payroll-dashboard'],      path: '/workforce-dashboard', element: <WorkforceDashboardPage /> },
  { permissions: ['user-list'],                 path: '/users',       element: <UserIndex /> },
  { permissions: ['role-list'],                 path: '/roles',       element: <RoleIndex /> },
  { permissions: ['role-create'],               path: '/roles/create', element: <CreateRole /> },
  { permissions: ['role-edit'],                 path: '/roles/:id/edit', element: <EditRole /> },
  { permissions: ['permission-list'],           path: '/permissions', element: <PermissionIndex /> },
  { permissions: ['employee-master-data-list'], path: '/employees', element: <EmployeeMasterData /> },  
  // Segment / open-case lists (the HR dashboard cards link here). Gates match
  // each list endpoint's middleware — Hired This Month is gated on
  // -for-regularization server-side too.
  { permissions: ['employee-master-data-for-regularization'], path: '/employees/hired-this-month', element: <HiredThisMonth /> },
  { permissions: ['employee-master-data-for-regularization'], path: '/employees/for-regularization', element: <ForRegularization /> },
  { permissions: ['employee-master-data-resigned-list'], path: '/employees/resigned', element: <ResignedEmployees /> },
  { permissions: ['employee-master-data-nte-list'], path: '/employees/nte', element: <OpenNteList /> },
  { permissions: ['employee-master-data-disciplinary-list'], path: '/employees/disciplinary', element: <OpenDisciplinaryList /> },
  { permissions: ['employee-referral-list'], path: '/employees/referral-codes', element: <ReferralCodeList /> },
  { permissions: ['employee-master-data-new-hired-list'], path: '/employees/new-hired', element: <NewHiredList /> },
  { permissions: ['employee-master-data-list'], path: '/employees/careers-synced', element: <CareersSyncedList /> },
  { permissions: ['employee-master-data-list'], path: '/employees/:id', element: <ViewEmployee /> },
  { permissions: ['employee-master-data-create'], path: '/employees/create', element: <CreateEmployee /> },
  { permissions: ['employee-master-data-create', 'employee-master-data-edit'], path: '/employees/:id/edit', element: <EditEmployee /> },
  { permissions: ['employee-acknowledgment-reports'], path: '/acknowledgment-reports', element: <AcknowledgmentReportIndex /> },
  { permissions: ['employee-master-data-branch-manpower-export'], path: '/reports/branch-manpower', element: <BranchManpowerReport /> },
  { permissions: ['employee-acknowledgment-reports'], path: '/acknowledgment-reports/:id', element: <AcknowledgmentReportView /> },
  // One route per ATS list, each gated by its own careers-*-list permission
  // (the backend checks the same one per endpoint).
  ...APPLICANT_STAGES.map((stage) => ({
    permissions: [stage.permission], path: stage.path, element: <JobApplicantList key={stage.key} stageKey={stage.key} />,
  })),
  { permissions: ['vacancy-list'], path: '/vacancies', element: <Vacancies /> },
  { permissions: ['careers-position-list'], path: '/recruitment/setup/positions', element: <CareersPositionIndex /> },
  { permissions: ['careers-rank-list'], path: '/recruitment/setup/ranks', element: <CareersRankIndex /> },
  { permissions: ['careers-branch-list'], path: '/recruitment/setup/branches', element: <CareersBranchIndex /> },
  { permissions: ['careers-job-vacancy-list'], path: '/recruitment/setup/job-vacancies', element: <JobVacancyIndex /> },
  { permissions: ['hiring-officer-list'], path: '/recruitment/setup/hiring-officers', element: <HiringOfficerIndex /> },

  // Manpower Request Routes
  { permissions: ['manpower-request-list', 'manpower-request-list-all'],   path: '/manpower-requests',        element: <ManpowerRequestIndex /> },
  { permissions: ['manpower-request-create'], path: '/manpower-requests/create', element: <CreateManpowerRequest /> },
  { permissions: ['manpower-request-list', 'manpower-request-list-all', 'manpower-request-edit', 'manpower-request-approve', 'manpower-request-disapprove', 'manpower-request-return'], path: '/manpower-requests/:id', element: <ViewManpowerRequest /> },
  { permissions: ['manpower-request-create', 'manpower-request-edit'], path: '/manpower-requests/:id/edit', element: <EditManpowerRequest /> },
  { permissions: ['manpower-request-print'], path: '/manpower-requests/:id/print', element: <ManpowerRequestPrint /> },
  { permissions: ['area-list'],               path: '/areas',                      element: <AreaIndex /> },
  { permissions: ['holiday-calendar-list'],   path: '/holiday-calendar',           element: <HolidayCalendarIndex /> },
  { permissions: ['leave-list'],              path: '/leave',                      element: <LeaveApplicationIndex /> },
  { permissions: ['leave-balance-list', 'leave-balance-list-all'], path: '/leave/balances', element: <LeaveBalances /> },
  { permissions: ['leave-type-list'],         path: '/leave/types',                element: <LeaveTypeIndex /> },

  // Record Management (org reference data)
  { permissions: ['company-list'],          path: '/companies',         element: <CompanyIndex /> },
  { permissions: ['branch-list'],           path: '/branches',          element: <BranchIndex /> },
  { permissions: ['department-list'],       path: '/departments',       element: <DepartmentIndex /> },
  { permissions: ['position-list'],         path: '/positions',         element: <PositionIndex /> },
  { permissions: ['rank-list'],             path: '/ranks',             element: <RankIndex /> },
  { permissions: ['promodizer-brand-list'], path: '/promodizer-brands', element: <PromodizerBrandIndex /> },

  // KPI Template Routes
  { permissions: ['kpi-template-list'],         path: '/kpi-templates',        element: <KpiTemplateIndex /> },
  { permissions: ['kpi-template-create'],       path: '/kpi-templates/create', element: <CreateKpiTemplate /> },  
  { permissions: ['kpi-template-edit'],         path: '/kpi-templates/:id/edit', element: <EditKpiTemplate /> },  

    // HR/Supervisor evaluation routes
  { permissions: ['kpi-evaluation-list'],   path: '/kpi-evaluations', element: <KpiEvaluationIndex /> },
  { permissions: ['kpi-evaluation-create'], path: '/kpi-evaluations/create', element: <KpiEvaluationCreate /> },
  { permissions: ['kpi-evaluation-list'],   path: '/kpi-evaluations/:id', element: <KpiEvaluationView /> },
  { permissions: ['kpi-evaluation-print'],  path: '/kpi-evaluations/:id/print', element: <KpiEvaluationPrint /> },
  { permissions: ['kpi-report-view'],       path: '/kpi-dashboard', element: <KpiDashboard /> },
  { permissions: ['kpi-report-view'],       path: '/kpi-reports/consolidated', element: <KpiConsolidatedReport /> },

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