import { useEffect, useState } from "react";
import { Form, Select, DatePicker, Input, Alert, AutoComplete, Tag, App } from "antd";
import dayjs from "dayjs";
import PerformanceRecordTab from "./PerformanceRecordTab";
import branchAssignmentPositionApi from "../../../../../services/employee/branchAssignmentPositionApi";
import useEmployeeFormOptions from "../../../../../hooks/useEmployeeFormOptions";
import { formatDate, DISPLAY_DATE_FORMAT } from "../../../../../utils/formatDate";

// Must match EmployeeBranchAssignmentPosition::EMPLOYMENT_SOURCES (a string,
// so more sources can be added). Only 'agency' counts as agency-hired.
const EMPLOYMENT_SOURCE_OPTIONS = [
  { label: "Direct", value: "direct" },
  { label: "Agency", value: "agency" },
];
const SOURCE_LABELS = Object.fromEntries(EMPLOYMENT_SOURCE_OPTIONS.map((o) => [o.value, o.label]));

const columns = [
  { title: "Date Assigned", dataIndex: "date_assigned", key: "date_assigned", render: (v) => formatDate(v) },
  { title: "Branch", dataIndex: "branch", key: "branch" },
  { title: "Position", dataIndex: "position", key: "position" },
  {
    title: "Employment Source",
    dataIndex: "employment_source",
    key: "employment_source",
    render: (source, record) => (source === "agency"
      ? <Tag color="orange">Agency{record.agency_name ? ` · ${record.agency_name}` : ""}</Tag>
      : <Tag color="green">{SOURCE_LABELS[source] || source || "Direct"}</Tag>),
  },
  { title: "Remarks", dataIndex: "remarks", key: "remarks" },
];

// The employment source and its optional agency name, as the backend
// stores them — only an agency row carries an agency name.
const agencyValues = (values) => ({
  employment_source: values.employment_source || "direct",
  agency_name: values.employment_source === "agency" ? values.agency_name?.trim() || null : null,
});

export default function BranchAssignmentPositionTab({ employeeId, mode, initialRecords, pendingRecords, onPendingRecordsChange, onEmployeeChange }) {
  const { message: messageApi } = App.useApp();
  // Same options as the Employee Details tab (/employee_master_data/create).
  // only the add / edit form needs the lists (view mode has no form)
  const { branchOptions, positionOptions } = useEmployeeFormOptions({ enabled: mode !== "view" });
  // The backend matches branch/position by NAME, not id (confirmed from
  // EmployeeBranchAssignmentPositionController — it looks rows up via
  // Branch::where('name', ...)/Position::where('name', ...)) — reuse the
  // shared branch/position option lists but key the Select on the label,
  // not the usual id value.
  const branchNameOptions = branchOptions.map((b) => ({ label: b.label, value: b.label }));
  const positionNameOptions = positionOptions.map((p) => ({ label: p.label, value: p.label }));

  // Agency names already entered, suggested so spellings stay consistent;
  // a new name can still be typed. Suggestions only — failures are ignored.
  const [agencyNames, setAgencyNames] = useState([]);
  useEffect(() => {
    if (mode === "view") return;
    const load = async () => {
      try {
        const { data } = await branchAssignmentPositionApi.agencyNames();
        setAgencyNames(data.agency_names || []);
      } catch {
        // no suggestions
      }
    };
    load();
  }, [mode]);

  // A row's agency tag can change the Employment Type server-side
  // (EmployeeBranchAssignmentPosition::syncEmploymentType) — say so and keep
  // the Employee Details field in step, so a later Save doesn't revert it.
  const handleEmploymentType = (employmentType) => {
    if (!employmentType) return;
    messageApi.info(`Employment Type updated to ${employmentType}.`);
    onEmployeeChange?.({ employment_type: employmentType });
  };

  return (
    <div>
      <Alert
        style={{ marginBottom: 12 }}
        type="warning"
        showIcon
        title="Adding, editing, or deleting an assignment here updates the employee's current Branch/Position on the Employee Details tab to match whichever assignment now has the latest date — reopen this record to see that reflected there. Setting the latest assignment's Employment Source to Agency sets Employment Type to Agency; a Direct assignment right after an agency one (absorbed) sets it to Probationary."
      />
      <PerformanceRecordTab
        title="Branch Assignment / Position"
        mode={mode}
        initialRecords={initialRecords}
        pendingRecords={pendingRecords}
        onPendingRecordsChange={onPendingRecordsChange}
        formatPendingValues={(values) => ({ ...values, ...agencyValues(values), date_assigned: values.date_assigned.format("YYYY-MM-DD") })}
        permissionPrefix="employee-master-data-branch-assignment-position"
        columns={columns}
        getInitialFormValues={(record) => ({
          date_assigned: record?.date_assigned ? dayjs(record.date_assigned) : null,
          branch: record?.branch ?? null,
          position: record?.position ?? null,
          employment_source: record?.employment_source || "direct",
          agency_name: record?.agency_name ?? null,
          remarks: record?.remarks ?? "",
        })}
        renderFields={() => (
          <>
            <Form.Item
              name="date_assigned"
              label="Date Assigned"
              rules={[{ required: true, message: "Please select a date." }]}
            >
              <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
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
              name="employment_source"
              label="Employment Source"
              rules={[{ required: true, message: "Please select the employment source." }]}
              extra="When an agency employee is absorbed, add a new assignment with Direct."
            >
              <Select options={EMPLOYMENT_SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.employment_source !== curr.employment_source}>
              {({ getFieldValue }) => getFieldValue("employment_source") === "agency" && (
                <Form.Item name="agency_name" label="Agency (optional)">
                  <AutoComplete
                    allowClear
                    placeholder="Agency name"
                    options={agencyNames.map((name) => ({ value: name }))}
                    filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              )}
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
          const payload = { employee_id: employeeId, ...values, ...agencyValues(values), date_assigned: values.date_assigned.format("YYYY-MM-DD") };
          const { data } = await branchAssignmentPositionApi.create(payload);
          if (!data.success) return { success: false, errors: data };
          handleEmploymentType(data.employment_type);
          return { success: true, records: data.branch_assignment_positions };
        }}
        onUpdate={async (record, values) => {
          const payload = { employee_id: employeeId, ...values, ...agencyValues(values), date_assigned: values.date_assigned.format("YYYY-MM-DD") };
          const { data } = await branchAssignmentPositionApi.update(record.id, payload);
          if (!data.success) return { success: false, errors: data };
          handleEmploymentType(data.employment_type);
          return { success: true, records: data.branch_assignment_positions };
        }}
        onDelete={async (record) => {
          const { data } = await branchAssignmentPositionApi.remove(record.id);
          handleEmploymentType(data.employment_type);
          return data.branch_assignment_positions;
        }}
      />
    </div>
  );
}
