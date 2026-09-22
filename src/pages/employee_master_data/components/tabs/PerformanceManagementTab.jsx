"use client";

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
export default function PerformanceManagementTab({ mode = "create", initialData }) {
  const { hasPermission } = useAuth();
  const employeeId = initialData?.id;

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
        />
      ),
    },
  ];

  // On create (no employeeId yet, permissions still apply): show every tab
  // the user is permitted to eventually use, each rendering its own
  // "save the employee first" Empty state — matches every sub-tab
  // component's own create-mode guard.
  const items = allItems.filter((item) => hasPermission(item.permission));

  if (!items.length) return null;

  return <Tabs defaultActiveKey={items[0].key} items={items} />;
}
