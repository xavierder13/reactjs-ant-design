"use client";

import { useState } from "react";
import {
  Table, Button, Modal, Form, Select, DatePicker, Switch, Space,
  Popconfirm, Tooltip, Empty, Tag, Upload, App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import useAuth from "../../../../hooks/useAuth";
import handleApiError from "../../../../utils/handleApiError";
import employeeApi from "../../../../services/employee/employeeApi";
import offboardingApi from "../../../../services/employee/offboardingApi";
import OffboardingFileSlot from "./offboarding/OffboardingFileSlot";

// Matches Offboarding.vue's own hardcoded reference lists exactly (real
// company values, not invented) — see vueportal for the source.
const RESIGNATION_REASONS = [
  "To Work Abroad", "End of Contract", "AWOL", "To Work in other Company",
  "Family Reasons/Problems", "To Work in Government", "Due to Suspension",
  "Personal Matter/Reason", "Pressure at Work", "To Study",
  "Change of Family Residence", "Conflict w/ Co-Employees", "Dismissal",
  "Due to pregnancy", "Far Work Place", "Health Condition",
  "To Put Up Business", "Death", "Failed in Training Program", "Low Salary",
  "Prioritize physical & mental health", "Problem with Coor/Agency",
  "Re-training", "Others (Specify)",
];
const COMPLIANCE_OPTIONS = ["Render 30 Days", "Render 60 days", "Non-Compliant"];
const ACCEPTED_FILE_TYPES = ".jpeg,.jpg,.png,.docs,.docx,.pdf";

// This module's data source ambiguity (the previous Roadmap blocker) is
// resolved — see offboardingApi.js for the full evidence. It also carries
// a confirmed seeder/middleware permission-string mismatch, documented
// there too; this tab checks the middleware's real strings.
export default function OffboardingTab({ mode = "create", initialData }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const employeeId = initialData?.id;
  const [records, setRecords] = useState(initialData?.offboardings || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingLastDayFile, setPendingLastDayFile] = useState(null);
  const [pendingClearanceFile, setPendingClearanceFile] = useState(null);
  const [pendingQuitclaimFile, setPendingQuitclaimFile] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();

  const readOnly = mode === "view";
  // Confirmed against the live database, not just PermissionSeeder.php's
  // source (which doesn't reflect reality here): `-list` exists as
  // neither a seeded nor an actually-granted permission for this module —
  // 0 roles hold it, including Administrator. Every real role's actual
  // offboarding access (Administrator, Branch/Department/Division
  // Manager, Employee Master Data Administrator, Employees Relation,
  // Payroll Admin, Recruitment & Hiring, ...) is instead granted via the
  // base `employee-master-data-offboarding` string — exactly matching
  // `EmployeeInformationTabs.vue`'s own tab-visibility check
  // (`hasPermission('employee-master-data-offboarding')`), confirmed by
  // reading that file directly. Gating on `-list` would have hidden this
  // tab from literally everyone. See offboardingApi.js for the fuller
  // seeder-vs-middleware-vs-actual-data note.
  const canView = hasPermission("employee-master-data-offboarding");
  const canCreate = !readOnly && hasPermission("employee-master-data-offboarding-create");
  const canEdit = !readOnly && hasPermission("employee-master-data-offboarding-edit");
  const canDelete = !readOnly && hasPermission("employee-master-data-offboarding-delete");
  const canDownloadFile = hasPermission("employee-master-data-offboarding-file-download");
  const canDeleteFile = !readOnly && hasPermission("employee-master-data-offboarding-file-delete");

  if (mode === "create") {
    return <Empty description="Save the employee first before adding records here." style={{ padding: "24px 0" }} />;
  }
  if (!canView) return null;

  const updateEditingFromResponse = (fresh) => {
    setRecords(fresh);
    setEditing((prev) => (prev ? fresh.find((r) => r.id === prev.id) || null : null));
  };

  const clearPendingFiles = () => {
    setPendingLastDayFile(null);
    setPendingClearanceFile(null);
    setPendingQuitclaimFile(null);
  };

  const openCreate = () => {
    setEditing(null);
    clearPendingFiles();
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    clearPendingFiles();
    form.setFieldsValue({
      last_day_of_work: record.last_day_of_work ? dayjs(record.last_day_of_work) : null,
      reason_of_resignation: record.reason_of_resignation || undefined,
      resignation_date_filed: record.resignation_date_filed ? dayjs(record.resignation_date_filed) : null,
      resignation_date_received: record.resignation_date_received ? dayjs(record.resignation_date_received) : null,
      resignation_effectivity_date: record.resignation_effectivity_date ? dayjs(record.resignation_effectivity_date) : null,
      coe_is_issued: Boolean(record.coe_is_issued),
      last_pay_is_issued: Boolean(record.last_pay_is_issued),
      compliance: record.compliance || undefined,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    clearPendingFiles();
    form.resetFields();
  };

  const buildFormData = (values) => {
    const formData = new FormData();
    formData.append("employee_id", employeeId);
    formData.append("last_day_of_work", values.last_day_of_work.format("YYYY-MM-DD"));
    if (values.reason_of_resignation) formData.append("reason_of_resignation", values.reason_of_resignation);
    if (values.resignation_date_filed) formData.append("resignation_date_filed", values.resignation_date_filed.format("YYYY-MM-DD"));
    if (values.resignation_date_received) formData.append("resignation_date_received", values.resignation_date_received.format("YYYY-MM-DD"));
    if (values.resignation_effectivity_date) formData.append("resignation_effectivity_date", values.resignation_effectivity_date.format("YYYY-MM-DD"));
    formData.append("coe_is_issued", values.coe_is_issued ? "1" : "0");
    formData.append("last_pay_is_issued", values.last_pay_is_issued ? "1" : "0");
    if (values.compliance) formData.append("compliance", values.compliance);
    if (pendingLastDayFile) formData.append("last_day_file", pendingLastDayFile);
    if (pendingClearanceFile) formData.append("clearance_file", pendingClearanceFile);
    if (pendingQuitclaimFile) formData.append("quitclaim_file", pendingQuitclaimFile);
    return formData;
  };

  // Matches Offboarding.vue's own save flow exactly: saving an offboarding
  // record automatically flips the employee's resignation status too
  // (a separate endpoint, not a manual button) — see employeeApi.js's
  // `resign`. Best-effort: the offboarding record is already saved by the
  // time this runs, so a failure here is surfaced but doesn't roll back
  // the offboarding save (matching the Vue reference, which has no
  // rollback either).
  const resignEmployee = async (lastDayOfWork) => {
    try {
      await employeeApi.resign({ employee_id: employeeId, date_resigned: lastDayOfWork });
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);
    try {
      const formData = buildFormData(values);
      const { data } = editing
        ? await offboardingApi.update(editing.id, formData)
        : await offboardingApi.create(formData);

      if (data.success) {
        setRecords(data.offboardings);
        messageApi.success(editing ? "Record updated." : "Record added.");
        closeModal();
        await resignEmployee(values.last_day_of_work.format("YYYY-MM-DD"));
      } else {
        const [field, fieldErrors] = Object.entries(data || {})[0] || [];
        if (field) {
          form.setFields([{ name: field, errors: [].concat(fieldErrors) }]);
        } else {
          messageApi.error(data.error || "Failed to save record.");
        }
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    setDeletingId(record.id);
    try {
      const { data } = await offboardingApi.remove(record.id);
      setRecords(data.offboardings);
      messageApi.success("Record deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { title: "Last Day of Work", dataIndex: "last_day_of_work", key: "last_day_of_work" },
    { title: "Reason", dataIndex: "reason_of_resignation", key: "reason_of_resignation" },
    { title: "Compliance", dataIndex: "compliance", key: "compliance" },
    {
      title: "COE Issued",
      dataIndex: "coe_is_issued",
      key: "coe_is_issued",
      render: (v) => <Tag color={v ? "success" : "default"}>{v ? "Yes" : "No"}</Tag>,
    },
    {
      title: "Last Pay Issued",
      dataIndex: "last_pay_is_issued",
      key: "last_pay_is_issued",
      render: (v) => <Tag color={v ? "success" : "default"}>{v ? "Yes" : "No"}</Tag>,
    },
    ...(canEdit || canDelete ? [{
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Tooltip title="Edit">
              <Button color="green" variant="outlined" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Delete this record?"
              description="This cannot be undone."
              onConfirm={() => handleDelete(record)}
              okButtonProps={{ danger: true, loading: deletingId === record.id }}
              okText="Delete"
            >
              <Tooltip title="Delete">
                <Button danger icon={<DeleteOutlined />} size="small" />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  return (
    <div>
      {canCreate && (
        <div style={{ marginBottom: 12, textAlign: "right" }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Offboarding Record
          </Button>
        </div>
      )}

      <Table rowKey="id" size="small" dataSource={records} columns={columns} pagination={false} scroll={{ x: "max-content" }} />

      <Modal
        title={editing ? "Edit Offboarding Record" : "Add Offboarding Record"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Save"
        width={720}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="last_day_of_work" label="Last Day of Work" rules={[{ required: true, message: "Please select a date." }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="reason_of_resignation" label="Reason of Resignation">
            <Select showSearch options={RESIGNATION_REASONS.map((r) => ({ label: r, value: r }))} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} />
          </Form.Item>
          <Form.Item name="resignation_date_filed" label="Resignation Date Filed">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="resignation_date_received" label="Resignation File Received">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="resignation_effectivity_date" label="Resignation Effectivity Date">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="compliance" label="Compliance">
            <Select options={COMPLIANCE_OPTIONS.map((c) => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item name="coe_is_issued" label="COE Issued" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="last_pay_is_issued" label="Last Pay Issued" valuePropName="checked">
            <Switch />
          </Form.Item>

          {editing ? (
            <>
              <OffboardingFileSlot
                label="Last Day File"
                documentType="last_day_file"
                record={editing}
                pendingFile={pendingLastDayFile}
                onPendingFileChange={setPendingLastDayFile}
                canDownload={canDownloadFile}
                canDeleteFile={canDeleteFile}
                onFileDeleted={updateEditingFromResponse}
              />
              <OffboardingFileSlot
                label="Clearance File"
                documentType="clearance_file"
                record={editing}
                pendingFile={pendingClearanceFile}
                onPendingFileChange={setPendingClearanceFile}
                canDownload={canDownloadFile}
                canDeleteFile={canDeleteFile}
                onFileDeleted={updateEditingFromResponse}
              />
              <OffboardingFileSlot
                label="Quitclaim File"
                documentType="quitclaim_file"
                record={editing}
                pendingFile={pendingQuitclaimFile}
                onPendingFileChange={setPendingQuitclaimFile}
                canDownload={canDownloadFile}
                canDeleteFile={canDeleteFile}
                onFileDeleted={updateEditingFromResponse}
              />
            </>
          ) : (
            <>
              <Form.Item label="Last Day File">
                <Upload
                  accept={ACCEPTED_FILE_TYPES}
                  beforeUpload={(file) => { setPendingLastDayFile(file); return false; }}
                  onRemove={() => setPendingLastDayFile(null)}
                  fileList={pendingLastDayFile ? [pendingLastDayFile] : []}
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>Select File</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="Clearance File">
                <Upload
                  accept={ACCEPTED_FILE_TYPES}
                  beforeUpload={(file) => { setPendingClearanceFile(file); return false; }}
                  onRemove={() => setPendingClearanceFile(null)}
                  fileList={pendingClearanceFile ? [pendingClearanceFile] : []}
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>Select File</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="Quitclaim File">
                <Upload
                  accept={ACCEPTED_FILE_TYPES}
                  beforeUpload={(file) => { setPendingQuitclaimFile(file); return false; }}
                  onRemove={() => setPendingQuitclaimFile(null)}
                  fileList={pendingQuitclaimFile ? [pendingQuitclaimFile] : []}
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>Select File</Button>
                </Upload>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
