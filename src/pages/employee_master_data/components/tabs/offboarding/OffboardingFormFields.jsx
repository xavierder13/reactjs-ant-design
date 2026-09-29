import { Form, Select, DatePicker, Switch } from "antd";

// Matches Offboarding.vue's own hardcoded reference lists exactly (real
// company values, not invented) — see vueportal for the source.
const RESIGNATION_REASONS = [
  "To Work Abroad", "End of Contract", "AWOL", "To Work in other Company",
  "Family Reasons/Problems", "To Work in Government", "Due to Suspension",
  "Personal Matter/Reason", "Pressure at Work", "To Study",
  "Change of Family Residence", "Conflict w/ Co-Employees", "Dismissal",
  "Due to pregnancy", "Far Work Place", "Health Condition",
  "To Put Up Business", "Death", "Failed in Training Program", "Low Salary",
  "Prioritize physical & mental health", "Problem with Coor/Agency",
  "Re-training", "Others (Specify)",
];
const COMPLIANCE_OPTIONS = ["Render 30 Days", "Render 60 days", "Non-Compliant"];

// The offboarding record's form fields (everything but the file slots) —
// shared by the employee record's Offboarding tab and the Resigned list's
// edit modal. Render inside the caller's <Form>.
export default function OffboardingFormFields() {
  return (
    <>
      <Form.Item name="last_day_of_work" label="Last Day of Work" rules={[{ required: true, message: "Please select a date." }]}>
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item name="reason_of_resignation" label="Reason of Resignation">
        <Select showSearch options={RESIGNATION_REASONS.map((r) => ({ label: r, value: r }))} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} />
      </Form.Item>
      <Form.Item name="resignation_date_filed" label="Resignation Date Filed">
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item name="resignation_date_received" label="Resignation File Received">
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item name="resignation_effectivity_date" label="Resignation Effectivity Date">
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
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
