"use client";

import { useEffect, useState } from "react";
import { Tabs } from "antd";

import useAuth from "../../../hooks/useAuth";
import PersonalDataTab from "./tabs/PersonalDataTab";
import EmployeeDetailsTab from "./tabs/EmployeeDetailsTab";
import PerformanceManagementTab from "./tabs/PerformanceManagementTab";
import DisciplinaryTab from "./tabs/DisciplinaryTab";
import OffboardingTab from "./tabs/OffboardingTab";
import WorkScheduleTab from "./tabs/WorkScheduleTab";
import AttendanceTab from "./tabs/AttendanceTab";

// mode: 'create' | 'edit' | 'view'. All tabs render inside EmployeeForm.jsx's
// single shared <Form> — see PersonalInformation.jsx's header comment.
// initialData is the employee record (from router state on edit/view,
// undefined on create) — only used here for the read-only/derived display
// bits (EmployeeDetailsTab) and for seeding Files & Requirements; the
// editable field values themselves are set via form.setFieldsValue in
// EmployeeForm.jsx, not passed as props.
//
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
const TAB_PERMISSIONS = {
  personal: "employee-master-data-personal-data",
  details: "employee-master-data-employee-details",
  workSchedule: "employee-master-data-work-schedule",
  attendance: "employee-master-data-attendance",
  performance: "employee-master-data-performance-management",
  disciplinary: "employee-master-data-disciplinary-measures-penalties",
  offboarding: "employee-master-data-offboarding",
};

// activeTab/activeSubTab are lifted to EmployeeForm.jsx — it needs to know
// which tab (and, for Personal Data / Performance Management, which
// sub-tab) is active to decide whether the main Save button should show
// at all, per EmployeeInformationTabs.vue's `changeSaveBtnVisibility()`
// (see EmployeeForm.jsx for the full port of that logic).
// onPersonalSubTabChange/onPerformanceSubTabChange are two separate
// callbacks, not one shared one — AntD's Tabs keeps every pane mounted by
// default (not just the active one), so Personal Data and Performance
// Management mount at the same time and would both report into one
// shared "active sub-tab" value if it were shared, and whichever fired
// last would silently overwrite the other's — a real bug caught before
// it shipped, not a hypothetical.
// pendingCreateData/onPendingCreateDataChange (create mode only): the
// single object + updater holding every sub-tab's staged-but-not-yet-saved
// rows/files, lifted all the way from EmployeeForm.jsx (see that file for
// the full rationale and the final bundling into one multipart create
// request — matches EmployeeMasterDataController@store() accepting all of
// these except Offboarding in the same request that creates the employee).
export default function EmployeeTabs({ mode = "create", initialData, onEmployeeChange, onActiveTabChange, onPersonalSubTabChange, onPerformanceSubTabChange, pendingCreateData, onPendingCreateDataChange }) {
  const { hasPermission } = useAuth();

  const allItems = [
    {
      key: "personal",
      label: "Personal Data",
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
      children: <WorkScheduleTab mode={mode} initialData={initialData} />,
    },
    {
      key: "attendance",
      label: "Attendance",
      children: <AttendanceTab initialData={initialData} />,
    },
    {
      key: "performance",
      label: "Performance Management",
      children: (
        <PerformanceManagementTab
          mode={mode}
          initialData={initialData}
          onActiveSubTabChange={onPerformanceSubTabChange}
          pendingCreateData={pendingCreateData}
          onPendingCreateDataChange={onPendingCreateDataChange}
        />
      ),
    },
    {
      key: "disciplinary",
      label: "Disciplinary Measures & Penalties",
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
      // onEmployeeChange: matches Offboarding.vue's `$emit('updateStatus', ...)`
      // — lets a resign/rehire flip the employee's `active`/`date_resigned`
      // live on this page (Card title, Employee Details Status), not just
      // in this tab's own local records list. See EmployeeForm.jsx.
      children: <OffboardingTab mode={mode} initialData={initialData} onEmployeeChange={onEmployeeChange} />,
    },
  ];

  const items = allItems.filter((item) => hasPermission(TAB_PERMISSIONS[item.key]));

  const [activeKey, setActiveKey] = useState(items[0]?.key);
  // Reports the initial default tab up once on mount (onChange only fires
  // on a user-driven switch, not for AntD's own default-active selection)
  // — a child's effect calling a parent-owned setter, not this component
  // setting its own state in its own effect, so it doesn't trip
  // react-hooks/set-state-in-effect.
  useEffect(() => { onActiveTabChange?.(activeKey); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (key) => {
    setActiveKey(key);
    onActiveTabChange?.(key);
  };

  return <Tabs activeKey={activeKey} onChange={handleChange} items={items} />;
}
