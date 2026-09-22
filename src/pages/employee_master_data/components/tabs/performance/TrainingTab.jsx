import { Form, Input, InputNumber } from "antd";
import PerformanceRecordTab from "./PerformanceRecordTab";
import trainingApi from "../../../../../services/employee/trainingApi";

const columns = [
  { title: "Mentor", dataIndex: "mentor", key: "mentor" },
  { title: "Grade (%)", dataIndex: "grade", key: "grade", render: (v) => v ?? "-" },
  { title: "KPI (%)", dataIndex: "kpi", key: "kpi", render: (v) => v ?? "-" },
  { title: "Remarks", dataIndex: "remarks", key: "remarks", render: (v) => v || "-" },
];

export default function TrainingTab({ employeeId, mode, initialRecords }) {
  return (
    <PerformanceRecordTab
      title="Training"
      mode={mode}
      initialRecords={initialRecords}
      permissionPrefix="employee-master-data-training"
      columns={columns}
      getInitialFormValues={(record) => ({
        mentor: record?.mentor ?? "",
        grade: record?.grade ?? null,
        kpi: record?.kpi ?? null,
        remarks: record?.remarks ?? "",
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
          {/* `remarks` is not validated server-side (confirmed from the
              controller — no rule for it at all), kept optional here too. */}
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} />
          </Form.Item>
        </>
      )}
      onCreate={async (values) => {
        const { data } = await trainingApi.create({ employee_id: employeeId, ...values });
        return data.success ? { success: true, records: data.trainings } : { success: false, errors: data };
      }}
      onUpdate={async (record, values) => {
        const { data } = await trainingApi.update(record.id, values);
        return data.success ? { success: true, records: data.trainings } : { success: false, errors: data };
      }}
      onDelete={async (record) => {
        const { data } = await trainingApi.remove(record.id, employeeId);
        return data.trainings;
      }}
    />
  );
}
