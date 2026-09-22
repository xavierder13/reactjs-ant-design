"use client";

import { Tabs } from "antd";

import useAuth from "../../../hooks/useAuth";
import PersonalDataTab from "./tabs/PersonalDataTab";
import EmployeeDetailsTab from "./tabs/EmployeeDetailsTab";
import PerformanceManagementTab from "./tabs/PerformanceManagementTab";
import DisciplinaryTab from "./tabs/DisciplinaryTab";
import OffboardingTab from "./tabs/OffboardingTab";
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
  performance: "employee-master-data-performance-management",
  disciplinary: "employee-master-data-disciplinary-measures-penalties",
  offboarding: "employee-master-data-offboarding",
  attendance: "employee-master-data-attendance",
};

export default function EmployeeTabs({ mode = "create", initialData }) {
  const { hasPermission } = useAuth();

  const allItems = [
    {
      key: "personal",
      label: "Personal Data",
      children: <PersonalDataTab employeeId={initialData?.id} initialFiles={initialData?.files} mode={mode} />,
    },
    {
      key: "details",
      label: "Employee Details",
      children: <EmployeeDetailsTab initialData={initialData} mode={mode} />,
    },
    {
      key: "performance",
      label: "Performance Management",
      children: <PerformanceManagementTab mode={mode} initialData={initialData} />,
    },
    {
      key: "disciplinary",
      label: "Disciplinary Measures & Penalties",
      children: <DisciplinaryTab mode={mode} initialData={initialData} />,
    },
    {
      key: "offboarding",
      label: "Offboarding",
      children: <OffboardingTab mode={mode} initialData={initialData} />,
    },
    {
      key: "attendance",
      label: "Attendance",
      children: <AttendanceTab initialData={initialData} />,
    },
  ];

  const items = allItems.filter((item) => hasPermission(TAB_PERMISSIONS[item.key]));

  return <Tabs defaultActiveKey={items[0]?.key} items={items} />;
}
