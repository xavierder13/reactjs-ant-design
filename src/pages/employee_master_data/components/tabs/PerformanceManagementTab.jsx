"use client";

import { Tabs, Empty } from "antd";

// Sub-tabs mirror vueportal's EmployeeInformationTabs.vue Performance
// Management tab (Evaluation & Regularization, Monthly Key Performance,
// Classroom/OJT Performance Rating, Branch Assignment & Positions, Merit
// History, Training) — each is its own CRUD module against its own backend
// route group (`employee_master_data/key_performance`,
// `/classroom_performance_rating`, `/ojt_performance_rating`,
// `/branch_assignment_position`, `/merit_history`, `/training`). Deferred
// to a follow-up pass; see the `employee-master-data` skill's Roadmap.
const COMING_SOON = (
  <Empty description="Not yet implemented — see the employee-master-data skill's Roadmap." style={{ padding: "24px 0" }} />
);

export default function PerformanceManagementTab() {
  const items = [
    { key: "eval", label: "Evaluation & Regularization", children: COMING_SOON },
    { key: "kpi", label: "Monthly Key Performance", children: COMING_SOON },
    { key: "classroom", label: "Classroom Performance Rating", children: COMING_SOON },
    { key: "ojt", label: "OJT Performance Rating", children: COMING_SOON },
    { key: "branch_position", label: "Branch Assignment & Positions", children: COMING_SOON },
    { key: "merit", label: "Merit History", children: COMING_SOON },
    { key: "training", label: "Training", children: COMING_SOON },
  ];

  return <Tabs defaultActiveKey="eval" items={items} />;
}
