// src/routes/AppRoutes.jsx

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import OverdueDeactivation from '../pages/employee_master_data/lists/OverdueDeactivation';
import OverdueRegularization from '../pages/employee_master_data/lists/OverdueRegularization';
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
import ShiftIndex from '../pages/shift/ShiftIndex';
import ShiftAssignmentIndex from '../pages/shift/ShiftAssignmentIndex';
import GroupScheduleIndex from '../pages/shift/GroupScheduleIndex';
import TimeEntryIndex from '../pages/time_entry/TimeEntryIndex';
import ClearanceIndex from '../pages/clearance/ClearanceIndex';
import ClearanceView from '../pages/clearance/ClearanceView';
import ClearancePrint from '../pages/clearance/ClearancePrint';
import ClearanceSetup from '../pages/clearance/setup/ClearanceSetup';
import ClearanceTemplateForm from '../pages/clearance/setup/ClearanceTemplateForm';
import CompanyAssetIndex from '../pages/company_asset/CompanyAssetIndex';
import AccessChartIndex from '../pages/approval/AccessChartIndex';
import PayrollCutoffIndex from '../pages/payroll_cutoff/PayrollCutoffIndex';
import SessionSettingsPage from '../pages/session_setting/SessionSettingsPage';
import AuditTrailIndex from '../pages/audit_trail/AuditTrailIndex';
import CompensationIndex from '../pages/compensation/CompensationIndex';
import ContributionIndex from '../pages/payroll/contribution/ContributionIndex';
import ContributionTableIndex from '../pages/payroll/contribution/ContributionTableIndex';
import DeductionIndex from '../pages/payroll/deduction/DeductionIndex';
import DeductionTypeIndex from '../pages/payroll/deduction/DeductionTypeIndex';
import PayrollAdjustmentIndex from '../pages/payroll/adjustment/PayrollAdjustmentIndex';
import TimekeepingIndex from '../pages/payroll/timekeeping/TimekeepingIndex';
import PayrollRunIndex from '../pages/payroll/run/PayrollRunIndex';
import PayrollRunPage from '../pages/payroll/run/PayrollRunPage';
import AllowanceIndex from '../pages/payroll/allowance/AllowanceIndex';
import AllowanceTypeIndex from '../pages/payroll/allowance/AllowanceTypeIndex';
import BankAccountIndex from '../pages/payroll/bank_account/BankAccountIndex';
import BankIndex from '../pages/payroll/bank/BankIndex';
import PayrollSettingsPage from '../pages/payroll/settings/PayrollSettingsPage';
import RemittanceReport from '../pages/payroll/reports/RemittanceReport';
import ContributionHistoryReport from '../pages/payroll/reports/ContributionHistoryReport';
import PaySheetReport from '../pages/payroll/reports/PaySheetReport';
import ThirteenthMonthIndex from '../pages/payroll/reports/ThirteenthMonthIndex';
import YearEndTaxReport from '../pages/payroll/reports/YearEndTaxReport';
import FinalPayReport from '../pages/payroll/reports/FinalPayReport';
import MyPayslipsIndex from '../pages/payroll/my_payslips/MyPayslipsIndex';
import MyAttendanceIndex from '../pages/payroll/my_attendance/MyAttendanceIndex';
import MyClearance from '../pages/clearance/MyClearance';
import ApprovalsInbox from '../pages/approval/ApprovalsInbox';
import MyLeave from '../pages/my_workspace/MyLeave';
import MyTimeEntries from '../pages/my_workspace/MyTimeEntries';
import MyOvertime from '../pages/my_workspace/MyOvertime';
import OvertimeIndex from '../pages/overtime/OvertimeIndex';
import ApprovingOfficerIndex from '../pages/approval/ApprovingOfficerIndex';
import CompanyIndex from '../pages/record_management/company/CompanyIndex';
import BranchIndex from '../pages/record_management/branch/BranchIndex';
import DepartmentIndex from '../pages/record_management/department/DepartmentIndex';
import PositionIndex from '../pages/record_management/position/PositionIndex';
import RankIndex from '../pages/record_management/rank/RankIndex';
import PromodizerBrandIndex from '../pages/record_management/promodizer_brand/PromodizerBrandIndex';

// Errors
import PayrollAssistantPage from '../pages/payroll/assistant/PayrollAssistantPage';
import UnauthorizePage from '../pages/errors/UnauthorizePage';
import NotFoundPage from '../pages/errors/NotFoundPage';

