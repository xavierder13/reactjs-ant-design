import { useState } from "react";
import {
  Table, Button, Modal, Form, Space,
  Popconfirm, Tooltip, App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import useAuth from "../../../../../hooks/useAuth";
import handleApiError from "../../../../../utils/handleApiError";
import nteApi from "../../../../../services/employee/nteApi";
import { formatDate } from "../../../../../utils/formatDate";
import NteFormFields from "./NteFormFields";
import NteFileSlot, { NteFileSlots } from "./NteFileSlot";

// Create mode (2026-09-24): matches EmployeeMasterDataController@store()'s
// `explanations` field — a JSON array bundled into the SAME multipart
// request that creates the employee, with each row's `nte_file`/
// `explanation_file` sent as parallel-indexed `nte_files[]`/
// `explanation_files[]` fields (confirmed by reading store() directly —
// "save the employee first" was a frontend-only restriction). Each staged
// row here keeps its picked File objects directly on the record (not the
// shared pendingFiles array Files & Requirements/Evaluation &
// Regularization use — these are per-row, not a shared pool), and
// EmployeeForm.jsx unpacks them into the two parallel arrays when
// building the final create request.
export default function NteRecordsTab({ employeeId, mode, initialRecords, pendingRecords, onPendingRecordsChange }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const isCreateMode = mode === "create";
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

  const displayedRecords = isCreateMode ? (pendingRecords || []) : records;

  const updateEditingFromResponse = (fresh) => {
    setRecords(fresh);
    setEditing((prev) => (prev ? fresh.find((r) => r.id === prev.id) || null : null));
  };

  const openCreate = () => {
    setEditing(null);
    setPendingNteFile(null);
    setPendingExplanationFile(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setPendingNteFile(null);
    setPendingExplanationFile(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPendingNteFile(null);
    setPendingExplanationFile(null);
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
        issued_by: editing.issued_by,
        nte_code: editing.nte_code,
        violation: editing.violation,
        explanation_date: editing.explanation_date ? dayjs(editing.explanation_date) : null,
        remarks: editing.remarks,
        status: editing.status,
      });
      if (isCreateMode) {
        setPendingNteFile(editing.nte_file || null);
        setPendingExplanationFile(editing.explanation_file || null);
      }
    } else {
      form.resetFields();
      form.setFieldsValue({ status: "Open" });
    }
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
      issued_by: values.issued_by,
      nte_code: values.nte_code,
      violation: values.violation,
      explanation_date: values.explanation_date ? values.explanation_date.format("YYYY-MM-DD") : null,
      remarks: values.remarks || null,
      status: values.status || "Open",
      nte_file: pendingNteFile,
      explanation_file: pendingExplanationFile,
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

  const handleDeletePending = (record) => {
    onPendingRecordsChange((pendingRecords || []).filter((r) => r.id !== record.id));
    messageApi.success("Record removed.");
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
    { title: "Date Issued", dataIndex: "date_issued", key: "date_issued", render: (v) => formatDate(v) },
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
            Add Issued NTE
          </Button>
        </div>
      )}

      <Table rowKey="id" size="small" dataSource={displayedRecords} columns={columns} pagination={false} scroll={{ x: "max-content" }} />

      <Modal
        title={editing ? "Edit Issued NTE" : "Add Issued NTE"}
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
          <NteFormFields />

          {/* Same backend limitation as Disciplinary Actions: once a slot
              has a file, re-uploading is silently ignored — delete first
              to replace. Download/delete need a saved record id, so create
              mode (and Add) passes record={null}: the slots then only pick
              pending files — see handleAfterOpenChange, which seeds them
              from a locally-staged row's own nte_file/explanation_file. */}
          <NteFileSlots>
            <NteFileSlot
              label="NTE File"
              documentType="nte_file"
              record={!isCreateMode ? editing : null}
              pendingFile={pendingNteFile}
              onPendingFileChange={setPendingNteFile}
              canDownload={canDownloadFile}
              canDeleteFile={canDeleteFile}
              onFileDeleted={updateEditingFromResponse}
            />
            <NteFileSlot
              label="Explanation File"
              documentType="explanation_file"
              record={!isCreateMode ? editing : null}
              pendingFile={pendingExplanationFile}
              onPendingFileChange={setPendingExplanationFile}
              canDownload={canDownloadFile}
              canDeleteFile={canDeleteFile}
              onFileDeleted={updateEditingFromResponse}
            />
          </NteFileSlots>
        </Form>
      </Modal>
    </div>
  );
}
