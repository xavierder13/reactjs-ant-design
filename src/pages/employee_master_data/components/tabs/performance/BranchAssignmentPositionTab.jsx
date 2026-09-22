import { Form, Select, DatePicker, Input, Alert } from "antd";
import dayjs from "dayjs";
import PerformanceRecordTab from "./PerformanceRecordTab";
import branchAssignmentPositionApi from "../../../../../services/employee/branchAssignmentPositionApi";
import useBranches from "../../../../../hooks/useBranches";
import usePositions from "../../../../../hooks/usePositions";

const columns = [
  { title: "Date Assigned", dataIndex: "date_assigned", key: "date_assigned" },
  { title: "Branch", dataIndex: "branch", key: "branch" },
  { title: "Position", dataIndex: "position", key: "position" },
  { title: "Remarks", dataIndex: "remarks", key: "remarks" },
];

export default function BranchAssignmentPositionTab({ employeeId, mode, initialRecords }) {
  const { branchOptions } = useBranches();
  const { positionOptions } = usePositions();
  // The backend matches branch/position by NAME, not id (confirmed from
  // EmployeeBranchAssignmentPositionController — it looks rows up via
  // Branch::where('name', ...)/Position::where('name', ...)) — reuse the
  // shared branch/position option lists but key the Select on the label,
  // not the usual id value.
  const branchNameOptions = branchOptions.map((b) => ({ label: b.label, value: b.label }));
  const positionNameOptions = positionOptions.map((p) => ({ label: p.label, value: p.label }));

  return (
    <div>
      <Alert
        style={{ marginBottom: 12 }}
        type="warning"
        showIcon
        title="Adding, editing, or deleting an assignment here updates the employee's current Branch/Position on the Employee Details tab to match whichever assignment now has the latest date — reopen this record to see that reflected there."
      />
      <PerformanceRecordTab
        title="Branch Assignment / Position"
        mode={mode}
        initialRecords={initialRecords}
        permissionPrefix="employee-master-data-branch-assignment-position"
        columns={columns}
        getInitialFormValues={(record) => ({
          date_assigned: record?.date_assigned ? dayjs(record.date_assigned) : null,
          branch: record?.branch ?? null,
          position: record?.position ?? null,
          remarks: record?.remarks ?? "",
        })}
        renderFields={() => (
          <>
            <Form.Item
              name="date_assigned"
              label="Date Assigned"
              rules={[{ required: true, message: "Please select a date." }]}
            >
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item
              name="branch"
              label="Branch"
              rules={[{ required: true, message: "Please select a branch." }]}
            >
              <Select
                placeholder="Select branch"
                options={branchNameOptions}
                showSearch
                filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
            <Form.Item
              name="position"
              label="Position"
              rules={[{ required: true, message: "Please select a position." }]}
            >
              <Select
                placeholder="Select position"
                options={positionNameOptions}
                showSearch
                filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
            <Form.Item
              name="remarks"
              label="Remarks"
              rules={[{ required: true, message: "Please enter remarks." }]}
            >
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        )}
        onCreate={async (values) => {
          const payload = { employee_id: employeeId, ...values, date_assigned: values.date_assigned.format("YYYY-MM-DD") };
          const { data } = await branchAssignmentPositionApi.create(payload);
          return data.success ? { success: true, records: data.branch_assignment_positions } : { success: false, errors: data };
        }}
        onUpdate={async (record, values) => {
          const payload = { employee_id: employeeId, ...values, date_assigned: values.date_assigned.format("YYYY-MM-DD") };
          const { data } = await branchAssignmentPositionApi.update(record.id, payload);
          return data.success ? { success: true, records: data.branch_assignment_positions } : { success: false, errors: data };
        }}
        onDelete={async (record) => {
          const { data } = await branchAssignmentPositionApi.remove(record.id);
          return data.branch_assignment_positions;
        }}
      />
    </div>
  );
}
