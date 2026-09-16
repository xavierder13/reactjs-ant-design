"use client";

import { Empty } from "antd";

// Backed by `employee_master_data/attendance` (joined server-side against a
// separate BioBridge biometric system via employee_code). Deferred; see the
// `employee-master-data` skill's Roadmap.
export default function AttendanceTab() {
  return (
    <Empty description="Not yet implemented — see the employee-master-data skill's Roadmap." style={{ padding: "24px 0" }} />
  );
}
