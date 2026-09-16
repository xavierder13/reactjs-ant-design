"use client";

import { Tabs, Empty } from "antd";

// Backed by `employee_master_data/nte` and `/disciplinary` route groups.
// Deferred; see the `employee-master-data` skill's Roadmap.
const COMING_SOON = (
  <Empty description="Not yet implemented — see the employee-master-data skill's Roadmap." style={{ padding: "24px 0" }} />
);

export default function DisciplinaryTab() {
  const items = [
    { key: "nte", label: "Issued NTE", children: COMING_SOON },
    { key: "disciplinary", label: "Disciplinary Actions", children: COMING_SOON },
  ];

  return <Tabs defaultActiveKey="nte" items={items} />;
}
