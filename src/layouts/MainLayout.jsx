// src/layouts/MainLayout.jsx

import * as React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Layout,
  Menu,
  Avatar,
  Typography,
  Dropdown,
  Button,
  Divider,
  Space,
  Breadcrumb,
  Spin,
  ConfigProvider,
  App,
  Drawer,
  Grid,
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  DownOutlined,
  IdcardOutlined,
  SolutionOutlined,
  StarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  ClusterOutlined,
  FundOutlined,
  ToolOutlined,
  SyncOutlined,
  ScheduleOutlined,
  AuditOutlined,
  FileSearchOutlined,
  WalletOutlined,
  SearchOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { APPLICANT_STAGES } from '../pages/recruitment/applicants/stages';
import useAuth from '../hooks/useAuth';
import NotificationBell from '../components/NotificationBell';
import MenuSearch from '../components/MenuSearch';
import syncApi from '../services/employee/syncApi';
import handleApiError from '../utils/handleApiError';

// Sidebar "Sync & Updates" actions — wording from vueportal's Home.vue.
const SYNC_ACTIONS = {
  syncReferralCodes: {
    title: 'Sync Referral Codes',
    content: 'Referral codes will be synced with the careers portal.',
    request: syncApi.syncReferralCodes,
  },
  generateReferralCodes: {
    title: 'Generate Referral Codes',
    content: 'Active employees without a referral code will get one, inactive codes of active employees will be reactivated, and codes of resigned employees will be deactivated. Run Sync Referral Codes afterwards to update the careers portal.',
    request: syncApi.generateReferralCodes,
  },
  deactivateResigned: {
    title: 'Deactivate Resigned Employees',
    content: 'Employees whose last day of work has passed will be deactivated.',
    request: syncApi.deactivateResigned,
  },
  regularizePassed: {
    title: 'Regularize Passed Employees',
    content: 'Probationary employees due for regularization who passed the regularization interview will be updated to Regular, regularized on their 180th day.',
    request: syncApi.regularizePassed,
  },
};

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// ─── Page title map ────────────────────────────────────────────────────────────
const titleMap = {
  '/dashboard':              { title: 'Recruitment Dashboard', breadcrumb: ['Dashboards', 'Recruitment Dashboard'] },
  '/workforce-dashboard':    { title: 'Workforce Dashboard', breadcrumb: ['Dashboards', 'Workforce Dashboard'] },
  '/users':                  { title: 'User Accounts',       breadcrumb: ['User Management', 'User Accounts'] },
  '/user/profile':           { title: 'My Profile',          breadcrumb: ['User Management', 'My Profile'] },
  '/my-payslips':            { title: 'My Payslips',         breadcrumb: ['My Payslips'] },
  '/roles':                  { title: 'Roles',               breadcrumb: ['Authorizations', 'Roles'] },
  '/roles/create':           { title: 'Create Role',         breadcrumb: ['Authorizations', 'Roles', 'Create'] },
  '/permissions':            { title: 'Permissions',         breadcrumb: ['Authorizations', 'Permissions'] },
  '/employees':              { title: 'Employee Master Data', breadcrumb: ['Employee', 'Master Data'] },
  '/employees/create':       { title: 'Create Employee',     breadcrumb: ['Employee', 'Create'] },
  '/acknowledgment-reports': { title: 'Branch Reports', breadcrumb: ['Reports', 'Branch Reports'] },
  '/recruitment/setup/positions':     { title: 'Careers Positions', breadcrumb: ['Recruitment', 'Setup', 'Positions'] },
  '/recruitment/setup/ranks':         { title: 'Careers Ranks', breadcrumb: ['Recruitment', 'Setup', 'Ranks'] },
  '/recruitment/setup/branches':      { title: 'Careers Branches', breadcrumb: ['Recruitment', 'Setup', 'Branches'] },
  '/recruitment/setup/job-vacancies': { title: 'Job Vacancies', breadcrumb: ['Recruitment', 'Setup', 'Job Vacancies'] },
  '/recruitment/setup/hiring-officers': { title: 'Hiring Officers', breadcrumb: ['Recruitment', 'Setup', 'Hiring Officers'] },
  '/reports/branch-manpower': { title: 'Branch Manpower Fill Rate', breadcrumb: ['Reports', 'Branch Manpower Fill Rate'] },
  '/employees/hired-this-month':    { title: 'Employees Hired This Month', breadcrumb: ['Employee', 'Hired This Month'] },
  '/employees/for-regularization':  { title: 'For Regularization', breadcrumb: ['Employee', 'For Regularization'] },
  '/employees/resigned':            { title: 'Resigned', breadcrumb: ['Employee', 'Resigned'] },
  '/employees/nte':                 { title: 'Issued NTE (Open)', breadcrumb: ['Employee', 'Issued NTE'] },
  '/employees/disciplinary':        { title: 'Disciplinary Actions (Open)', breadcrumb: ['Employee', 'Disciplinary Actions'] },
  '/employees/referral-codes':      { title: 'Referral Codes', breadcrumb: ['Employee', 'Referral Codes'] },
  '/employees/new-hired':           { title: 'New Hired', breadcrumb: ['Employee', 'New Hired'] },
  '/employees/careers-synced':      { title: 'Synced from Careers', breadcrumb: ['Employee', 'Synced from Careers'] },
  '/vacancies':                     { title: 'Vacancies', breadcrumb: ['Recruitment', 'Vacancies'] },
  ...Object.fromEntries(APPLICANT_STAGES.map((stage) => [stage.path, { title: stage.title, breadcrumb: ['Recruitment', stage.title] }])),
  '/kpi-templates':          { title: 'KPI Templates',       breadcrumb: ['KPI Management', 'KPI Templates'] },
  '/kpi-templates/create':   { title: 'Create KPI Template', breadcrumb: ['KPI Management', 'KPI Templates', 'Create'] },
  '/kpi-evaluations':        { title: 'KPI Evaluations',     breadcrumb: ['KPI Management', 'Evaluations'] },
  '/kpi-evaluations/create': { title: 'Create Evaluation',     breadcrumb: ['KPI Management', 'Evaluations', 'Create'] },
  '/my-evaluations':         { title: 'My Evaluations',        breadcrumb: ['KPI Management', 'My Evaluations'] },
  '/kpi-reports/consolidated': { title: 'KPI Consolidated Report', breadcrumb: ['KPI Management', 'Reports', 'Consolidated Report'] },
  '/kpi-dashboard':            { title: 'KPI Dashboard', breadcrumb: ['Dashboards', 'KPI Dashboard'] },
  '/manpower-requests':        { title: 'Manpower Requests',       breadcrumb: ['Manpower Request', 'All Requests'] },
  '/manpower-requests/create': { title: 'Create Manpower Request', breadcrumb: ['Manpower Request', 'Create'] },
  '/areas':                    { title: 'Area Assignment',         breadcrumb: ['Human Resource', 'Area Assignment'] },
  '/holiday-calendar':         { title: 'Holiday Calendar',        breadcrumb: ['Time & Leave', 'Holiday Calendar'] },
  '/leave':                    { title: 'Leave Applications',      breadcrumb: ['Time & Leave', 'Leave Applications'] },
  '/leave/balances':           { title: 'Leave Balances',          breadcrumb: ['Time & Leave', 'Leave Balances'] },
  '/leave/types':              { title: 'Leave Types',             breadcrumb: ['Time & Leave', 'Leave Types'] },
  '/shifting':                 { title: 'Shifting',                breadcrumb: ['Time & Leave', 'Shifting'] },
  '/default-schedules':        { title: 'Default Schedules',       breadcrumb: ['Time & Leave', 'Default Schedules'] },
  '/time-entries':             { title: 'Manual Time Entries',     breadcrumb: ['Time & Leave', 'Manual Time Entries'] },
  '/payroll-cutoffs':          { title: 'Payroll Cut-offs',        breadcrumb: ['Time & Leave', 'Payroll Cut-offs'] },
  '/access-charts':            { title: 'Access Charts',           breadcrumb: ['Approvals', 'Access Charts'] },
  '/approving-officers':       { title: 'Approving Officers',      breadcrumb: ['Approvals', 'Approving Officers'] },
  '/audit-trail':              { title: 'Audit Trail',             breadcrumb: ['Set Up & Authorizations', 'Audit Trail'] },
  '/compensation':             { title: 'Salary History',          breadcrumb: ['Payroll', 'Salary History'] },
  '/contributions':            { title: 'Contributions',           breadcrumb: ['Payroll', 'Contributions'] },
  '/deductions':               { title: 'Deductions',              breadcrumb: ['Payroll', 'Deductions'] },
  '/retro':                    { title: 'Retro Adjustments',       breadcrumb: ['Payroll', 'Retro Adjustments'] },
  '/timekeeping':              { title: 'Timekeeping',             breadcrumb: ['Payroll', 'Timekeeping'] },
  '/payroll-runs':             { title: 'Payroll Runs',            breadcrumb: ['Payroll', 'Payroll Runs'] },
  '/remittances':              { title: 'Remittances',             breadcrumb: ['Payroll', 'Reports & Compliance', 'Remittances'] },
  '/thirteenth-month':         { title: '13th Month Pay',          breadcrumb: ['Payroll', 'Reports & Compliance', '13th Month Pay'] },
  '/year-end-tax':             { title: 'Year-end Tax',            breadcrumb: ['Payroll', 'Reports & Compliance', 'Year-end Tax'] },
  '/final-pay':                { title: 'Final Pay',               breadcrumb: ['Payroll', 'Reports & Compliance', 'Final Pay'] },
  '/contribution-tables':      { title: 'Contribution Tables',     breadcrumb: ['Payroll', 'Setup', 'Contribution Tables'] },
  '/deduction-types':          { title: 'Deduction Types',         breadcrumb: ['Payroll', 'Setup', 'Deduction Types'] },
  '/allowances':               { title: 'Allowances',              breadcrumb: ['Payroll', 'Allowances'] },
  '/allowance-types':          { title: 'Allowance Types',         breadcrumb: ['Payroll', 'Setup', 'Allowance Types'] },
  '/payroll-settings':         { title: 'Payroll Settings',        breadcrumb: ['Payroll', 'Setup', 'Payroll Settings'] },
  '/overtime':                 { title: 'Overtime',                breadcrumb: ['Time & Leave', 'Overtime'] },
  '/shifts':                   { title: 'Shifts',                  breadcrumb: ['Time & Leave', 'Shifts'] },
  '/companies':                { title: 'Companies',               breadcrumb: ['Organization', 'Companies'] },
  '/branches':                 { title: 'Branches',                breadcrumb: ['Organization', 'Branches'] },
  '/departments':              { title: 'Departments',             breadcrumb: ['Organization', 'Departments'] },
  '/positions':                { title: 'Positions',               breadcrumb: ['Organization', 'Job Structure', 'Positions'] },
  '/ranks':                    { title: 'Ranks',                   breadcrumb: ['Organization', 'Job Structure', 'Ranks'] },
  '/promodizer-brands':        { title: 'Promodizer Brands',       breadcrumb: ['Organization', 'Employee Lookups', 'Promodizer Brands'] },

};

