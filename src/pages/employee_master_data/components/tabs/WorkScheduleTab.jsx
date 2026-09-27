"use client";

import { useState } from "react";
import {
  Table, Button, Modal, Form, Select, DatePicker, TimePicker, Input, Row, Col, Space,
  Popconfirm, Tooltip, Tag, App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import useAuth from "../../../../hooks/useAuth";
import handleApiError from "../../../../utils/handleApiError";
import workScheduleApi from "../../../../services/employee/workScheduleApi";

// PH Labor Code rest-day vocabulary (Art. 91-93) — matches
// EmployeeWorkScheduleController::REST_DAYS exactly (case must match).
const REST_DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const TIME_FORMAT = "HH:mm";

// New module — no vueportal Vue reference to port (unlike the sibling
// Offboarding/NTE/Disciplinary tabs). Records an employee's work-schedule
// history: rest day + time of duty, versioned by Effective Date so a
// schedule change doesn't overwrite the prior one. Intended to later feed
// late/absence computation and the KPI Attendance component (currently a
// stubbed AttendanceService) by giving that computation a schedule to
// compare the read-only Attendance tab's BioBridge punches against — that
// comparison is NOT built here, this is just record management.
//
// Create mode: rows are staged locally (pendingRecords) and sent with the
// Add Employee request as `work_schedules` — see EmployeeForm.jsx's
// buildCreateRequestBody() and EmployeeMasterDataController@store().
export default function WorkScheduleTab({ mode = "create", initialData, pendingRecords, onPendingRecordsChange }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const employeeId = initialData?.id;
  const [records, setRecords] = useState(initialData?.work_schedules || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();

  const readOnly = mode === "view";
  const isCreateMode = mode === "create";
  // Tab-level gate matches this repo's own established pattern (see
  // EmployeeTabs.jsx's TAB_PERMISSIONS comment): a base permission string
  // gates the tab itself, separate -create/-edit/-delete gate row actions.
  const canView = hasPermission("employee-master-data-work-schedule");
  const canCreate = !readOnly && hasPermission("employee-master-data-work-schedule-create");
  const canEdit = !readOnly && hasPermission("employee-master-data-work-schedule-edit");
  const canDelete = !readOnly && hasPermission("employee-master-data-work-schedule-delete");

  if (!canView) return null;

  const displayedRecords = isCreateMode
    ? [...(pendingRecords || [])].sort((a, b) => b.effective_date.localeCompare(a.effective_date))
    : records;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  // Populate/reset the form only after the Modal has actually opened (and
  // therefore mounted its <Form>), not in openCreate/openEdit above — this
  // Modal has destroyOnHidden, so its Form doesn't exist in the tree yet at
  // the moment those handlers run (setModalOpen(true) hasn't been flushed
  // to a render). Calling form.resetFields()/setFieldsValue() before that
  // triggers AntD's "Instance created by useForm is not connected to any
  // Form element" warning — confirmed live, not just theoretical. See
  // SubmitAcknowledgmentReportModal.jsx for the same afterOpenChange
  // pattern, done correctly from the start.
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    if (editing) {
      form.setFieldsValue({
        effective_date: editing.effective_date ? dayjs(editing.effective_date) : null,
        rest_day: editing.rest_day || undefined,
        time_in: editing.time_in ? dayjs(editing.time_in, TIME_FORMAT) : null,
        time_out: editing.time_out ? dayjs(editing.time_out, TIME_FORMAT) : null,
        remarks: editing.remarks || "",
      });
    } else {
      form.resetFields();
    }
  };

  const buildPayload = (values) => ({
    employee_id: employeeId,
    effective_date: values.effective_date.format("YYYY-MM-DD"),
    rest_day: values.rest_day,
    time_in: values.time_in.format(TIME_FORMAT),
    time_out: values.time_out.format(TIME_FORMAT),
    remarks: values.remarks || undefined,
  });

  const handleSavePending = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    // No employee_id yet — the backend assigns it when store() creates the
    // employee. `id` is local-only; EmployeeForm strips it before sending.
    const record = { ...buildPayload(values), remarks: values.remarks || null, id: editing?.id || `local-${Date.now()}` };
    delete record.employee_id;
    const updated = editing
      ? (pendingRecords || []).map((r) => (r.id === editing.id ? record : r))
      : [...(pendingRecords || []), record];
    onPendingRecordsChange(updated);
    messageApi.success(editing ? "Work schedule updated." : "Work schedule added.");
    closeModal();
  };

  const handleDeletePending = (record) => {
    onPendingRecordsChange((pendingRecords || []).filter((r) => r.id !== record.id));
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
      const payload = buildPayload(values);
      const { data } = editing
        ? await workScheduleApi.update(editing.id, payload)
        : await workScheduleApi.create(payload);

      if (data.success) {
        setRecords(data.work_schedules);
        messageApi.success(editing ? "Work schedule updated." : "Work schedule added.");
        closeModal();
      } else {
        const [field, fieldErrors] = Object.entries(data || {})[0] || [];
        if (field) {
          form.setFields([{ name: field, errors: [].concat(fieldErrors) }]);
        } else {
          messageApi.error(data.error || "Failed to save work schedule.");
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
      const { data } = await workScheduleApi.remove(record.id);
      setRecords(data.work_schedules);
      messageApi.success("Work schedule deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { title: "Effective Date", dataIndex: "effective_date", key: "effective_date" },
    {
      title: "Rest Day",
      dataIndex: "rest_day",
      key: "rest_day",
      render: (v) => <Tag>{v}</Tag>,
    },
    { title: "Time In", dataIndex: "time_in", key: "time_in" },
    { title: "Time Out", dataIndex: "time_out", key: "time_out" },
    { title: "Remarks", dataIndex: "remarks", key: "remarks", render: (v) => v || "-" },
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
              title="Delete this work schedule?"
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
            Add Work Schedule
          </Button>
        </div>
      )}

      <Table rowKey="id" size="small" dataSource={displayedRecords} columns={columns} pagination={false} scroll={{ x: "max-content" }} />

      <Modal
        title={editing ? "Edit Work Schedule" : "Add Work Schedule"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        afterOpenChange={handleAfterOpenChange}
        confirmLoading={saving}
        okText="Save"
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="effective_date" label="Effective Date" rules={[{ required: true, message: "Please select an effective date." }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="rest_day" label="Rest Day" rules={[{ required: true, message: "Please select a rest day." }]}>
            <Select options={REST_DAYS.map((d) => ({ label: d, value: d }))} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="time_in" label="Time In" rules={[{ required: true, message: "Please select time in." }]}>
                <TimePicker style={{ width: "100%" }} format={TIME_FORMAT} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="time_out" label="Time Out" rules={[{ required: true, message: "Please select time out." }]}>
                <TimePicker style={{ width: "100%" }} format={TIME_FORMAT} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
