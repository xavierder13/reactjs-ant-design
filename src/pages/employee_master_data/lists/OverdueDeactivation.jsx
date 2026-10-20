import { Tag } from "antd";
import { StopOutlined } from "@ant-design/icons";

import syncApi from "../../../services/employee/syncApi";
import { formatDate } from "../../../utils/formatDate";
import OverdueRunList from "./OverdueRunList";

const columns = [
  { title: "Employment Type", dataIndex: "employment_type", key: "employment_type", render: (v) => v || "-" },
  { title: "Last Day of Work", dataIndex: "last_day_of_work", key: "last_day_of_work", render: (v) => formatDate(v) },
  { title: "Reason", dataIndex: "reason", key: "reason", render: (v) => v || "-" },
  {
    title: "Overdue",
    dataIndex: "days_overdue",
    key: "days_overdue",
    sorter: (a, b) => a.days_overdue - b.days_overdue,
    render: (v) => <Tag color={v > 0 ? "red" : "orange"}>{v > 0 ? `${v} day(s)` : "Today"}</Tag>,
  },
];

// Employee → Separation → Overdue Deactivation: active employees whose
// latest last day of work has passed — who Deactivate Resigned Employees
// (the nightly job) would deactivate. Deactivating sets them inactive with
// Date Resigned = last day of work and deactivates their referral code.
export default function OverdueDeactivation() {
  return (
    <OverdueRunList
      fetchRows={syncApi.overdueDeactivation}
      runFor={syncApi.deactivateSelected}
      columns={columns}
      action={{ label: "Deactivate", icon: <StopOutlined />, buttonProps: { color: "orange", variant: "outlined" } }}
      about="Still active although their last day of work has passed. The nightly job deactivates them; run it here when it didn't."
    />
  );
}
