// Tab definitions shared by EmployeeTabs.jsx (create/edit) and the Employee
// Profile page (profile/EmployeeProfile.jsx, which reuses the record tabs).
import {
  UserOutlined, SolutionOutlined, ScheduleOutlined, FieldTimeOutlined,
  RiseOutlined, WarningOutlined, LogoutOutlined,
} from "@ant-design/icons";
import PersonalDataTab from "./tabs/PersonalDataTab";
import EmployeeDetailsTab from "./tabs/EmployeeDetailsTab";
import PerformanceManagementTab from "./tabs/PerformanceManagementTab";
import DisciplinaryTab from "./tabs/DisciplinaryTab";
import OffboardingTab from "./tabs/OffboardingTab";
import WorkScheduleTab from "./tabs/WorkScheduleTab";
import AttendanceTab from "./tabs/AttendanceTab";

// Each tab is hidden entirely (not just empty) for a user without its own
// permission — matches vueportal's `EmployeeInformationTabs.vue` `tabItems`
// computed property exactly (confirmed by reading its live code, not the
// dead `v-if`-per-tab markup commented out just above it in the same
// file, which looks equivalent but isn't what actually runs):
// `items.filter(value => value.hasPermission == true)` against these
// same 6 permission strings. Added 2026-09-22 after finding a real gap —
// the 3 sub-tabs built this session (Performance Management, Disciplinary,
// Offboarding) were only filtering their own inner sub-tabs, never gating
// the outer tab itself, so a role with a sub-permission but not the
// umbrella one (a real, confirmed-in-the-live-database case: "Payroll
// Admin" holds `employee-master-data-evaluation-regularization` but not
// `employee-master-data-performance-management`) would see a tab the
// reference app hides entirely.
export const TAB_PERMISSIONS = {
  personal: "employee-master-data-personal-data",
  details: "employee-master-data-employee-details",
  workSchedule: "employee-master-data-work-schedule",
  attendance: "employee-master-data-attendance",
  performance: "employee-master-data-performance-management",
  disciplinary: "employee-master-data-disciplinary-measures-penalties",
  offboarding: "employee-master-data-offboarding",
};

// Every tab's {key, label, children}, unfiltered — EmployeeTabs filters them by
// TAB_PERMISSIONS; the Employee Profile page reuses the record tabs (work
// schedule onward) in view mode.
export function getEmployeeTabItems({ mode, initialData, onEmployeeChange, onPersonalSubTabChange, onPerformanceSubTabChange, pendingCreateData, onPendingCreateDataChange }) {
  return [
    {
      key: "personal",
      label: "Personal Data",
      icon: <UserOutlined />,
      children: (
        <PersonalDataTab
          employeeId={initialData?.id}
          initialFiles={initialData?.files}
          mode={mode}
          onActiveSubTabChange={onPersonalSubTabChange}
          pendingCreateData={pendingCreateData}
          onPendingCreateDataChange={onPendingCreateDataChange}
        />
      ),
    },
    {
      key: "details",
      label: "Employee Details",
      icon: <SolutionOutlined />,
      children: <EmployeeDetailsTab initialData={initialData} mode={mode} />,
    },
    // Work Schedule + Attendance relocated here 2026-09-24, user-requested
    // ("relocate ... to recommended placing order with the other tab").
    // Both used to sit at the end, after the lifecycle-event tabs
    // (Performance/Disciplinary/Offboarding) — moved as a pair, not Work
    // Schedule alone, because separating them would have undercut the
    // reason for moving either: Work Schedule exists specifically to feed
    // Attendance's late/absence calculation (see WorkScheduleTab.jsx's own
    // header comment), so they belong adjacent to each other. Both are
    // ongoing operational/setup data in the same vein as Employee Details
    // (position/branch/employment type) — not an event that happens to an
    // employee over time, unlike Performance/Disciplinary/Offboarding,
    // which now follow as a group instead of being split by these two.
    {
      key: "workSchedule",
      label: "Work Schedule",
      icon: <ScheduleOutlined />,
      children: (
        <WorkScheduleTab
          mode={mode}
          initialData={initialData}
          pendingRecords={pendingCreateData?.workSchedules || []}
          onPendingRecordsChange={(rows) => onPendingCreateDataChange?.("workSchedules", rows)}
        />
      ),
    },
    {
      key: "attendance",
      label: "Attendance",
      icon: <FieldTimeOutlined />,
      children: <AttendanceTab initialData={initialData} />,
    },
    {
      key: "performance",
      label: "Performance Management",
      icon: <RiseOutlined />,
      children: (
        <PerformanceManagementTab
          mode={mode}
          initialData={initialData}
          // Branch Assignment rows can change the Employment Type (agency tag)
          onEmployeeChange={onEmployeeChange}
          onActiveSubTabChange={onPerformanceSubTabChange}
          pendingCreateData={pendingCreateData}
          onPendingCreateDataChange={onPendingCreateDataChange}
        />
      ),
    },
    {
      key: "disciplinary",
      label: "Disciplinary Measures & Penalties",
      icon: <WarningOutlined />,
      children: (
        <DisciplinaryTab
          mode={mode}
          initialData={initialData}
          pendingCreateData={pendingCreateData}
          onPendingCreateDataChange={onPendingCreateDataChange}
        />
      ),
    },
    {
      key: "offboarding",
      label: "Offboarding",
      icon: <LogoutOutlined />,
      // onEmployeeChange: matches Offboarding.vue's `$emit('updateStatus', ...)`
      // — lets a resign/rehire flip the employee's `active`/`date_resigned`
      // live on this page (Card title, Employee Details Status), not just
      // in this tab's own local records list. See EmployeeForm.jsx.
      children: <OffboardingTab mode={mode} initialData={initialData} onEmployeeChange={onEmployeeChange} />,
    },
  ];
}
