"use client";

import { useState } from "react";
import { Modal, Select, Form, DatePicker, App } from "antd";
import useAuth from "../../../hooks/useAuth";
import useEmployeeFormOptions from "../../../hooks/useEmployeeFormOptions";
import EmployeeSelect from "../../manpower_request/request/EmployeeSelect";
import handleApiError from "../../../utils/handleApiError";
import downloadBlobResponse from "../../../utils/downloadBlobResponse";
import { DISPLAY_DATE_FORMAT } from "../../../utils/formatDate";
import { DOCUMENT_TYPES, BRANCH_POSITION_ROLES, MONTHS } from "./importDocumentTypes";

// Matches vueportal's TemplateDownloadDialog.vue: a Document Type dropdown
// (shared list in importDocumentTypes.js) plus the options the chosen
// template's backend reads — Document Status, Branch / Position for HR
// roles (0 = ALL; Branch Assignment Position and Monthly Key Performance),
// Year / Month for Monthly Key Performance, Branch / Position / Employees
// for Salary and Attendance Logs (blank = everyone matching the other
// filters), and a date range (≤ 31 days) for Attendance Logs.
const YEARS = Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).reverse();
const STATUS_OPTIONS = ["All", "Active", "Inactive"].map((s) => ({ label: s, value: s }));

// `types` (optional): only these document types — one is preselected.
export default function GenerateTemplateModal({ open, onClose, types }) {
  const { message: messageApi } = App.useApp();
  const { hasRole, hasPermission, hasAnyRole } = useAuth();
  const { branchOptions, positionOptions } = useEmployeeFormOptions();
  const [form] = Form.useForm();
  const [downloading, setDownloading] = useState(false);
  const documentType = Form.useWatch("document_type", form);

  const isAdmin = hasRole("Administrator");
  const options = DOCUMENT_TYPES.filter((type) => !types || types.includes(type.value))
    .filter((type) => isAdmin || hasPermission(type.templatePermission))
    .map(({ value, label }) => ({ value, label }));
  const type = DOCUMENT_TYPES.find((t) => t.value === documentType);
  const showEmployees = !!type?.templateOptions?.employees;
  const showBranchPosition = showEmployees || (type?.templateOptions?.branchPosition && hasAnyRole(...BRANCH_POSITION_ROLES));
  const branchId = Form.useWatch("branch_id", form);
  const positionId = Form.useWatch("position_id", form);

  const handleClose = () => {
    if (downloading) return;
    form.resetFields();
    onClose();
  };

  const handleGenerate = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setDownloading(true);
    try {
      // Same body as Vue's dialog; each backend reads only its own fields.
      const response = await type.download({
        document_type: type.label,
        document_status: values.document_status || "All",
        branch_id: values.branch_id ?? "",
        position_id: values.position_id ?? "",
        period: values.period ?? "",
        month: values.month ?? "",
        ...(showEmployees ? { employee_ids: (values.employee_ids || []).map((e) => e.value) } : {}),
        ...(type.templateOptions?.dateRange ? { date_from: values.dates[0].format("YYYY-MM-DD"), date_to: values.dates[1].format("YYYY-MM-DD") } : {}),
      });
      const downloaded = await downloadBlobResponse(response, type.filename, messageApi);
      if (downloaded) {
        messageApi.success("Template downloaded.");
        handleClose();
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Generate Template"
      onCancel={handleClose}
      onOk={handleGenerate}
      okText="Generate"
      confirmLoading={downloading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ document_type: types?.length === 1 ? types[0] : undefined, document_status: "All", month: "All", branch_id: 0, position_id: 0 }}>
        <Form.Item name="document_type" label="Document Type" rules={[{ required: true, message: "Select a document type." }]}>
          <Select placeholder="Select document type" options={options} />
        </Form.Item>

        {showBranchPosition && (
          <>
            <Form.Item name="position_id" label="Position">
              <Select
                showSearch
                optionFilterProp="label"
                options={[{ label: "ALL", value: 0 }, ...positionOptions]}
              />
            </Form.Item>
            <Form.Item name="branch_id" label="Branch">
              <Select
                showSearch
                optionFilterProp="label"
                options={[{ label: "ALL", value: 0 }, ...branchOptions]}
              />
            </Form.Item>
          </>
        )}

        {showEmployees && (
          <Form.Item
            name="employee_ids"
            label="Employees"
            extra="Blank = every employee of the branch / position above."
          >
            <EmployeeSelect
              multiple
              placeholder="All employees"
              branchId={branchId || undefined}
              positionId={positionId || undefined}
            />
          </Form.Item>
        )}

        {type?.templateOptions?.dateRange && (
          <Form.Item
            name="dates"
            label="Dates"
            extra="One line per employee per date — at most 31 days."
            rules={[
              { required: true, message: "Choose the dates." },
              {
                validator: (_, v) => (!v?.[0] || !v?.[1] || v[1].diff(v[0], "day") < 31
                  ? Promise.resolve()
                  : Promise.reject(new Error("At most 31 days."))),
              },
            ]}
          >
            <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
        )}

        {type?.templateOptions?.kpi && (
          <>
            <Form.Item name="period" label="Year" rules={[{ required: true, message: "Year is required." }]}>
              <Select placeholder="Select year" options={YEARS.map((y) => ({ label: String(y), value: y }))} />
            </Form.Item>
            <Form.Item name="month" label="Month" rules={[{ required: true, message: "Month is required." }]}>
              <Select options={["All", ...MONTHS].map((m) => ({ label: m, value: m }))} />
            </Form.Item>
          </>
        )}

        {type?.templateOptions?.status && (
          <Form.Item name="document_status" label="Document Status">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
