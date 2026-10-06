"use client";

import { useState } from "react";
import {
  Table, Button, Modal, Form, Space,
  Popconfirm, Tooltip, Empty, Tag, App, ConfigProvider,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import useAuth from "../../../../hooks/useAuth";
import handleApiError from "../../../../utils/handleApiError";
import employeeApi from "../../../../services/employee/employeeApi";
import offboardingApi from "../../../../services/employee/offboardingApi";
import OffboardingFileSlot, { OffboardingFileSlots } from "./offboarding/OffboardingFileSlot";
import OffboardingFormFields from "./offboarding/OffboardingFormFields";
import { formatDate } from "../../../../utils/formatDate";

// This module's data source ambiguity (the previous Roadmap blocker) is
// resolved — see offboardingApi.js for the full evidence. It also carries
// a confirmed seeder/middleware permission-string mismatch, documented
// there too; this tab checks the middleware's real strings.
export default function OffboardingTab({ mode = "create", initialData, onEmployeeChange }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const employeeId = initialData?.id;
  const [records, setRecords] = useState(initialData?.offboardings || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // Read-only look at a record (and its files) where it can't be edited —
  // employee View mode, or no edit permission.
  const [viewOnly, setViewOnly] = useState(false);
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
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    clearPendingFiles();
    setModalOpen(true);
  };

  const openView = (record) => {
    setEditing(record);
    setViewOnly(true);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setViewOnly(false);
    clearPendingFiles();
  };

  const FILE_SLOTS = [
    { label: "Last Day File", documentType: "last_day_file", pending: pendingLastDayFile, setPending: setPendingLastDayFile },
    { label: "Clearance File", documentType: "clearance_file", pending: pendingClearanceFile, setPending: setPendingClearanceFile },
    { label: "Quitclaim File", documentType: "quitclaim_file", pending: pendingQuitclaimFile, setPending: setPendingQuitclaimFile },
  ];

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
        last_day_of_work: editing.last_day_of_work ? dayjs(editing.last_day_of_work) : null,
        reason_of_resignation: editing.reason_of_resignation || undefined,
        resignation_date_filed: editing.resignation_date_filed ? dayjs(editing.resignation_date_filed) : null,
        resignation_date_received: editing.resignation_date_received ? dayjs(editing.resignation_date_received) : null,
        resignation_effectivity_date: editing.resignation_effectivity_date ? dayjs(editing.resignation_effectivity_date) : null,
        coe_is_issued: Boolean(editing.coe_is_issued),
        last_pay_is_issued: Boolean(editing.last_pay_is_issued),
        compliance: editing.compliance || undefined,
      });
    } else {
      form.resetFields();
    }
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
  //
  // Real bug found 2026-09-23: the resign call flips `active` server-side,
  // but nothing told the rest of this page (Card title, Employee Details
  // Status) about it — they kept showing the value from when the page
  // first loaded. Fixed to match Offboarding.vue's resignEmployee()
  // exactly: compute the resulting `active` client-side with the SAME
  // date comparison the backend's resign() endpoint uses
  // (EmployeeMasterDataController@resign — a future-dated resignation
  // stays Active, today-or-earlier goes Inactive), then hand it to
  // EmployeeForm.jsx via onEmployeeChange (React's equivalent of Vue's
  // `$emit('updateStatus', {active, date_resigned})`).
  const resignEmployee = async (lastDayOfWork) => {
    try {
      await employeeApi.resign({ employee_id: employeeId, date_resigned: lastDayOfWork });

      let active = 1;
      if (lastDayOfWork) {
        const today = dayjs().startOf("day");
        active = dayjs(lastDayOfWork).startOf("day").isAfter(today) ? 1 : 0;
      }
      onEmployeeChange?.({ active, date_resigned: lastDayOfWork });
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
    { title: "Last Day of Work", dataIndex: "last_day_of_work", key: "last_day_of_work", render: (v) => formatDate(v) },
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
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space>
          {!canEdit && (
            // The employee page's View-mode <Form disabled> would disable
            // this button (and the modal's Download buttons) too.
            <ConfigProvider componentDisabled={false}>
              <Tooltip title="View">
                <Button color="blue" variant="outlined" icon={<EyeOutlined />} size="small" onClick={() => openView(record)} />
              </Tooltip>
            </ConfigProvider>
          )}
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
    },
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

      <ConfigProvider componentDisabled={false}>
        <Modal
          title={viewOnly ? "Offboarding Record" : editing ? "Edit Offboarding Record" : "Add Offboarding Record"}
          open={modalOpen}
          onCancel={closeModal}
          onOk={handleSave}
          afterOpenChange={handleAfterOpenChange}
          confirmLoading={saving}
          okText="Save"
          cancelText={viewOnly ? "Close" : "Cancel"}
          okButtonProps={{ style: viewOnly ? { display: "none" } : undefined }}
          width={880}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" disabled={viewOnly}>
            <OffboardingFormFields />

            <ConfigProvider componentDisabled={false}>
              <OffboardingFileSlots readOnly={viewOnly}>
                {FILE_SLOTS.map(({ label, documentType, pending, setPending }) => (
                  <OffboardingFileSlot
                    key={documentType}
                    label={label}
                    documentType={documentType}
                    record={editing}
                    pendingFile={pending}
                    onPendingFileChange={setPending}
                    canDownload={canDownloadFile}
                    canDeleteFile={canDeleteFile}
                    onFileDeleted={updateEditingFromResponse}
                    readOnly={viewOnly}
                  />
                ))}
              </OffboardingFileSlots>
            </ConfigProvider>
          </Form>
        </Modal>
      </ConfigProvider>
    </div>
  );
}
