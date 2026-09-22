import { Form, Input, InputNumber } from "antd";
import PerformanceRecordTab from "./PerformanceRecordTab";
import ojtPerformanceRatingApi from "../../../../../services/employee/ojtPerformanceRatingApi";

const columns = [
  { title: "Mentor", dataIndex: "mentor", key: "mentor" },
  { title: "Grade (%)", dataIndex: "grade", key: "grade", render: (v) => v ?? "-" },
  { title: "KPI (%)", dataIndex: "kpi", key: "kpi", render: (v) => v ?? "-" },
];

export default function OjtPerformanceRatingTab({ employeeId, mode, initialRecords }) {
  return (
    <PerformanceRecordTab
      title="OJT Performance Rating"
      mode={mode}
      initialRecords={initialRecords}
      permissionPrefix="employee-master-data-ojt-performance-rating"
      columns={columns}
      getInitialFormValues={(record) => ({
        mentor: record?.mentor ?? "",
        grade: record?.grade ?? null,
        kpi: record?.kpi ?? null,
      })}
      renderFields={() => (
        <>
          <Form.Item
            name="mentor"
            label="Mentor"
            rules={[{ required: true, message: "Please enter a mentor." }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="grade"
            label="Grade (%)"
            rules={[{ type: "number", min: 0, max: 999999.99, message: "Enter a valid grade." }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} max={999999.99} step={0.01} />
          </Form.Item>
          <Form.Item
            name="kpi"
            label="KPI (%)"
            rules={[{ type: "number", min: 0, max: 999999.99, message: "Enter a valid KPI." }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} max={999999.99} step={0.01} />
          </Form.Item>
        </>
      )}
      onCreate={async (values) => {
        const { data } = await ojtPerformanceRatingApi.create({ employee_id: employeeId, ...values });
        return data.success ? { success: true, records: data.performances } : { success: false, errors: data };
      }}
      onUpdate={async (record, values) => {
        const { data } = await ojtPerformanceRatingApi.update(record.id, values);
        return data.success ? { success: true, records: data.performances } : { success: false, errors: data };
      }}
      onDelete={async (record) => {
        const { data } = await ojtPerformanceRatingApi.remove(record.id, employeeId);
        return data.performances;
      }}
    />
  );
}
