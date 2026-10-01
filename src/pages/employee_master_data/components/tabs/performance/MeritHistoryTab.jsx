import { Form, DatePicker, InputNumber } from "antd";
import dayjs from "dayjs";
import PerformanceRecordTab from "./PerformanceRecordTab";
import meritHistoryApi from "../../../../../services/employee/meritHistoryApi";
import { formatDate, DISPLAY_DATE_FORMAT } from "../../../../../utils/formatDate";

const columns = [
  { title: "Merit Date", dataIndex: "merit_date", key: "merit_date", render: (v) => formatDate(v) },
  { title: "Salary", dataIndex: "salary", key: "salary", render: (v) => v ?? "-" },
];

export default function MeritHistoryTab({ employeeId, mode, initialRecords, pendingRecords, onPendingRecordsChange }) {
  return (
    <PerformanceRecordTab
      title="Merit History"
      mode={mode}
      initialRecords={initialRecords}
      pendingRecords={pendingRecords}
      onPendingRecordsChange={onPendingRecordsChange}
      formatPendingValues={(values) => ({ ...values, merit_date: values.merit_date.format("YYYY-MM-DD") })}
      permissionPrefix="employee-master-data-merit-history"
      columns={columns}
      getInitialFormValues={(record) => ({
        merit_date: record?.merit_date ? dayjs(record.merit_date) : null,
        salary: record?.salary ?? null,
      })}
      renderFields={() => (
        <>
          <Form.Item
            name="merit_date"
            label="Merit Date"
            rules={[{ required: true, message: "Please select a date." }]}
          >
            <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
          <Form.Item
            name="salary"
            label="Salary"
            rules={[{ type: "number", min: 0, max: 999999.99, message: "Enter a valid salary." }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} max={999999.99} step={0.01} />
          </Form.Item>
        </>
      )}
      onCreate={async (values) => {
        const payload = { employee_id: employeeId, merit_date: values.merit_date.format("YYYY-MM-DD"), salary: values.salary };
        const { data } = await meritHistoryApi.create(payload);
        return data.success ? { success: true, records: data.merit_histories } : { success: false, errors: data };
      }}
      onUpdate={async (record, values) => {
        const payload = { employee_id: employeeId, merit_date: values.merit_date.format("YYYY-MM-DD"), salary: values.salary };
        const { data } = await meritHistoryApi.update(record.id, payload);
        return data.success ? { success: true, records: data.merit_histories } : { success: false, errors: data };
      }}
      onDelete={async (record) => {
        const { data } = await meritHistoryApi.remove(record.id, employeeId);
        return data.merit_histories;
      }}
    />
  );
}
