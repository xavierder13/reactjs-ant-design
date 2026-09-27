"use client";

import { useEffect, useState } from "react";
import { Tabs } from "antd";

import useAuth from "../../../../hooks/useAuth";
import EvaluationRegularizationTab from "./performance/EvaluationRegularizationTab";
import MonthlyKeyPerformanceTab from "./performance/MonthlyKeyPerformanceTab";
import ClassroomPerformanceRatingTab from "./performance/ClassroomPerformanceRatingTab";
import OjtPerformanceRatingTab from "./performance/OjtPerformanceRatingTab";
import BranchAssignmentPositionTab from "./performance/BranchAssignmentPositionTab";
import MeritHistoryTab from "./performance/MeritHistoryTab";
import TrainingTab from "./performance/TrainingTab";

// Sub-tabs mirror vueportal's EmployeeInformationTabs.vue Performance
// Management tab. None of the 6 record-based sub-modules (everything
// except Evaluation & Regularization) has an index() endpoint on the
// backend — each one's data is already eager-loaded onto the employee
// object by `/employee_master_data/index` (see EmployeeMasterDataController::
// getEmployees()), so `initialData` (the same router-state employee record
// EmployeeForm.jsx already receives) is threaded straight through as each
// sub-tab's starting data — no new fetch. See the employee-master-data
// skill for the full backend contracts and the real bugs found while
// building this (Classroom/OJT Performance Rating's import/template
// routes reference controller methods that don't exist).
//
// Each sub-tab is hidden entirely (not just disabled) for a user without
// its own `-list` permission, matching vueportal's own
// EmployeeInformationTabs.vue `tabItems` computed property.
// onActiveSubTabChange: reports the active sub-tab key up to
// EmployeeForm.jsx (via EmployeeTabs.jsx) — needed to decide Save-button
// visibility, matching EmployeeInformationTabs.vue's
// `currPerformanceTabText == 'Evaluation & Regularization'` check (Save
// only shows on that one sub-tab, never the other 6). See EmployeeForm.jsx.
// pendingCreateData/onPendingCreateDataChange (create mode only): one
// object + one updater lifted all the way to EmployeeForm.jsx, holding
// every sub-tab's staged-but-not-yet-saved rows — matches
// EmployeeMasterDataController@store() bundling all of these (except
// Offboarding, which store() has no handling for at all) into the SAME
// request that creates the employee. Each sub-tab reads/writes only its
// own named slice via a tiny (key) => value / (value) => update(key,
// value) adapter, so this component stays a single prop pair instead of
// threading 6 separate pairs.
export default function PerformanceManagementTab({ mode = "create", initialData, onActiveSubTabChange, pendingCreateData, onPendingCreateDataChange }) {
  const { hasPermission } = useAuth();
  const employeeId = initialData?.id;
  const pending = (key) => pendingCreateData?.[key] || [];
  const setPending = (key) => (value) => onPendingCreateDataChange(key, value);

  const allItems = [
    {
      key: "eval",
      label: "Evaluation & Regularization",
      permission: "employee-master-data-evaluation-regularization",
      children: (
        <EvaluationRegularizationTab
          employeeId={employeeId}
          mode={mode}
          initialFiles={initialData?.files}
          pendingFiles={pendingCreateData?.files || []}
          onPendingFilesChange={setPending("files")}
        />
      ),
    },
    {
      key: "kpi",
      label: "Monthly Key Performance",
      permission: "employee-master-data-key-performance-list",
      children: (
        <MonthlyKeyPerformanceTab
          employeeId={employeeId}
          mode={mode}
          initialRecords={initialData?.monthly_key_performances}
          pendingRecords={pending("monthlyKeyPerformances")}
          onPendingRecordsChange={setPending("monthlyKeyPerformances")}
        />
      ),
    },
    {
      key: "classroom",
      label: "Classroom Performance Rating",
      permission: "employee-master-data-classroom-performance-rating-list",
      children: (
        <ClassroomPerformanceRatingTab
          employeeId={employeeId}
          mode={mode}
          initialRecords={initialData?.classroom_performance_ratings}
          pendingRecords={pending("classroomPerformanceRatings")}
          onPendingRecordsChange={setPending("classroomPerformanceRatings")}
        />
      ),
    },
    {
      key: "ojt",
      label: "OJT Performance Rating",
      permission: "employee-master-data-ojt-performance-rating-list",
      children: (
        <OjtPerformanceRatingTab
          employeeId={employeeId}
          mode={mode}
          initialRecords={initialData?.ojt_performance_ratings}
          pendingRecords={pending("ojtPerformanceRatings")}
          onPendingRecordsChange={setPending("ojtPerformanceRatings")}
        />
      ),
    },
    {
      key: "branch_position",
      label: "Branch Assignment & Positions",
      permission: "employee-master-data-branch-assignment-position-list",
      children: (
        <BranchAssignmentPositionTab
          employeeId={employeeId}
          mode={mode}
          initialRecords={initialData?.branch_assignment_positions}
          pendingRecords={pending("branchAssignmentPositions")}
          onPendingRecordsChange={setPending("branchAssignmentPositions")}
        />
      ),
    },
    {
      key: "merit",
      label: "Merit History",
      permission: "employee-master-data-merit-history-list",
      children: (
        <MeritHistoryTab
          employeeId={employeeId}
          mode={mode}
          initialRecords={initialData?.merit_histories}
          pendingRecords={pending("meritHistories")}
          onPendingRecordsChange={setPending("meritHistories")}
        />
      ),
    },
    {
      key: "training",
      label: "Training",
      permission: "employee-master-data-training-list",
      children: (
        <TrainingTab
          employeeId={employeeId}
          mode={mode}
          initialRecords={initialData?.trainings}
          pendingRecords={pending("trainings")}
          onPendingRecordsChange={setPending("trainings")}
        />
      ),
    },
  ];

  // On create (no employeeId yet, permissions still apply): show every tab
  // the user is permitted to eventually use — each now supports staging
  // its own records locally (see pendingCreateData above) instead of
  // blocking until the employee is saved.
  const items = allItems.filter((item) => hasPermission(item.permission));

  const [activeKey, setActiveKey] = useState(items[0]?.key);
  useEffect(() => { onActiveSubTabChange?.(activeKey); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items.length) return null;

  const handleChange = (key) => {
    setActiveKey(key);
    onActiveSubTabChange?.(key);
  };

  return <Tabs activeKey={activeKey} onChange={handleChange} items={items} />;
}
