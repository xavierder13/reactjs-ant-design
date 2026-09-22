import { useState } from "react";
import { Modal, Form, Select, DatePicker, Button, App } from "antd";

import employeeApi from "../../../services/employee/employeeApi";
import useBranches from "../../../hooks/useBranches";
import useAuth from "../../../hooks/useAuth";
import handleApiError from "../../../utils/handleApiError";
import downloadBlobResponse from "../../../utils/downloadBlobResponse";

// Scoped to the 'Employee List' report only — vueportal's /export endpoint
// is actually a multi-report dispatcher (Attendance Report, Branch Manpower
// Report, KPI Monitoring are the other report_type values), but those
// belong to modules not built in this app yet. See employeeApi.js and the
// employee-master-data skill for the full scoping rationale.
//
// Only roles matching vueportal's ExportDialog.vue `branchParamIsVisible`
// can pick a branch — everyone else is scoped to their own
// branch/department/division automatically, server-side, so the field is
// hidden rather than shown-and-ignored for them.
const BRANCH_PICKER_ROLES = [
  "Administrator",
  "Employee Master Data Administrator",
  "Recruitment & Hiring",
  "Payroll Admin",
  "Employees Relation",
  "Performance Management",
];

const DATE_FIELD_OPTIONS = [
  { label: "Date Employed", value: "date_employed" },
  { label: "Date Assigned / Deployed", value: "date_assigned" },
  { label: "Date Resigned", value: "date_resigned" },
];

export default function ExportEmployeesModal({ open, onClose }) {
  const { message: messageApi } = App.useApp();
  const { hasAnyRole } = useAuth();
  const { branchOptions } = useBranches();
  const [form] = Form.useForm();
  const [exporting, setExporting] = useState(false);

  const canPickBranch = hasAnyRole(...BRANCH_PICKER_ROLES);
  // Document Status only affects the query when filtering by a date field
  // other than Date Resigned (matches EmployeeMasterDataExport::collection()'s
  // own condition server-side) — hidden rather than shown-and-ignored.
  const dateFieldParam = Form.useWatch("date_field_param", form);
  const showDocumentStatus = dateFieldParam !== "date_resigned";

  const handleClose = () => {
    if (exporting) return;
    form.resetFields();
    onClose();
  };

  const handleExport = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    const dateFrom = values.date_range[0].format("YYYY-MM-DD");
    const dateTo = values.date_range[1].format("YYYY-MM-DD");
    const documentStatus = showDocumentStatus ? (values.document_status || "All") : "All";
    const branchId = canPickBranch ? values.branch_id : undefined;

    const payload = {
      report_type: "Employee List",
      date_field_param: values.date_field_param,
      date_from: dateFrom,
      date_to: dateTo,
      asOfDate: dateTo,
      document_status: documentStatus,
      // branch_id omitted entirely for roles that can't pick one — the
      // backend scopes them to their own branch/department/division
      // regardless of what's sent, so there's nothing meaningful to send.
      ...(branchId !== undefined && { branch_id: branchId }),
    };

    setExporting(true);
    try {
      const response = await employeeApi.export(payload);
      const branchLabel = canPickBranch
        ? (branchOptions.find((b) => b.value === branchId)?.label || "ALL")
        : "My Branch";
      const statusSuffix = documentStatus === "Active Only" ? " (Active Employees)" : "";
      const filename = `Employee List - ${branchLabel}${statusSuffix} (${dateFrom} to ${dateTo}).xls`;

      const downloaded = await downloadBlobResponse(response, filename, messageApi);
      if (downloaded) {
        messageApi.success("Export downloaded.");
        form.resetFields();
        onClose();
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Export Employee List"
      onCancel={handleClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={exporting}>Cancel</Button>,
        <Button key="export" type="primary" loading={exporting} onClick={handleExport}>
          Export
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ document_status: "All" }}
      >
        {canPickBranch && (
          <Form.Item
            name="branch_id"
            label="Branch"
            rules={[{ required: true, message: "Please select a branch." }]}
          >
            <Select
              placeholder="Select branch"
              options={[{ label: "ALL", value: 0 }, ...branchOptions]}
              showSearch
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        )}

        <Form.Item
          name="date_field_param"
          label="Date Field Parameter"
          rules={[{ required: true, message: "Please select a date field." }]}
        >
          <Select placeholder="Select date field" options={DATE_FIELD_OPTIONS} />
        </Form.Item>

        {showDocumentStatus && (
          <Form.Item name="document_status" label="Document Status">
            <Select options={[{ label: "All", value: "All" }, { label: "Active Only", value: "Active Only" }]} />
          </Form.Item>
        )}

        <Form.Item
          name="date_range"
          label="Date Covered"
          rules={[{ required: true, message: "Please select a date range." }]}
        >
          <DatePicker.RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
