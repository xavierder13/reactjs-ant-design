import { Form, Input, InputNumber } from "antd";
import PerformanceRecordTab from "./PerformanceRecordTab";
import classroomPerformanceRatingApi from "../../../../../services/employee/classroomPerformanceRatingApi";

const columns = [
  { title: "Department", dataIndex: "department", key: "department" },
  { title: "Grade (%)", dataIndex: "grade", key: "grade", render: (v) => v ?? "-" },
];

export default function ClassroomPerformanceRatingTab({ employeeId, mode, initialRecords }) {
  return (
    <PerformanceRecordTab
      title="Classroom Performance Rating"
      mode={mode}
      initialRecords={initialRecords}
      permissionPrefix="employee-master-data-classroom-performance-rating"
      columns={columns}
      getInitialFormValues={(record) => ({
        department: record?.department ?? "",
        grade: record?.grade ?? null,
      })}
      renderFields={() => (
        <>
          <Form.Item
            name="department"
            label="Department"
            rules={[{ required: true, message: "Please enter a department." }]}
          >
            <Input placeholder="e.g. Sales" />
          </Form.Item>
          <Form.Item
            name="grade"
            label="Grade (%)"
            rules={[{ type: "number", min: 0, max: 999999.99, message: "Enter a valid grade." }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} max={999999.99} step={0.01} />
          </Form.Item>
        </>
      )}
      onCreate={async (values) => {
        const { data } = await classroomPerformanceRatingApi.create({ employee_id: employeeId, ...values });
        return data.success ? { success: true, records: data.performances } : { success: false, errors: data };
      }}
      onUpdate={async (record, values) => {
        const { data } = await classroomPerformanceRatingApi.update(record.id, values);
        return data.success ? { success: true, records: data.performances } : { success: false, errors: data };
      }}
      onDelete={async (record) => {
        const { data } = await classroomPerformanceRatingApi.remove(record.id, employeeId);
        return data.performances;
      }}
    />
  );
}
