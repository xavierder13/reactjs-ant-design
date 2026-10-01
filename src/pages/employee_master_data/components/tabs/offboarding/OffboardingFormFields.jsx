import { Form, Select, DatePicker, Switch } from "antd";

import { DISPLAY_DATE_FORMAT } from "../../../../../utils/formatDate";
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
