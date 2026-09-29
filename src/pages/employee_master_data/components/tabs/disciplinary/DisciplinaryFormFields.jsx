import { Form, Input, Select, DatePicker } from "antd";

// Matches DisciplinaryAction.vue's own hardcoded reference lists exactly
// (real company policy categories, not invented) — see vueportal for the
// source. Used as a closed Select rather than Vue's free-text-capable
// autocomplete, deliberately: these are fixed policy categories, not
// free-form text, so a closed list avoids ad-hoc typo'd categories.
const OFFENSES = [
  "TIMEKEEPING OFFENSE",
  "OFFENSES RELATED TO JOB PERFORMANCE",
  "OFFENSES RELATED TO CONDUCT & BEHAVIOUR",
  "OFFENSE AGAINST PROPERTY",
  "OFFENSES RELATED TO SECURITY",
  "OFFENSE AGAINST HEALTH & SAFETY",
  "OFFENSES AGAINST ATTENDANCE",
  "OFFENSES RELATED TO VEHICLE MAINTENANCE",
];
const DISCIPLINARY_ACTIONS = [
  "Verbal Warning",
  "Written Warning",
  "Last & Final Warning",
  "Suspension",
  "Preventive Suspension",
  "Dismissal/Termination",
];
const OFFENSE_SERIES = ["First Offense", "Second Offense", "Third Offense", "Fourth Offense", "Fifth Offense"];

// A disciplinary action's form fields (everything but the memo file) —
// shared by the employee record's Disciplinary tab and the open-cases
// Disciplinary list's edit modal. Render inside the caller's <Form>.
export default function DisciplinaryFormFields() {
  return (
    <>
      <Form.Item name="date_issued" label="Date Issued" rules={[{ required: true, message: "Please select a date." }]}>
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item name="nte_code" label="NTE Code" rules={[{ required: true, message: "Please enter the NTE code." }]}>
        <Input />
      </Form.Item>
      <Form.Item name="offense_code" label="Offense Code" rules={[{ required: true, message: "Please enter the offense code." }]}>
        <Input />
      </Form.Item>
      <Form.Item name="offense" label="Offense" rules={[{ required: true, message: "Please select an offense." }]}>
        <Select showSearch options={OFFENSES.map((o) => ({ label: o, value: o }))} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} />
      </Form.Item>
      <Form.Item name="offense_type" label="Offense Type" rules={[{ required: true, message: "Please enter the offense type." }]}>
        <Input />
      </Form.Item>
      <Form.Item name="disciplinary_action" label="Disciplinary Action" rules={[{ required: true, message: "Please select a disciplinary action." }]}>
        <Select showSearch options={DISCIPLINARY_ACTIONS.map((o) => ({ label: o, value: o }))} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} />
      </Form.Item>
      <Form.Item name="series" label="Series of Disciplinary" rules={[{ required: true, message: "Please select a series." }]}>
        <Select options={OFFENSE_SERIES.map((o) => ({ label: o, value: o }))} />
      </Form.Item>
      <Form.Item name="status" label="Status" rules={[{ required: true, message: "Please select a status." }]}>
        <Select options={[{ label: "Open", value: "Open" }, { label: "Closed", value: "Closed" }]} />
      </Form.Item>
      <Form.Item name="transmit_date" label="Transmit Date">
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item name="return_date" label="Return Date">
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
      </Form.Item>
    </>
  );
}