// ─── Menu data ─────────────────────────────────────────────────────────────────
// Sections hidden by permission leave their dividers behind — a leading one
// doubles the sidebar header's bottom border, and neighbours stack up. Keep
// a divider only between two visible items.
const tidyDividers = (items) => {
  const out = [];
  items.forEach((item) => {
    const last = out[out.length - 1];
    if (item.type === 'divider' && (!last || last.type === 'divider')) return;
    out.push(item);
  });
  if (out[out.length - 1]?.type === 'divider') out.pop();
  return out;
};

const menuData = [
  // Separate pages per audience (HR workforce vs. recruitment), not tabs —
  // each has its own data load and URL. /dashboard stays the recruitment
  // page because it's where login lands (GuestRoute).
  {
    key: 'dashboards',
    title: 'Dashboards',
    icon: <DashboardOutlined />,
    children: [
      { key: 'workforce-dashboard', title: 'Workforce Dashboard',   link: '/workforce-dashboard', permissions: ['hr-payroll-dashboard'] },
      { key: 'dashboard',           title: 'Recruitment Dashboard', link: '/dashboard',           permissions: ['hr-payroll-dashboard'] },
      { key: 'kpi-dashboard',       title: 'KPI Dashboard',         link: '/kpi-dashboard',       permissions: ['kpi-report-view'] },
    ],
  },
  { type: 'divider' },

  // ── Human Resource ──────────────────────────────────────────────────────────
  {
    key: 'human-resource',
    type: 'group',
    label: 'Human Resource',
    children: [
      {
        key: 'employee',
        title: 'Employee',
        icon: <IdcardOutlined />,
        // Grouped by the employee lifecycle, like Set Up → Organization:
        // the records, then joining, conduct, leaving, and programs.
        children: [
          {
            key: 'emp-records',
            type: 'group',
            label: 'Records',
            children: [
              { key: 'master-data',        title: 'Master Data',        link: '/employees',        permissions: ['employee-master-data-list'] },
              { key: 'master-data-create', title: 'Master Data Create', link: '/employees/create', permissions: ['employee-master-data-create'] },
            ],
          },
          {
            key: 'emp-onboarding',
            type: 'group',
            label: 'Hiring & Onboarding',
            children: [
              { key: 'new-hired',          title: 'New Hired',           link: '/employees/new-hired',          permissions: ['employee-master-data-new-hired-list'] },
              { key: 'careers-synced',     title: 'Synced from Careers', link: '/employees/careers-synced',     permissions: ['employee-master-data-list'] },
              { key: 'hired-this-month',   title: 'Hired This Month',    link: '/employees/hired-this-month',   permissions: ['employee-master-data-for-regularization'] },
              { key: 'for-regularization', title: 'For Regularization',  link: '/employees/for-regularization', permissions: ['employee-master-data-for-regularization'] },
            ],
          },
          {
            key: 'emp-relations',
            type: 'group',
            label: 'Employee Relations',
            children: [
              { key: 'open-nte',          title: 'Issued NTE',           link: '/employees/nte',          permissions: ['employee-master-data-nte-list'] },
              { key: 'open-disciplinary', title: 'Disciplinary Actions', link: '/employees/disciplinary', permissions: ['employee-master-data-disciplinary-list'] },
            ],
          },
          {
            key: 'emp-separation',
            type: 'group',
            label: 'Separation',
            children: [
              { key: 'resigned', title: 'Resigned', link: '/employees/resigned', permissions: ['employee-master-data-resigned-list'] },
            ],
          },
          {
            key: 'emp-programs',
            type: 'group',
            label: 'Programs',
            children: [
              { key: 'referral-codes', title: 'Referral Codes', link: '/employees/referral-codes', permissions: ['employee-referral-list'] },
            ],
          },
        ]
      },
      {
        key: 'time-leave',
        title: 'Time & Leave',
        icon: <ScheduleOutlined />,
        children: [
          {
            key: 'leave-group',
            type: 'group',
            label: 'Leave',
            children: [
              { key: 'leave-applications', title: 'Leave Applications', link: '/leave',          permissions: ['leave-list'] },
              { key: 'leave-balances',     title: 'Leave Balances',     link: '/leave/balances', permissions: ['leave-balance-list', 'leave-balance-list-all'] },
            ],
          },
          {
            key: 'attendance-group',
            type: 'group',
            label: 'Attendance',
            children: [
              { key: 'time-entries', title: 'Manual Time Entries', link: '/time-entries', permissions: ['time-entry-list', 'time-entry-list-all'] },
              { key: 'overtime',     title: 'Overtime',            link: '/overtime',     permissions: ['overtime-list', 'overtime-list-all'] },
            ],
          },
          {
            key: 'shifting-group',
            type: 'group',
            label: 'Schedule',
            children: [
              { key: 'shifting', title: 'Shifting', link: '/shifting', permissions: ['shift-assignment-list', 'shift-assignment-list-all'] },
              { key: 'default-schedules', title: 'Default Schedules', link: '/default-schedules', permissions: ['group-schedule-list'] },
            ],
          },
          {
            key: 'time-leave-setup',
            type: 'group',
            label: 'Setup',
            children: [
              { key: 'leave-types',      title: 'Leave Types',      link: '/leave/types',      permissions: ['leave-type-list'] },
              { key: 'shifts',           title: 'Shifts',           link: '/shifts',           permissions: ['shift-list'] },
              { key: 'payroll-cutoffs',  title: 'Payroll Cut-offs', link: '/payroll-cutoffs',  permissions: ['payroll-cutoff-list'] },
              { key: 'holiday-calendar', title: 'Holiday Calendar', link: '/holiday-calendar', permissions: ['holiday-calendar-list'] },
            ],
          },
        ],
      },
      // Payroll processing (Timekeeping = the DTR per cut-off, Payroll Runs),
      // reports & compliance (remittances, 13th month, year-end tax, final
      // pay), the pay records the run reads (salary, allowances, statutory
      // contributions, scheduled deductions, retro adjustments) and setup.
      {
        key: 'payroll',
        title: 'Payroll',
        icon: <WalletOutlined />,
        children: [
          {
            key: 'payroll-processing',
            type: 'group',
            label: 'Processing',
            children: [
              { key: 'timekeeping',  title: 'Timekeeping',  link: '/timekeeping',  permissions: ['dtr-list'] },
              { key: 'payroll-runs', title: 'Payroll Runs', link: '/payroll-runs', permissions: ['payroll-run-list'] },
            ],
          },
          {
            key: 'payroll-reports',
            type: 'group',
            label: 'Reports & Compliance',
            children: [
              { key: 'remittances',      title: 'Remittances',    link: '/remittances',      permissions: ['payroll-report-view'] },
              { key: 'thirteenth-month', title: '13th Month Pay', link: '/thirteenth-month', permissions: ['thirteenth-month-list'] },
              { key: 'year-end-tax',     title: 'Year-end Tax',   link: '/year-end-tax',     permissions: ['payroll-report-view'] },
              { key: 'final-pay',        title: 'Final Pay',      link: '/final-pay',        permissions: ['final-pay-view'] },
            ],
          },
          {
            key: 'payroll-records',
            type: 'group',
            label: 'Records',
            children: [
              { key: 'compensation',  title: 'Salary History',    link: '/compensation',  permissions: ['compensation-list'] },
              { key: 'contributions', title: 'Contributions',     link: '/contributions', permissions: ['contribution-profile-list'] },
              { key: 'allowances',    title: 'Allowances',        link: '/allowances',    permissions: ['allowance-list'] },
              { key: 'deductions',    title: 'Deductions',        link: '/deductions',    permissions: ['deduction-list'] },
              { key: 'retro',         title: 'Retro Adjustments', link: '/retro',         permissions: ['retro-list'] },
            ],
          },
          {
            key: 'payroll-setup',
            type: 'group',
            label: 'Setup',
            children: [
              { key: 'contribution-tables', title: 'Contribution Tables', link: '/contribution-tables', permissions: ['contribution-table-list'] },
              { key: 'payroll-settings',    title: 'Payroll Settings',    link: '/payroll-settings',    permissions: ['payroll-setting-view', 'payroll-setting-edit'] },
              { key: 'deduction-types',     title: 'Deduction Types',     link: '/deduction-types',     permissions: ['deduction-type-list'] },
              { key: 'allowance-types',     title: 'Allowance Types',     link: '/allowance-types',     permissions: ['allowance-type-list'] },
            ],
          },
        ],
      },
      {
        key: 'recruitment',
        title: 'Recruitment',
        icon: <SolutionOutlined />,
        children: [
          { key: 'job-applicants',    title: 'Job Applicants',    link: '/recruitment/applicant-list',         permissions: ['careers-applicant-list'] },
          { key: 'screening',         title: 'Screening',         link: '/recruitment/screening-list',         permissions: ['careers-screening-list'] },
          { key: 'initial-interview', title: 'Initial Interview', link: '/recruitment/initial-interview-list', permissions: ['careers-initial-interview-list'] },
          { key: 'exam',              title: 'Exam',              link: '/recruitment/iq-test-list',           permissions: ['careers-iq-test-list'] },
          { key: 'bi-basic-req',      title: 'B.I & Basic Req.',  link: '/recruitment/bi-list',                permissions: ['careers-bi-list'] },
          { key: 'final-interview',   title: 'Final Interview',   link: '/recruitment/final-interview-list',   permissions: ['careers-final-interview-list'] },
          { key: 'orientation',       title: 'Orientation',       link: '/recruitment/orientation-list',       permissions: ['careers-orientation-list'] },
          { key: 'hired',             title: 'Hired',             link: '/recruitment/hired-list',             permissions: ['careers-hired-list'] },
          { key: 'vacancies',         title: 'Vacancies',         link: '/vacancies',                          permissions: ['vacancy-list'] },
          // Careers portal record maintenance (recruitment-portal data, via the gateway).
          {
            key: 'recruitment-setup',
            title: 'Setup',
            icon: <ToolOutlined />,
            children: [
              { key: 'careers-positions',     title: 'Positions',     link: '/recruitment/setup/positions',     permissions: ['careers-position-list'] },
              { key: 'careers-ranks',         title: 'Ranks',         link: '/recruitment/setup/ranks',         permissions: ['careers-rank-list'] },
              { key: 'careers-branches',      title: 'Branches',      link: '/recruitment/setup/branches',      permissions: ['careers-branch-list'] },
              { key: 'careers-job-vacancies', title: 'Job Vacancies', link: '/recruitment/setup/job-vacancies', permissions: ['careers-job-vacancy-list'] },
              // This HRIS's own table, not the careers portal's — the Hiring Officer Name options.
              { key: 'hiring-officers',       title: 'Hiring Officers', link: '/recruitment/setup/hiring-officers', permissions: ['hiring-officer-list'] },
            ],
          },
        ],
      },
      {
        key: 'manpower-request',
        title: 'Manpower Request',
        icon: <FileTextOutlined />,
        children: [
          { key: 'manpower-request-list',   title: 'All Requests',    link: '/manpower-requests',        permissions: ['manpower-request-list', 'manpower-request-list-all'] },
          { key: 'manpower-request-create', title: 'Create Request',  link: '/manpower-requests/create',  permissions: ['manpower-request-create'] },
        ],
      },
      { key: 'area-assignment', title: 'Area Assignment', icon: <ApartmentOutlined />, link: '/areas', permissions: ['area-list'] },
      // Every Human Resource report (employee, recruitment, …) goes here.
      {
        key: 'hr-reports',
        title: 'Reports',
        icon: <FundOutlined />,
        children: [
          { key: 'acknowledgment-reports', title: 'Branch Reports', link: '/acknowledgment-reports', permissions: ['employee-acknowledgment-reports'] },
          { key: 'hr-report-branch-manpower', title: 'Branch Manpower Fill Rate', link: '/reports/branch-manpower', permissions: ['employee-master-data-branch-manpower-export'] },
        ],
      },
      // Manual triggers, same group as vueportal's "Sync & Updates" menu:
      // `action` items confirm, then call SYNC_ACTIONS[action] (no route).
      // Permissions are the backend middleware's own gates; `[]` means
      // Administrator only (the sidebar always lets the Administrator in).
      {
        key: 'hr-sync',
        title: 'Sync & Updates',
        icon: <SyncOutlined />,
        children: [
          { key: 'sync-referral-codes',     title: 'Sync Referral Codes',           action: 'syncReferralCodes',     permissions: ['careers-referral-list-sync'] },
          { key: 'generate-referral-codes', title: 'Generate Referral Codes',       action: 'generateReferralCodes', permissions: [] },
          { key: 'deactivate-resigned',     title: 'Deactivate Resigned',           action: 'deactivateResigned',    permissions: ['employee-master-data-deactivate'] },
          { key: 'regularize-passed',       title: 'Regularize Passed',             action: 'regularizePassed',      permissions: ['employee-master-data-regularize'] },
        ],
      },
    ],
  },

  { type: 'divider' },

  // ── KPI Management ─────────────────────────────────────────────────
  {
    key: 'kpi-management',
    type: 'group',
    label: 'KPI Management',
    children: [
      {
        key: 'kpi-template',
        title: 'KPI Template',
        icon: <BarChartOutlined />,
        children: [
          { key: 'kpi-template-list',  title: 'Template List',    link: '/kpi-templates',        permissions: ['kpi-template-list'] },
          { key: 'kpi-template-create',  title: 'Template Create',         link: '/kpi-templates/create',  permissions: ['kpi-template-create'] },
        ],
      },
      {
        key: 'kpi-evaluations',
        title: 'Evaluations',
        icon: <FileTextOutlined />,
        children: [
          { key: 'kpi-evaluation-list',   title: 'All Evaluations', link: '/kpi-evaluations',        permissions: ['kpi-evaluation-list'] },
          { key: 'kpi-evaluation-create', title: 'Create Evaluation', link: '/kpi-evaluations/create', permissions: ['kpi-evaluation-create'] },
          { key: 'kpi-my-evaluations',    title: 'My Evaluations',  link: '/my-evaluations',          permissions: ['kpi-self-evaluation-list'] },
        ],
      },
      {
        key: 'kpi-reports',
        title: 'Reports',
        icon: <FundOutlined />,
        children: [
          { key: 'kpi-report-consolidated', title: 'Consolidated Report', link: '/kpi-reports/consolidated', permissions: ['kpi-report-view'] },
        ],
      },
    ],
  },

  // ── Set Up & Authorizations ─────────────────────────────────────────────────
  {
    key: 'setup-group',
    type: 'group',
    label: 'Set Up & Authorizations',
    children: [
      // Org reference data, parents before children (Company → Branch →
      // Department), then the job structure, then employee lookups.
      {
        key: 'organization',
        title: 'Organization',
        icon: <ClusterOutlined />,
        children: [
          {
            key: 'org-structure',
            type: 'group',
            label: 'Structure',
            children: [
              { key: 'companies',   title: 'Companies',   link: '/companies',   permissions: ['company-list'] },
              { key: 'branches',    title: 'Branches',    link: '/branches',    permissions: ['branch-list'] },
              { key: 'departments', title: 'Departments', link: '/departments', permissions: ['department-list'] },
            ],
          },
          {
            key: 'org-jobs',
            type: 'group',
            label: 'Job Structure',
            children: [
              { key: 'positions', title: 'Positions', link: '/positions', permissions: ['position-list'] },
              { key: 'ranks',     title: 'Ranks',     link: '/ranks',     permissions: ['rank-list'] },
            ],
          },
          {
            key: 'org-lookups',
            type: 'group',
            label: 'Employee Lookups',
            children: [
              { key: 'promodizer-brands', title: 'Promodizer Brands', link: '/promodizer-brands', permissions: ['promodizer-brand-list'] },
            ],
          },
        ],
      },
      // Approval procedures shared by MRF, Leave, Manual Time Entries and
      // the older modules (vueportal's Access Chart screens).
      {
        key: 'approvals',
        title: 'Approvals',
        icon: <AuditOutlined />,
        children: [
          { key: 'access-charts',      title: 'Access Charts',      link: '/access-charts',      permissions: ['access-chart-list'] },
          { key: 'approving-officers', title: 'Approving Officers', link: '/approving-officers', permissions: ['access-chart-list'] },
        ],
      },
      {
        key: 'user-management',
        title: 'User Management',
        icon: <UserOutlined />,
        children: [
          { key: 'user-list', title: 'User Accounts', link: '/users', permissions: ['user-list'] },
        ],
      },
      { key: 'roles',       title: 'Roles',       icon: <TeamOutlined />,    link: '/roles',       permissions: ['role-list'] },
      { key: 'permissions', title: 'Permissions', icon: <SettingOutlined />, link: '/permissions', permissions: ['permission-list'] },
      // Who added / edited / deleted leave, attendance and payroll records.
      { key: 'audit-trail', title: 'Audit Trail', icon: <FileSearchOutlined />, link: '/audit-trail', permissions: ['activity-logs'] },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getMenuState(items, path) {
  let activeKey = '';
  let openKeys = [];

  // Pass 1: Exact match
  const findExact = (items, parents = []) => {
    for (const item of items) {
      if (!item || item.type === 'divider') continue;

      if (item.link === path) {
        activeKey = item.key;
        openKeys = parents;
        return true;
      }

      if (item.children && findExact(item.children, [...parents, item.key])) {
        return true;
      }
    }

    return false;
  };

  // Pass 2: Prefix match
  const findPartial = (items, parents = []) => {
    for (const item of items) {
      if (!item || item.type === 'divider') continue;

      if (
        item.link &&
        path.startsWith(item.link + '/')
      ) {
        activeKey = item.key;
        openKeys = parents;
        return true;
      }

      if (item.children && findPartial(item.children, [...parents, item.key])) {
        return true;
      }
    }

    return false;
  };

  findExact(items) || findPartial(items);

  return { activeKey, openKeys };
}

// ─── Main Layout ───────────────────────────────────────────────────────────────
const MainLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isLoaded, hasPermission, hasRole, hasAnyPermission, clearAuth } = useAuth();
  const { modal, message: messageApi } = App.useApp();

  const runSyncAction = (name) => {
    const { title, content, request } = SYNC_ACTIONS[name];
    modal.confirm({
      title,
      content,
      okText: 'Proceed',
      // Resolves when the request finishes, so the dialog shows a spinner
      // on Proceed until then.
      onOk: async () => {
        try {
          const { data } = await request();
          if (data?.error) messageApi.error(typeof data.error === 'string' ? data.error : `${title} failed.`);
          else messageApi.success(data?.message || `${title} done.`);
        } catch (error) {
          handleApiError(error, messageApi);
        }
      },
    });
  };
  const [collapsed, setCollapsed] = React.useState(false);
  // Below lg (tablets / phones) the menu is a slide-in drawer over the page
  // instead of the inline sidebar, and the header goes compact.
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;
  const isNarrow = screens.md === false;
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // phones: the header's search icon swaps the header for a full-width search
  const [searchOpen, setSearchOpen] = React.useState(false);
  if (searchOpen && !isNarrow) setSearchOpen(false);
  // any navigation closes the drawer
  const [drawerPath, setDrawerPath] = React.useState(pathname);
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  const getPageMeta = (pathname) => {
    if (titleMap[pathname]) return titleMap[pathname];
    if (/^\/kpi-templates\/\d+\/edit$/.test(pathname))
      return { title: 'Edit KPI Template', breadcrumb: ['KPI Management', 'KPI Templates', 'Edit'] };
    if (/^\/payroll-runs\/\d+$/.test(pathname))
      return { title: 'Payroll Run', breadcrumb: ['Payroll', 'Payroll Runs', 'View'] };
    if (/^\/roles\/\d+\/edit$/.test(pathname))
      return { title: 'Edit Role', breadcrumb: ['Authorizations', 'Roles', 'Edit'] };
    if (/^\/employees\/\d+$/.test(pathname))
      return { title: 'Employee Profile', breadcrumb: ['Employee', 'Profile'] };
    if (/^\/employees\/\d+\/edit$/.test(pathname))
      return { title: 'Edit Employee', breadcrumb: ['Employee', 'Edit'] };
    if (/^\/acknowledgment-reports\/\d+$/.test(pathname))
      return { title: 'View Branch Report', breadcrumb: ['Reports', 'Branch Reports', 'View'] };
    if (/^\/kpi-evaluations\/\d+$/.test(pathname))
      return { title: 'View Evaluation', breadcrumb: ['KPI Management', 'Evaluations', 'View'] };
    if (/^\/my-evaluations\/\d+$/.test(pathname))
      return { title: 'Self Evaluation', breadcrumb: ['KPI Management', 'My Evaluations', 'Fill'] };
    if (/^\/manpower-requests\/\d+\/edit$/.test(pathname))
      return { title: 'Edit Manpower Request', breadcrumb: ['Manpower Request', 'Edit'] };
    if (/^\/manpower-requests\/\d+\/print$/.test(pathname))
      return { title: 'Print Manpower Request', breadcrumb: ['Manpower Request', 'Print'] };
    if (/^\/manpower-requests\/\d+$/.test(pathname))
      return { title: 'View Manpower Request', breadcrumb: ['Manpower Request', 'View'] };
    return { title: '', breadcrumb: ['Home'] };
  };

  const pageMeta = getPageMeta(pathname);

  const { activeKey, openKeys } = getMenuState(menuData, pathname);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Product rule: the Administrator sees every menu entry
  const isAdmin = hasRole('Administrator');
  const canSeeItem = (item) => {
    if (isAdmin) return true;
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.permissions && !item.permissions.some((p) => hasPermission(p))) return false;
    return true;
  };

  // ─── Menu item generator ─────────────────────────────────────────────────────
  const generateMenuItem = (item) => {
    if (!item) return null;

    if (item.type === 'divider') return { type: 'divider' };

    if (item.type === 'group') {
      const children = item.children?.map(generateMenuItem).filter(Boolean);
      if (!children?.length) return null;
      return {
        type: 'group',
        key: item.key,
        label: (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {item.label}
          </span>
        ),
        children,
      };
    }

    if (!canSeeItem(item)) return null;

    if (item.children) {
      const children = item.children.map(generateMenuItem).filter(Boolean);
      if (!children.length) return null;
      return {
        key: item.key,
        icon: React.isValidElement(item.icon)
          ? React.cloneElement(item.icon, { style: { color: 'rgba(255,255,255,0.65)', fontSize: 14 } })
          : item.icon,
        label: <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{item.title}</span>,
        children,
      };
    }

    const isActive = item.key === activeKey;
    return {
      key: item.key,
      ...(item.action ? { onClick: () => runSyncAction(item.action) } : {}),
      icon: React.isValidElement(item.icon)
        ? React.cloneElement(item.icon, {
            style: { color: isActive ? '#fff' : 'rgba(255,255,255,0.65)', fontSize: 14 },
          })
        : item.icon,
      label: item.link
        ? <Link to={item.link} style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.85)', fontSize: 13 }}>{item.title}</Link>
        : <span style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.85)', fontSize: 13 }}>{item.title}</span>,
    };
  };

  const isEmployeeOnly = hasRole('KPI Self Evaluation') && !hasAnyPermission('hr-payroll-dashboard');
  
  const menuItems = isEmployeeOnly
    ? [
        {
          key:   'my-evaluations',
          icon:  <StarOutlined style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }} />,
          label: <Link to='/my-evaluations' style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>My Evaluations</Link>,
        },
        {
          key:   'my-payslips',
          icon:  <WalletOutlined style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }} />,
          label: <Link to='/my-payslips' style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>My Payslips</Link>,
        },
      ]
    : tidyDividers(menuData.map(generateMenuItem).filter(Boolean));

  // ─── Menu search entries ──────────────────────────────────────────────────────
  // The same entries the sidebar shows (same permission check), flattened
  // with the section titles above each one, e.g. Time & Leave › Setup.
  const collectSearchItems = (items, path = []) => items.flatMap((item) => {
    if (!item || item.type === 'divider') return [];
    if (item.type === 'group') return collectSearchItems(item.children ?? [], [...path, item.label]);
    if (!canSeeItem(item)) return [];
    if (item.children) return collectSearchItems(item.children, [...path, item.title]);
    return item.link || item.action ? [{ key: item.key, title: item.title, path, link: item.link, action: item.action }] : [];
  });

  const searchItems = isEmployeeOnly
    ? [{ key: 'my-evaluations', title: 'My Evaluations', path: [], link: '/my-evaluations' }, { key: 'my-payslips', title: 'My Payslips', path: [], link: '/my-payslips' }]
    : collectSearchItems(menuData);

  const openSearchItem = (item) => {
    setSearchOpen(false);
    if (item.action) runSyncAction(item.action);
    else navigate(item.link);
  };
  // the inline search box narrows with the screen; phones get an icon instead
  const searchWidth = screens.xl ? 260 : isMobile ? 180 : 220;

  // ─── Avatar dropdown ──────────────────────────────────────────────────────────
  const avatarMenu = {
    items: [
      // phones: who is signed in (the chip shows only the avatar) — a plain
      // header, not a greyed disabled item
      ...(isNarrow ? [{
        type: 'group',
        key: 'who',
        label: <div style={{ lineHeight: 1.3, color: 'rgba(0,0,0,0.88)' }}><div style={{ fontWeight: 600 }}>{user?.name}</div><div style={{ fontSize: 11, color: '#8c8c8c' }}>{user?.role ?? 'User'}</div></div>,
      }, { type: 'divider' }] : []),
      { key: 'profile', label: 'Profile', icon: <UserOutlined />,  onClick: () => navigate('/user/profile') },
      { key: 'my-payslips', label: 'My Payslips', icon: <WalletOutlined />, onClick: () => navigate('/my-payslips') },
      { type: 'divider' },
      { key: 'logout',  label: 'Logout',  icon: <LogoutOutlined />, onClick: handleLogout },
    ],
  };

  // ─── Breadcrumb items ─────────────────────────────────────────────────────────
  const breadcrumbItems = pageMeta.breadcrumb.map((segment, i) => ({
    title:
      i < pageMeta.breadcrumb.length - 1 ? (
        <span style={{ color: '#8c8c8c' }}>{segment}</span>
      ) : (
        <span style={{ color: '#389e0d' }}>{segment}</span>
      ),
  }));

  // ─── Loading state ────────────────────────────────────────────────────────────
  const sidebarContent = (
    <>
        {/* ── Brand ──────────────────────────────────────────── */}
        <div
          style={{
          padding: '20px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
              width: 32,
              height: 32,
              background: '#389e0d',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              }}
            >
              <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                HR
              </Typography.Text>
            </div>
            {(isMobile || !collapsed) && (
                <div>
                <Typography.Text style={{ color: '#fff', fontSize: 12, fontWeight: 600, display: 'block' }}>
                    ADDESSA Corp
                </Typography.Text>
                <Typography.Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                    HRIS
                </Typography.Text>
                </div>
            )}
          </div>
        </div>

        {/* ── User info ──────────────────────────────────────── */}
        {/* {!collapsed && (
          <div
            style={{
                padding: '8px 16px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar
              size={32}
              icon={<UserOutlined />}
              style={{ background: '#389e0d', flexShrink: 0 }}
              />
              <div style={{ overflow: 'hidden' }}>
                <Typography.Text style={{ color: '#fff', fontSize: 12, fontWeight: 600, display: 'block' }} ellipsis>
                    {user?.name}
                </Typography.Text>
                <Typography.Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                    {user?.role ?? 'User'}
                </Typography.Text>
              </div>
            </div>
          </div>
        )} */}

        {/* ── Menu ───────────────────────────────────────────── */}
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                darkItemBg:             '#1a4d0f',
                darkSubMenuItemBg:      '#163d0b',    // ← submenu expanded bg
                darkItemSelectedBg:     '#389e0d',    // ← active item bg
                darkItemHoverBg:        '#215c12',    // ← hover bg
                darkItemSelectedColor:  '#ffffff',
                darkItemColor:          'rgba(255,255,255,0.85)',
                darkGroupTitleColor:    'rgba(255,255,255,0.35)',
              },
            },
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[activeKey]}
            defaultOpenKeys={openKeys}
            items={menuItems}
            // a picked page closes the mobile drawer (the route change does too)
            onClick={({ key }) => { if (isMobile && !menuItems.some((m) => m?.key === key && m.children)) setDrawerOpen(false); }}
            theme="dark"
            style={{
              background: '#1a4d0f',
              border: 'none',
              height: isMobile ? 'calc(100vh - 90px)' : 'calc(100vh - 180px)',
              overflowY: 'auto',
            }}
          />
        </ConfigProvider>
    </>
  );

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────────── */}
      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement='left'
          size={260}
          closable={false}
          styles={{ body: { padding: 0, background: '#1a4d0f' }, header: { display: 'none' } }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
        width={240}
        style={{
          background: '#1a4d0f',
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        {sidebarContent}
      </Sider>
      )}

      <Layout>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <Header
          style={{
            height: 52,
            padding: isNarrow ? '0 10px' : '0 16px',
            gap: 8,
            background: '#fff',
            borderBottom: '2px solid #389e0d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {isNarrow && searchOpen ? (
            <>
              <MenuSearch
                items={searchItems}
                onPick={openSearchItem}
                autoFocus
                popupWidth
                style={{ flex: 1, minWidth: 0 }}
              />
              <Button type="text" aria-label="Close search" icon={<CloseOutlined />} onClick={() => setSearchOpen(false)} style={{ flexShrink: 0 }} />
            </>
          ) : (
          <>
          {/* Left: hamburger + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isNarrow ? 8 : 12, minWidth: 0, flex: 1 }}>
            <Button
              type="text"
              aria-label="Menu"
              icon={<MenuOutlined style={{ color: '#389e0d' }} />}
              onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
              style={{
                background: '#f6ffed',
                border: '0.5px solid #d9f7be',
                borderRadius: 6,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: -5,
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <Text strong ellipsis style={{ fontSize: 14, color: '#1a4d0f', display: 'block', lineHeight: 1.3, maxWidth: '100%' }}>
                {pageMeta.title}
              </Text>
              {!isNarrow && <Breadcrumb items={breadcrumbItems} style={{ fontSize: 11 }} />}
            </div>
          </div>

          {/* Right: menu search + bell + user chip */}
          <Space align="center" size={isNarrow ? 6 : 10} style={{ flexShrink: 0 }}>
            {isNarrow ? (
              <Button type="text" aria-label="Search menu" icon={<SearchOutlined style={{ color: '#389e0d' }} />} onClick={() => setSearchOpen(true)} />
            ) : (
              <MenuSearch
                items={searchItems}
                onPick={openSearchItem}
                placeholder="Search menu… (Ctrl+K)"
                style={{ width: searchWidth }}
              />
            )}
            <NotificationBell />

            <Dropdown menu={avatarMenu} placement="bottomRight" trigger={['click']}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: isNarrow ? 4 : '4px 10px 4px 4px',
                  height: 40, // fixed — the name never wraps the chip taller
                  boxSizing: 'border-box',
                  flexShrink: 0,
                  maxWidth: 240,
                  borderRadius: 8,
                  border: '0.5px solid #d9f7be',
                  background: '#fff',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f6ffed')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <Avatar
                  size={28}
                  style={{ flexShrink: 0, background: '#d9f7be', color: '#276221', fontSize: 11, fontWeight: 600 }}
                  icon={<UserOutlined />}
                />
                {/* phones: avatar only (name / role in the menu) */}
                {!isNarrow && (
                  <>
                    <div style={{ lineHeight: 1.3, minWidth: 0, whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a4d0f', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user?.name}>{user?.name}</div>
                      <div style={{ fontSize: 11, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.role ?? 'User'}</div>
                    </div>
                    <DownOutlined style={{ fontSize: 10, color: '#8c8c8c', marginLeft: 2 }} />
                  </>
                )}
              </div>
            </Dropdown>
          </Space>
          </>
          )}
        </Header>

        {/* ── Content ────────────────────────────────────────────────────────── */}
        <Content
          style={{
            margin: isNarrow ? 6 : 10,
            background: '#fff',
            padding: isNarrow ? 12 : 24,
            borderRadius: 8,
            overflow: 'auto',
            height: isNarrow ? 'calc(100vh - 52px - 12px)' : 'calc(100vh - 52px - 20px)',
          }}
        >
          <Outlet />
        </Content>

      </Layout>
    </Layout>
  );
};

export default MainLayout;