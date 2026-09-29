import { useState } from "react";
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Space,
  Popconfirm, Tooltip, Typography, Upload, App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import useAuth from "../../../../../hooks/useAuth";
import handleApiError from "../../../../../utils/handleApiError";
import disciplinaryApi from "../../../../../services/employee/disciplinaryApi";
import { formatDate } from "../../../../../utils/formatDate";

// Matches DisciplinaryAction.vue's own hardcoded reference lists exactly
// (real company policy categories, not invented) — see vueportal for the
// source. Used as a closed Select rather than Vue's free-text-capable
// autocomplete, deliberately: these are fixed policy categories, not
// free-form text, so a closed list avoids ad-hoc typo'd categories.
const OFFENSES = [
  "TIMEKEEPING OFFENSE",
  "OFFENSES RELATED TO JOB PERFORMANCE",
  "OFFENSES RELATED TO CONDUCT & BEHAVIOUR",
  "OFFENSE AGAINST PROPERTY",
  "OFFENSES RELATED TO SECURITY",
  "OFFENSE AGAINST HEALTH & SAFETY",
  "OFFENSES AGAINST ATTENDANCE",
  "OFFENSES RELATED TO VEHICLE MAINTENANCE",
];
const DISCIPLINARY_ACTIONS = [
  "Verbal Warning",
  "Written Warning",
  "Last & Final Warning",
  "Suspension",
  "Preventive Suspension",
  "Dismissal/Termination",
];
const OFFENSE_SERIES = ["First Offense", "Second Offense", "Third Offense", "Fourth Offense", "Fifth Offense"];
const ACCEPTED_FILE_TYPES = ".jpeg,.jpg,.png,.docs,.docx,.pdf";

