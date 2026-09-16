"use client";

import { Tabs } from "antd";

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
export default function EmployeeTabs({ mode = "create", initialData }) {
  const items = [
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
      children: <PerformanceManagementTab />,
    },
    {
      key: "disciplinary",
      label: "Disciplinary Measures & Penalties",
      children: <DisciplinaryTab />,
    },
    {
      key: "offboarding",
      label: "Offboarding",
      children: <OffboardingTab />,
    },
    {
      key: "attendance",
      label: "Attendance",
      children: <AttendanceTab />,
    },
  ];

  return <Tabs defaultActiveKey="personal" items={items} />;
}