// ─── Permission-based routes config ───────────────────────────────────────────
const permissionRoutes = [
  { permissions: ['hr-payroll-dashboard'],      path: '/recruitment-dashboard', element: <DashboardPage /> },
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
  // who the nightly Deactivate Resigned / Regularize Passed jobs would update; run them by hand
  { permissions: ['employee-master-data-deactivate'], path: '/employees/overdue-deactivation', element: <OverdueDeactivation /> },
  { permissions: ['employee-master-data-regularize'], path: '/employees/overdue-regularization', element: <OverdueRegularization /> },
  { permissions: ['clearance-list', 'clearance-list-all', 'clearance-sign'], path: '/clearances', element: <ClearanceIndex /> },
  { permissions: ['clearance-setup'], path: '/clearances/setup', element: <ClearanceSetup /> },
  { permissions: ['clearance-setup'], path: '/clearances/templates/new', element: <ClearanceTemplateForm /> },
  { permissions: ['clearance-setup'], path: '/clearances/templates/:id', element: <ClearanceTemplateForm /> },
  { permissions: ['company-asset-list'], path: '/company-assets', element: <CompanyAssetIndex /> },
  { permissions: ['clearance-list', 'clearance-list-all', 'clearance-sign'], path: '/clearances/:id', element: <ClearanceView /> },
  { permissions: ['clearance-list', 'clearance-list-all', 'clearance-sign'], path: '/clearances/:id/print', element: <ClearancePrint /> },
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
  { permissions: ['shift-list'],              path: '/shifts',                     element: <ShiftIndex /> },
  { permissions: ['shift-assignment-list', 'shift-assignment-list-all'], path: '/shifting', element: <ShiftAssignmentIndex /> },
  { permissions: ['group-schedule-list'],     path: '/default-schedules',          element: <GroupScheduleIndex /> },
  { permissions: ['time-entry-list', 'time-entry-list-all'], path: '/time-entries', element: <TimeEntryIndex /> },
  { permissions: ['access-chart-list'], path: '/access-charts', element: <AccessChartIndex /> },
  { permissions: ['payroll-cutoff-list'], path: '/payroll-cutoffs', element: <PayrollCutoffIndex /> },
  { permissions: ['access-chart-list'], path: '/approving-officers', element: <ApprovingOfficerIndex /> },
  { permissions: ['activity-logs'], path: '/audit-trail', element: <AuditTrailIndex /> },
  // Administrator only: the page itself redirects anyone else
  { permissions: [], path: '/session-settings', element: <SessionSettingsPage /> },
  { permissions: ['compensation-list'], path: '/compensation', element: <CompensationIndex /> },
  { permissions: ['contribution-profile-list'], path: '/contributions', element: <ContributionIndex /> },
  { permissions: ['contribution-table-list'], path: '/contribution-tables', element: <ContributionTableIndex /> },
  { permissions: ['deduction-list'], path: '/deductions', element: <DeductionIndex /> },
  { permissions: ['deduction-type-list'], path: '/deduction-types', element: <DeductionTypeIndex /> },
  { permissions: ['payroll-adjustment-list'], path: '/payroll-adjustments', element: <PayrollAdjustmentIndex /> },
  { permissions: ['dtr-list'], path: '/timekeeping', element: <TimekeepingIndex /> },
  { permissions: ['payroll-run-list'], path: '/payroll-runs', element: <PayrollRunIndex /> },
  { permissions: ['payroll-run-list'], path: '/payroll-runs/:id', element: <PayrollRunPage /> },
  { permissions: ['payroll-report-view'], path: '/remittances', element: <RemittanceReport /> },
  { permissions: ['payroll-report-view'], path: '/contribution-history', element: <ContributionHistoryReport /> },
  { permissions: ['payroll-report-view'], path: '/pay-sheet', element: <PaySheetReport /> },
  { permissions: ['thirteenth-month-list'], path: '/thirteenth-month', element: <ThirteenthMonthIndex /> },
  { permissions: ['payroll-report-view'], path: '/year-end-tax', element: <YearEndTaxReport /> },
  { permissions: ['final-pay-view'], path: '/final-pay', element: <FinalPayReport /> },
  { permissions: ['allowance-list'], path: '/allowances', element: <AllowanceIndex /> },
  { permissions: ['allowance-type-list'], path: '/allowance-types', element: <AllowanceTypeIndex /> },
  { permissions: ['bank-account-list'], path: '/payroll-bank-accounts', element: <BankAccountIndex /> },
  { permissions: ['bank-list'], path: '/banks', element: <BankIndex /> },
  { permissions: ['payroll-assistant', 'payroll-assistant-manage'], path: '/payroll-assistant', element: <PayrollAssistantPage /> },
  { permissions: ['payroll-setting-view', 'payroll-setting-edit'], path: '/payroll-settings', element: <PayrollSettingsPage /> },
  { permissions: ['overtime-list', 'overtime-list-all'], path: '/overtime', element: <OvertimeIndex /> },

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

  // Employee self-service routes (selfService = My Workspace, as the menu)
  { permissions: ['kpi-self-evaluation-list'],   path: '/my-evaluations', element: <KpiMyEvaluationIndex />, selfService: true },
  { permissions: ['kpi-self-evaluation-create', 'kpi-self-evaluation-edit'],   path: '/my-evaluations/:id', element: <KpiMyEvaluationForm />, selfService: true },
  
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

// The Recruitment Dashboard's old address (before /recruitment-dashboard):
// bookmarks and shared links keep working, ?tab= included.
const OldDashboardRedirect = () => {
  const { search, hash } = useLocation();
  return <Navigate to={`/recruitment-dashboard${search}${hash}`} replace />;
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
            <Route path='/dashboard'    element={<OldDashboardRedirect />} />
            <Route path='/user/profile' element={<UserProfile />} />
          </Route>
        </Route>

        {/* ── Protected — My Workspace (linked employee or Employee Self-Service) */}
        <Route element={<ProtectedRoute selfService />}>
          <Route element={<MainLayout />}>
            <Route path='/my-payslips'  element={<MyPayslipsIndex />} />
            <Route path='/my-attendance' element={<MyAttendanceIndex />} />
            <Route path='/my-leave' element={<MyLeave />} />
            <Route path='/my-time-entries' element={<MyTimeEntries />} />
            <Route path='/my-overtime' element={<MyOvertime />} />
            <Route path='/my-clearance' element={<MyClearance />} />
            {/* each module is gated by its own permission inside (the bell's) */}
            <Route path='/approvals' element={<ApprovalsInbox />} />
          </Route>
        </Route>

        {/* ── Protected — permission based (dynamic) ─────────── */}
        {permissionRoutes.map(({ permissions, path, element, selfService }) => (
          <Route key={path} element={<ProtectedRoute permissions={permissions} selfService={selfService} />}>
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