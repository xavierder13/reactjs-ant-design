"use client";

import { Tabs } from "antd";

import useAuth from "../../../../hooks/useAuth";
import NteRecordsTab from "./disciplinary/NteRecordsTab";
import DisciplinaryRecordsTab from "./disciplinary/DisciplinaryRecordsTab";

// Backed by `employee_master_data/nte` and `/disciplinary` route groups.
// Same shape as Performance Management's sub-tabs: neither `index()`
// method here is used by this tab — both are real, but each is a
// **global, cross-employee "open cases" queue** scoped by manager
// hierarchy (confirmed by reading both controllers), not a per-employee
// list. This tab instead reads `explanations`/`disciplinaries` off the
// employee record itself (eager-loaded on every
// `/employee_master_data/index` row), same as every Performance
// Management sub-tab. See the employee-master-data skill for the full
// backend contracts, including the multipart create/update shape and the
// "existing file blocks replacement on update" limitation both share.
//
// Each sub-tab is hidden entirely (not just disabled) for a user without
// its own `-list` permission, matching PerformanceManagementTab.jsx and
// vueportal's own `EmployeeInformationTabs.vue` `tabItems` pattern.
export default function DisciplinaryTab({ mode = "create", initialData }) {
  const { hasPermission } = useAuth();
  const employeeId = initialData?.id;

  const allItems = [
    {
      key: "nte",
      label: "Issued NTE",
      permission: "employee-master-data-nte-list",
      children: (
        <NteRecordsTab
          employeeId={employeeId}
          mode={mode}
          initialRecords={initialData?.explanations}
        />
      ),
    },
    {
      key: "disciplinary",
      label: "Disciplinary Actions",
      permission: "employee-master-data-disciplinary-list",
      children: (
        <DisciplinaryRecordsTab
          employeeId={employeeId}
          mode={mode}
          initialRecords={initialData?.disciplinaries}
        />
      ),
    },
  ];

  const items = allItems.filter((item) => hasPermission(item.permission));

  if (!items.length) return null;

  return <Tabs defaultActiveKey={items[0].key} items={items} />;
}
