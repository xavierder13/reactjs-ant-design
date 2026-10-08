"use client";

import { useState } from "react";
import {
  Table, Button, Modal, Form, Select, DatePicker, Input, Space, Alert,
  Popconfirm, Tooltip, Tag, Typography, App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import useAuth from "../../../../hooks/useAuth";
import handleApiError from "../../../../utils/handleApiError";
import workScheduleApi from "../../../../services/employee/workScheduleApi";
import shiftApi from "../../../../services/shift/shiftApi";
import { patternSummary } from "../../../shift/shiftHelpers";
import ShiftChip from "../../../shift/ShiftChip";
import { formatDate, DISPLAY_DATE_FORMAT } from "../../../../utils/formatDate";

// Next id for a staged (create-mode) row — unique among the staged rows.
const nextLocalId = (rows = []) => `local-${Math.max(0, ...rows.map((r) => Number(String(r.id).replace("local-", "")) || 0)) + 1}`;

// A version's schedule as text: its shift's weekly pattern, or for a
// version typed in by hand (before Work Schedules picked a shift) its rest
// day and hours.
const scheduleText = (record) => (record.shift
  ? patternSummary(record.shift.days)
  : `Rest day: ${record.rest_day || "—"} · ${record.time_in || "—"}–${record.time_out || "—"}`);

// New module — no vueportal Vue reference to port (unlike the sibling
// Offboarding/NTE/Disciplinary tabs). Records an employee's work-schedule
// history — the fixed schedule from the approved memo — versioned by
// Effective Date so a schedule change doesn't overwrite the prior one. A
// version picks a shift (Time & Leave → Setup → Shifts); older versions
// typed in by hand (rest day + time in / out) stay as they are. Temporary
// shifting (Time & Leave → Shifting) never changes this history. Intended to later feed
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
  const [shifts, setShifts] = useState([]);
  const [form] = Form.useForm();
  const shiftId = Form.useWatch("shift_id", form);

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
  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) return;
    if (editing) {
      form.setFieldsValue({
        effective_date: editing.effective_date ? dayjs(editing.effective_date) : null,
        shift_id: editing.shift_id || undefined,
        remarks: editing.remarks || "",
      });
    } else {
      form.resetFields();
    }
    try {
      const { data } = await shiftApi.options();
      setShifts(data.shifts);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  // The edited version's own shift may be inactive now (not in options).
  const shiftChoices = editing?.shift && !shifts.some((s) => s.id === editing.shift_id)
    ? [...shifts, { ...editing.shift, inactive: true }]
    : shifts;
  const pickedShift = shiftChoices.find((s) => s.id === shiftId);

  const buildPayload = (values) => ({
    employee_id: employeeId,
    effective_date: values.effective_date.format("YYYY-MM-DD"),
    shift_id: values.shift_id,
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
    // `shift` is for display only (the backend reads shift_id)
    const record = { ...buildPayload(values), remarks: values.remarks || null, shift: pickedShift, id: editing?.id || nextLocalId(pendingRecords) };
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
        if (["effective_date", "shift_id", "remarks"].includes(field)) {
          form.setFields([{ name: field, errors: [].concat(fieldErrors) }]);
        } else {
          // { error: "..." } or a field this form doesn't have
          messageApi.error([].concat(data?.error || fieldErrors || "Failed to save work schedule.")[0]);
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
    { title: "Effective Date", dataIndex: "effective_date", key: "effective_date", render: (v) => formatDate(v) },
    {
      title: "Shift",
      key: "shift",
      render: (_, record) => (record.shift
        ? <ShiftChip shift={record.shift} />
        : <Tooltip title="Entered by hand before Work Schedules picked a shift"><Tag>Manual</Tag></Tooltip>),
    },
    { title: "Schedule", key: "schedule", render: (_, record) => scheduleText(record) },
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
            <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
          {editing && !editing.shift_id && (
            <Alert
              type="info"
              showIcon
              title={`This version was entered by hand (${scheduleText(editing)}). Saving it picks a shift instead.`}
              style={{ marginBottom: 12 }}
            />
          )}
          <Form.Item
            name="shift_id"
            label="Shift"
            extra={pickedShift ? patternSummary(pickedShift.days) : null}
            rules={[{ required: true, message: "Please select a shift." }]}
          >
            <Select
              showSearch={{ optionFilterProp: "label" }}
              placeholder="Select the shift from the approved memo"
              options={shiftChoices.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}${s.inactive ? " (inactive)" : ""}` }))}
              notFoundContent={<Typography.Text type="secondary">No active shifts — add one in Time &amp; Leave → Setup → Shifts.</Typography.Text>}
            />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
