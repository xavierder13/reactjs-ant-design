import { Form, DatePicker, Select, Input, Tag } from "antd";

import PerformanceRecordTab from "./PerformanceRecordTab";
import EmployeeSelect from "../../../../manpower_request/request/EmployeeSelect";
import regularizationInterviewApi from "../../../../../services/employee/regularizationInterviewApi";
import { DISPLAY_DATE_FORMAT, formatDate, toDayjs } from "../../../../../utils/formatDate";

const RESULT_COLORS = { Passed: "green", Failed: "red" };

const interviewerName = (i) => (i ? `${i.last_name}, ${i.first_name} (${i.employee_code})` : null);

// The backend answers validation failures with HTTP 422 + a field bag;
// PerformanceRecordTab maps `{ success: false, errors }` onto the form.
// A saved write also reports the employee's resulting regularization
// fields (onResult).
const saveResult = async (request, onResult) => {
  try {
    const { data } = await request;
    onResult?.(data.employee);
    return { success: true, records: data.regularization_interviews };
  } catch (error) {
    if (error.response?.status === 422 && !error.response.data?.message) {
      return { success: false, errors: error.response.data };
    }
    throw error;
  }
};

const toPayload = (values) => ({
  interviewer_employee_id: values.interviewer_employee_id,
  interview_date: values.interview_date?.format("YYYY-MM-DD"),
  result: values.result,
  remarks: values.remarks || null,
});

// Regularization interviews, one per interviewer (usually 3): who
// interviewed, when, Passed / Failed and remarks, oldest first. The final
// one (latest date, then the last added) decides the employee's result
// (backend RegularizationService::syncInterviewResult). Needs a saved
// employee.
export default function RegularizationInterviews({ employeeId, mode, initialRecords, onResult }) {
  const columns = [
    { title: "Interview Date", dataIndex: "interview_date", key: "interview_date", render: (v) => formatDate(v) },
    { title: "Interviewer", key: "interviewer", render: (_, r) => interviewerName(r.interviewer) || "-" },
    {
      title: "Result",
      dataIndex: "result",
      key: "result",
      render: (v) => <Tag color={RESULT_COLORS[v]}>{v}</Tag>,
    },
    { title: "Remarks", dataIndex: "remarks", key: "remarks", render: (v) => v || "-" },
  ];

  return (
    <PerformanceRecordTab
      title="Interview"
      mode={mode}
      initialRecords={initialRecords}
      permissionPrefix="employee-master-data-evaluation-regularization"
      columns={columns}
      getInitialFormValues={(record) => ({
        interviewer_employee_id: record?.interviewer_employee_id ?? null,
        // labels the saved interviewer before the picker's first page loads
        interviewer_label: interviewerName(record?.interviewer),
        interview_date: toDayjs(record?.interview_date),
        result: record?.result ?? null,
        remarks: record?.remarks ?? null,
      })}
      renderFields={() => (
        <>
          <Form.Item name="interviewer_label" hidden><Input /></Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.interviewer_label !== next.interviewer_label}>
            {({ getFieldValue }) => (
              <Form.Item
                name="interviewer_employee_id"
                label="Interviewer"
                rules={[{ required: true, message: "Please select the interviewer." }]}
              >
                <EmployeeSelect
                  activeOnly
                  placeholder="Search the employee who interviewed"
                  initialOption={getFieldValue("interviewer_employee_id") && getFieldValue("interviewer_label")
                    ? { value: getFieldValue("interviewer_employee_id"), label: getFieldValue("interviewer_label") }
                    : undefined}
                />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="interview_date" label="Interview Date" rules={[{ required: true, message: "Please select a date." }]}>
            <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
          <Form.Item name="result" label="Result" rules={[{ required: true, message: "Please select the result." }]}>
            <Select
              placeholder="Passed or Failed"
              options={[
                { label: "Passed", value: "Passed" },
                { label: "Failed", value: "Failed" },
              ]}
            />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={3} maxLength={2000} showCount />
          </Form.Item>
        </>
      )}
      onCreate={(values) => saveResult(regularizationInterviewApi.create({ employee_id: employeeId, ...toPayload(values) }), onResult)}
      onUpdate={(record, values) => saveResult(regularizationInterviewApi.update(record.id, toPayload(values)), onResult)}
      onDelete={async (record) => {
        const { data } = await regularizationInterviewApi.remove(record.id);
        onResult?.(data.employee);
        return data.regularization_interviews;
      }}
    />
  );
}
