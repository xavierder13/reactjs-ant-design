import { Form, Select, DatePicker, Switch, Descriptions } from "antd";

import { DISPLAY_DATE_FORMAT, formatDate } from "../../../../../utils/formatDate";
// Grouped company reason list. Records saved under the older flat list keep
// their stored text; the Select still shows it when editing.
const RESIGNATION_REASON_GROUPS = [
  {
    label: "Voluntary Reasons",
    reasons: [
      "Backed out of Training/Orientation", "EOC/Not Regularized", "Work Abroad",
      "Conflict w/ Co-Employees", "Family Reasons/Problems", "Health Condition",
      "Low Salary & Benefits", "Work Pressure", "Problem with Coor/Agency",
      "Career Growth/Advancement", "Organizational/Management Issues",
    ],
  },
  {
    label: "Involuntary Reasons",
    reasons: ["AWOL", "Dismissal/Suspension", "Death"],
  },
];
const RESIGNATION_REASON_OPTIONS = RESIGNATION_REASON_GROUPS.map((g) => ({
  label: g.label,
  title: g.label,
  options: g.reasons.map((r) => ({ label: r, value: r })),
}));
const COMPLIANCE_OPTIONS = ["Render 30 Days", "Render 60 days", "Non-Compliant"];

// The offboarding record's form fields (everything but the file slots) —
// shared by the employee record's Offboarding tab and the Resigned list's
// edit modal. Render inside the caller's <Form>.
export default function OffboardingFormFields() {
  return (
    <>
      <Form.Item name="last_day_of_work" label="Last Day of Work" rules={[{ required: true, message: "Please select a date." }]}>
        <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
      </Form.Item>
      <Form.Item name="reason_of_resignation" label="Reason of Resignation">
        <Select showSearch={{ optionFilterProp: "label" }} options={RESIGNATION_REASON_OPTIONS} />
      </Form.Item>
      <Form.Item name="resignation_date_filed" label="Resignation Date Filed">
        <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
      </Form.Item>
      <Form.Item name="resignation_date_received" label="Resignation File Received">
        <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
      </Form.Item>
      <Form.Item name="resignation_effectivity_date" label="Resignation Effectivity Date">
        <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
      </Form.Item>
      <Form.Item name="exit_interview_date" label="Exit Interview Date" extra="Leave blank if no exit interview was held — Exit Interview Analysis counts interviews by this date.">
        <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
      </Form.Item>
      <Form.Item name="compliance" label="Compliance">
        <Select options={COMPLIANCE_OPTIONS.map((c) => ({ label: c, value: c }))} />
      </Form.Item>
      <Form.Item name="coe_is_issued" label="COE Issued" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="last_pay_is_issued" label="Last Pay Issued" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );
}

const yesNo = (value) => (Number(value) ? "Yes" : "No");

// The same fields read-only, as text (the record's View).
export function OffboardingDetails({ record }) {
  const r = record || {};
  return (
    <Descriptions
      size="small"
      bordered
      column={{ xs: 1, sm: 2 }}
      style={{ marginBottom: 16 }}
      items={[
        { key: "last_day", label: "Last Day of Work", children: formatDate(r.last_day_of_work) },
        { key: "reason", label: "Reason of Resignation", children: r.reason_of_resignation || "-" },
        { key: "filed", label: "Resignation Date Filed", children: formatDate(r.resignation_date_filed) },
        { key: "received", label: "Resignation File Received", children: formatDate(r.resignation_date_received) },
        { key: "effectivity", label: "Resignation Effectivity Date", children: formatDate(r.resignation_effectivity_date) },
        { key: "exit", label: "Exit Interview Date", children: formatDate(r.exit_interview_date) },
        { key: "compliance", label: "Compliance", children: r.compliance || "-" },
        { key: "coe", label: "COE Issued", children: yesNo(r.coe_is_issued) },
        { key: "last_pay", label: "Last Pay Issued", children: yesNo(r.last_pay_is_issued) },
      ]}
    />
  );
}
