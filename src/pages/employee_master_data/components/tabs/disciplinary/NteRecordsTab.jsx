import { useState } from "react";
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Space,
  Popconfirm, Tooltip, Empty, Typography, Upload, App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import useAuth from "../../../../../hooks/useAuth";
import handleApiError from "../../../../../utils/handleApiError";
import nteApi from "../../../../../services/employee/nteApi";

const ACCEPTED_FILE_TYPES = ".jpeg,.jpg,.png,.docs,.docx,.pdf";

// One file slot (NTE File or Explanation File) — download/delete when a
// file already exists, otherwise a pending-upload picker. Matches
// disciplinaryApi's single-file pattern, duplicated per slot since NTE
// records carry two independent files (see nteApi.js).
function FileSlotField({ label, documentType, record, pendingFile, onPendingFileChange, canDownload, canDeleteFile, onFileDeleted }) {
  const { message: messageApi } = App.useApp();
  const fileName = documentType === "nte_file" ? record?.nte_file_name : record?.explanation_file_name;

  const handleDownload = async () => {
    try {
      const response = await nteApi.fileDownload(record.id, documentType);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleDelete = async () => {
    try {
      const { data } = await nteApi.fileDelete(record.id, documentType);
      onFileDeleted(data.explanations);
      messageApi.success("File deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  return (
    <Form.Item label={label}>
      {fileName ? (
        <Space>
          <Typography.Text>{fileName}</Typography.Text>
          {canDownload && <Button type="link" icon={<DownloadOutlined />} size="small" onClick={handleDownload} />}
          {canDeleteFile && (
            <Popconfirm title="Delete this file?" onConfirm={handleDelete}>
              <Button type="link" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          )}
        </Space>
      ) : (
        <Upload
          accept={ACCEPTED_FILE_TYPES}
          beforeUpload={(file) => { onPendingFileChange(file); return false; }}
          onRemove={() => onPendingFileChange(null)}
          fileList={pendingFile ? [pendingFile] : []}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
      )}
    </Form.Item>
  );
}

export default function NteRecordsTab({ employeeId, mode, initialRecords }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const [records, setRecords] = useState(initialRecords || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingNteFile, setPendingNteFile] = useState(null);
  const [pendingExplanationFile, setPendingExplanationFile] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();

  const readOnly = mode === "view";
  const canCreate = !readOnly && hasPermission("employee-master-data-nte-create");
  const canEdit = !readOnly && hasPermission("employee-master-data-nte-edit");
  const canDelete = !readOnly && hasPermission("employee-master-data-nte-delete");
  const canDownloadFile = hasPermission("employee-master-data-nte-file-download");
  const canDeleteFile = !readOnly && hasPermission("employee-master-data-nte-file-delete");

  if (mode === "create") {
    return <Empty description="Save the employee first before adding records here." style={{ padding: "24px 0" }} />;
  }

  const updateEditingFromResponse = (fresh) => {
    setRecords(fresh);
    setEditing((prev) => (prev ? fresh.find((r) => r.id === prev.id) || null : null));
  };

  const openCreate = () => {
    setEditing(null);
    setPendingNteFile(null);
    setPendingExplanationFile(null);
    form.resetFields();
    form.setFieldsValue({ status: "Open" });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setPendingNteFile(null);
    setPendingExplanationFile(null);
    form.setFieldsValue({
      date_issued: record.date_issued ? dayjs(record.date_issued) : null,
      issued_by: record.issued_by,
      nte_code: record.nte_code,
      violation: record.violation,
      explanation_date: record.explanation_date ? dayjs(record.explanation_date) : null,
      remarks: record.remarks,
      status: record.status,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPendingNteFile(null);
    setPendingExplanationFile(null);
    form.resetFields();
  };

  const buildFormData = (values) => {
    const formData = new FormData();
    formData.append("employee_id", employeeId);
    formData.append("date_issued", values.date_issued.format("YYYY-MM-DD"));
    formData.append("issued_by", values.issued_by);
    formData.append("nte_code", values.nte_code);
    formData.append("violation", values.violation);
    if (values.explanation_date) formData.append("explanation_date", values.explanation_date.format("YYYY-MM-DD"));
    if (values.remarks) formData.append("remarks", values.remarks);
    if (values.status) formData.append("status", values.status);
    if (pendingNteFile) formData.append("nte_file", pendingNteFile);
    if (pendingExplanationFile) formData.append("explanation_file", pendingExplanationFile);
    return formData;
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
        ? await nteApi.update(editing.id, formData)
        : await nteApi.create(formData);

      if (data.success) {
        setRecords(data.explanations);
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

  const handleDelete = async (record) => {
    setDeletingId(record.id);
    try {
      const { data } = await nteApi.remove(record.id);
      setRecords(data.explanations);
      messageApi.success("Record deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { title: "Date Issued", dataIndex: "date_issued", key: "date_issued" },
    { title: "Issued By", dataIndex: "issued_by", key: "issued_by" },
    { title: "NTE Code", dataIndex: "nte_code", key: "nte_code" },
    { title: "Violation", dataIndex: "violation", key: "violation", ellipsis: true },
    { title: "Status", dataIndex: "status", key: "status" },
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
            Add Issued NTE
          </Button>
        </div>
      )}

      <Table rowKey="id" size="small" dataSource={records} columns={columns} pagination={false} scroll={{ x: "max-content" }} />

      <Modal
        title={editing ? "Edit Issued NTE" : "Add Issued NTE"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Save"
        width={720}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="date_issued" label="Date Issued" rules={[{ required: true, message: "Please select a date." }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="issued_by" label="Issued By" rules={[{ required: true, message: "Please enter who issued this." }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nte_code" label="NTE Code" rules={[{ required: true, message: "Please enter the NTE code." }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[{ label: "Open", value: "Open" }, { label: "Closed", value: "Closed" }]} />
          </Form.Item>
          <Form.Item name="violation" label="Violation" rules={[{ required: true, message: "Please describe the violation." }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="explanation_date" label="Explanation Date">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={3} />
          </Form.Item>

          {/* Same backend limitation as Disciplinary Actions: once a slot
              has a file, re-uploading is silently ignored — delete first
              to replace. Only available once the record exists (edit),
              matching how Vue's own file slots work — a brand-new record
              has no id yet to scope a file_delete/file_download call to. */}
          {editing ? (
            <>
              <FileSlotField
                label="NTE File"
                documentType="nte_file"
                record={editing}
                pendingFile={pendingNteFile}
                onPendingFileChange={setPendingNteFile}
                canDownload={canDownloadFile}
                canDeleteFile={canDeleteFile}
                onFileDeleted={updateEditingFromResponse}
              />
              <FileSlotField
                label="Explanation File"
                documentType="explanation_file"
                record={editing}
                pendingFile={pendingExplanationFile}
                onPendingFileChange={setPendingExplanationFile}
                canDownload={canDownloadFile}
                canDeleteFile={canDeleteFile}
                onFileDeleted={updateEditingFromResponse}
              />
            </>
          ) : (
            <>
              <Form.Item label="NTE File">
                <Upload
                  accept={ACCEPTED_FILE_TYPES}
                  beforeUpload={(file) => { setPendingNteFile(file); return false; }}
                  onRemove={() => setPendingNteFile(null)}
                  fileList={pendingNteFile ? [pendingNteFile] : []}
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>Select File</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="Explanation File">
                <Upload
                  accept={ACCEPTED_FILE_TYPES}
                  beforeUpload={(file) => { setPendingExplanationFile(file); return false; }}
                  onRemove={() => setPendingExplanationFile(null)}
                  fileList={pendingExplanationFile ? [pendingExplanationFile] : []}
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
