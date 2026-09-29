import { Form, Input, Select, DatePicker } from "antd";

// An issued NTE's form fields (everything but the two file slots) — shared
// by the employee record's Disciplinary > NTE tab and the open-cases NTE
// list's edit modal. Render inside the caller's <Form>.
export default function NteFormFields() {
  return (
    <>
      <Form.Item name="date_issued" label="Date Issued" rules={[{ required: true, message: "Please select a date." }]}>
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item name="issued_by" label="Issued By" rules={[{ required: true, message: "Please enter who issued this." }]}>
        <Input />
      </Form.Item>
      <Form.Item name="nte_code" label="NTE Code" rules={[{ required: true, message: "Please enter the NTE code." }]}>
        <Input />
      </Form.Item>
      <Form.Item name="status" label="Status">
        <Select options={[{ label: "Open", value: "Open" }, { label: "Closed", value: "Closed" }]} />
      </Form.Item>
      <Form.Item name="violation" label="Violation" rules={[{ required: true, message: "Please describe the violation." }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="explanation_date" label="Explanation Date">
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item name="remarks" label="Remarks">
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );
}
