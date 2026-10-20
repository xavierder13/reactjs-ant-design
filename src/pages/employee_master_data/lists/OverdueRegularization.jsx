import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Segmented, Tag } from "antd";
import { SendOutlined } from "@ant-design/icons";

import syncApi from "../../../services/employee/syncApi";
import { formatDate } from "../../../utils/formatDate";
import OverdueRunList from "./OverdueRunList";

const columns = [
  { title: "Direct Hire Since", dataIndex: "direct_hire_since", key: "direct_hire_since", render: (v) => formatDate(v) },
  { title: "Days", dataIndex: "days_since", key: "days_since", sorter: (a, b) => a.days_since - b.days_since },
  {
    title: "Regularization Date",
    dataIndex: "regularization_date",
    key: "regularization_date",
    render: (v, r) => <>{formatDate(v)} {r.past_due && <Tag color="red">Past due</Tag>}</>,
  },
  { title: "Final Interview", dataIndex: "regularization_interview_date", key: "regularization_interview_date", render: (v) => formatDate(v) },
  { title: "Result", dataIndex: "regularization_interview_status", key: "regularization_interview_status", render: (v) => <Tag color="green">{v}</Tag> },
];

const VIEWS = [
  { value: "all", label: "All due" },
  { value: "past_due", label: "Past due (180+ days)" },
];

// Employee → Hiring & Onboarding → Overdue Regularization: Probationary
// employees due (150+ days since Direct Hire Since) whose final interview
// Passed — who Regularize Passed Employees (the nightly job) would
// regularize. Regularizing sets Regular, dated Direct Hire Since + 180.
// `?past_due=1` (the bell's "To be regularized") opens the past-due view.
export default function OverdueRegularization() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("past_due") ? "past_due" : "all";
  const filterRows = useCallback((rows) => (view === "past_due" ? rows.filter((r) => r.past_due) : rows), [view]);

  return (
    <OverdueRunList
      fetchRows={syncApi.overdueRegularization}
      runFor={syncApi.regularizeSelected}
      columns={columns}
      filterRows={filterRows}
      toolbarExtra={(
        <Segmented
          options={VIEWS}
          value={view}
          onChange={(v) => setSearchParams(v === "past_due" ? { past_due: "1" } : {}, { replace: true })}
        />
      )}
      action={{ label: "Regularize", icon: <SendOutlined />, buttonProps: { color: "cyan", variant: "outlined" } }}
      about="Passed the final regularization interview and due, but still Probationary. The nightly job regularizes them; run it here when it didn't."
    />
  );
}