// Create mode (2026-09-24): matches EmployeeMasterDataController@store()'s
// `disciplinaries` field — a JSON array bundled into the SAME multipart
// request that creates the employee, with each row's `file` sent as a
// parallel-indexed `disciplinary_files[]` field (confirmed by reading
// store() directly — "save the employee first" was a frontend-only
// restriction). Each staged row keeps its picked File object directly on
// the record; EmployeeForm.jsx unpacks it into that parallel array when
// building the final create request.
export default function DisciplinaryRecordsTab({ employeeId, mode, initialRecords, pendingRecords, onPendingRecordsChange }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const isCreateMode = mode === "create";
  const [records, setRecords] = useState(initialRecords || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();

  const readOnly = mode === "view";
  const canCreate = !readOnly && hasPermission("employee-master-data-disciplinary-create");
  const canEdit = !readOnly && hasPermission("employee-master-data-disciplinary-edit");
  const canDelete = !readOnly && hasPermission("employee-master-data-disciplinary-delete");
  const canDownloadFile = hasPermission("employee-master-data-disciplinary-file-download");
  const canDeleteFile = !readOnly && hasPermission("employee-master-data-disciplinary-file-delete");

  const displayedRecords = isCreateMode ? (pendingRecords || []) : records;

  const openCreate = () => {
    setEditing(null);
    setPendingFile(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setPendingFile(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPendingFile(null);
  };

  // Populate/reset the form only after the Modal has actually opened, not
  // in openCreate/openEdit above — this Modal has destroyOnHidden, so its
  // <Form> doesn't exist in the tree yet at the moment those handlers run.
  // Calling form.resetFields()/setFieldsValue() before that triggers
  // AntD's "Instance created by useForm is not connected to any Form
  // element" warning — confirmed live (reported against WorkScheduleTab.jsx,
  // same copy-pasted pattern here). See SubmitAcknowledgmentReportModal.jsx
  // for the same afterOpenChange pattern, done correctly from the start.
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    if (editing) {
      form.setFieldsValue({
        date_issued: editing.date_issued ? dayjs(editing.date_issued) : null,
        nte_code: editing.nte_code,
        offense_code: editing.offense_code,
        offense: editing.offense,
        offense_type: editing.offense_type,
        disciplinary_action: editing.disciplinary_action,
        series: editing.series,
        status: editing.status,
        transmit_date: editing.transmit_date ? dayjs(editing.transmit_date) : null,
        return_date: editing.return_date ? dayjs(editing.return_date) : null,
      });
      if (isCreateMode) setPendingFile(editing.file || null);
    } else {
      form.resetFields();
      form.setFieldsValue({ status: "Open" });
    }
  };

  const buildFormData = (values) => {
    const formData = new FormData();
    formData.append("employee_id", employeeId);
    formData.append("date_issued", values.date_issued.format("YYYY-MM-DD"));
    formData.append("nte_code", values.nte_code);
    formData.append("offense_code", values.offense_code);
    formData.append("offense", values.offense);
    formData.append("offense_type", values.offense_type);
    formData.append("disciplinary_action", values.disciplinary_action);
    formData.append("series", values.series);
    formData.append("status", values.status);
    if (values.transmit_date) formData.append("transmit_date", values.transmit_date.format("YYYY-MM-DD"));
    if (values.return_date) formData.append("return_date", values.return_date.format("YYYY-MM-DD"));
    if (pendingFile) formData.append("file", pendingFile);
    return formData;
  };

  const handleSavePending = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const record = {
      id: editing?.id || `local-${Date.now()}`,
      date_issued: values.date_issued.format("YYYY-MM-DD"),
      nte_code: values.nte_code,
      offense_code: values.offense_code,
      offense: values.offense,
      offense_type: values.offense_type,
      disciplinary_action: values.disciplinary_action,
      series: values.series,
      status: values.status,
      transmit_date: values.transmit_date ? values.transmit_date.format("YYYY-MM-DD") : null,
      return_date: values.return_date ? values.return_date.format("YYYY-MM-DD") : null,
      file: pendingFile,
    };
    const updated = editing
      ? (pendingRecords || []).map((r) => (r.id === editing.id ? record : r))
      : [...(pendingRecords || []), record];
    onPendingRecordsChange(updated);
    messageApi.success(editing ? "Record updated." : "Record added.");
    closeModal();
  };

  const handleSave = async () => {
    if (isCreateMode) return handleSavePending();

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
        ? await disciplinaryApi.update(editing.id, formData)
        : await disciplinaryApi.create(formData);

      if (data.success) {
        setRecords(data.disciplinaries);
        messageApi.success(editing ? "Record updated." : "Record added.");
        closeModal();
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

  const handleDeletePending = (record) => {
    onPendingRecordsChange((pendingRecords || []).filter((r) => r.id !== record.id));
    messageApi.success("Record removed.");
  };

  const handleDelete = async (record) => {
    setDeletingId(record.id);
    try {
      const { data } = await disciplinaryApi.remove(record.id);
      setRecords(data.disciplinaries);
      messageApi.success("Record deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileDownload = async (record) => {
    try {
      const response = await disciplinaryApi.fileDownload(record.id);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = record.file_name || "file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleFileDelete = async (record) => {
    try {
      const { data } = await disciplinaryApi.fileDelete(record.id);
      setRecords(data.disciplinaries);
      messageApi.success("File deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const columns = [
    { title: "Date Issued", dataIndex: "date_issued", key: "date_issued", render: (v) => formatDate(v) },
    { title: "NTE Code", dataIndex: "nte_code", key: "nte_code" },
    { title: "Offense", dataIndex: "offense", key: "offense" },
    { title: "Offense Type", dataIndex: "offense_type", key: "offense_type" },
    { title: "Disciplinary Action", dataIndex: "disciplinary_action", key: "disciplinary_action" },
    { title: "Series", dataIndex: "series", key: "series" },
    { title: "Status", dataIndex: "status", key: "status" },
    {
      title: "File",
      key: "file",
      render: (_, record) => record.file_name ? (
        <Space>
          {canDownloadFile && (
            <Tooltip title="Download">
              <Button color="purple" variant="outlined" icon={<DownloadOutlined />} size="small" onClick={() => handleFileDownload(record)} />
            </Tooltip>
          )}
          {canDeleteFile && (
            <Popconfirm title="Delete this file?" onConfirm={() => handleFileDelete(record)}>
              <Tooltip title="Delete File">
                <Button danger icon={<DeleteOutlined />} size="small" />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ) : "-",
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
              onConfirm={() => (isCreateMode ? handleDeletePending(record) : handleDelete(record))}
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
            Add Disciplinary Action
          </Button>
        </div>
      )}

      <Table rowKey="id" size="small" dataSource={displayedRecords} columns={columns} pagination={false} scroll={{ x: "max-content" }} />

      <Modal
        title={editing ? "Edit Disciplinary Action" : "Add Disciplinary Action"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        afterOpenChange={handleAfterOpenChange}
        confirmLoading={saving}
        okText="Save"
        width={720}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="date_issued" label="Date Issued" rules={[{ required: true, message: "Please select a date." }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="nte_code" label="NTE Code" rules={[{ required: true, message: "Please enter the NTE code." }]}>
            <Input />
          </Form.Item>
          <Form.Item name="offense_code" label="Offense Code" rules={[{ required: true, message: "Please enter the offense code." }]}>
            <Input />
          </Form.Item>
          <Form.Item name="offense" label="Offense" rules={[{ required: true, message: "Please select an offense." }]}>
            <Select showSearch options={OFFENSES.map((o) => ({ label: o, value: o }))} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} />
          </Form.Item>
          <Form.Item name="offense_type" label="Offense Type" rules={[{ required: true, message: "Please enter the offense type." }]}>
            <Input />
          </Form.Item>
          <Form.Item name="disciplinary_action" label="Disciplinary Action" rules={[{ required: true, message: "Please select a disciplinary action." }]}>
            <Select showSearch options={DISCIPLINARY_ACTIONS.map((o) => ({ label: o, value: o }))} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} />
          </Form.Item>
          <Form.Item name="series" label="Series of Disciplinary" rules={[{ required: true, message: "Please select a series." }]}>
            <Select options={OFFENSE_SERIES.map((o) => ({ label: o, value: o }))} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true, message: "Please select a status." }]}>
            <Select options={[{ label: "Open", value: "Open" }, { label: "Closed", value: "Closed" }]} />
          </Form.Item>
          <Form.Item name="transmit_date" label="Transmit Date">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="return_date" label="Return Date">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          {/* Confirmed from EmployeeDisciplinaryController@update: once a
              record has a file, a re-uploaded one is silently ignored
              server-side — so replacing a file isn't offered here; delete
              the existing one first (outside this modal) to upload a new one. */}
          <Form.Item label="Memo File">
            {editing?.file_name ? (
              <Typography.Text type="secondary">
                {editing.file_name} — delete the existing file (in the table) before uploading a replacement.
              </Typography.Text>
            ) : (
              <Upload
                accept={ACCEPTED_FILE_TYPES}
                beforeUpload={(file) => { setPendingFile(file); return false; }}
                onRemove={() => setPendingFile(null)}
                fileList={pendingFile ? [pendingFile] : []}
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>Select File</Button>
              </Upload>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
