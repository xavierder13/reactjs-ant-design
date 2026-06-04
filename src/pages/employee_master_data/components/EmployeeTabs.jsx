"use client";

import { Tabs } from "antd";

import PersonalDataTab from "./tabs/PersonalDataTab";
import EmployeeDetailsTab from "./tabs/EmployeeDetailsTab";
import PerformanceManagementTab from "./tabs/PerformanceManagementTab";
import DisciplinaryTab from "./tabs/DisciplinaryTab";
import OffboardingTab from "./tabs/OffboardingTab";
import AttendanceTab from "./tabs/AttendanceTab";

export default function EmployeeTabs() {
  const items = [
    {
      key: "personal",
      label: "Personal Data",
      children: <PersonalDataTab />,
    },
    {
      key: "details",
      label: "Employee Details",
      children: <EmployeeDetailsTab />,
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