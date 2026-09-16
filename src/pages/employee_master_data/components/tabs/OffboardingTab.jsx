"use client";

import { Empty } from "antd";

// Previously a mislabeled copy-paste of AttendanceTab.jsx's Date/Time
// In/Time Out columns — Offboarding has no attendance-log shape at all.
// Real fields need a decision first: vueportal keeps offboarding data in
// BOTH `employee_master_data` columns (last_day_of_work, reason_of_
// resignation, resignation_date_filed, resignation_effectivity_date,
// coe_is_issued, last_pay_is_issued, compliance) AND a separate
// `employee_offboardings` table with its own controller — which one is
// authoritative could not be confirmed from the vueportal code. See the
// `employee-master-data` skill's Roadmap before building this tab.
export default function OffboardingTab() {
  return (
    <Empty description="Not yet implemented — offboarding's authoritative data source needs a product decision first. See the employee-master-data skill's Roadmap." style={{ padding: "24px 0" }} />
  );
}
