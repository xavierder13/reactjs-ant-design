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
// pendingCreateData/onPendingCreateDataChange (create mode only): see
// PerformanceManagementTab.jsx for why this is one object + one updater
// rather than a prop pair per sub-tab.
export default function DisciplinaryTab({ mode = "create", initialData, pendingCreateData, onPendingCreateDataChange }) {
  const { hasPermission } = useAuth();
  const employeeId = initialData?.id;
  const pending = (key) => pendingCreateData?.[key] || [];
  const setPending = (key) => (value) => onPendingCreateDataChange(key, value);

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
          pendingRecords={pending("explanations")}
          onPendingRecordsChange={setPending("explanations")}
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
          pendingRecords={pending("disciplinaries")}
          onPendingRecordsChange={setPending("disciplinaries")}
        />
      ),
    },
  ];

  const items = allItems.filter((item) => hasPermission(item.permission));

  if (!items.length) return null;

  return <Tabs defaultActiveKey={items[0].key} items={items} />;
}
