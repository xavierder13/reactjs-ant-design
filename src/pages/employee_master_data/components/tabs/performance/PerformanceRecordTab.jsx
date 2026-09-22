import { useState } from "react";
import { Table, Button, Modal, Form, Space, Popconfirm, Tooltip, Empty, App } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

import useAuth from "../../../../../hooks/useAuth";
import handleApiError from "../../../../../utils/handleApiError";

// Generic list+modal CRUD for one of Employee Master Data's Performance
// Management sub-records (Classroom/OJT Performance Rating, Branch
// Assignment & Positions, Merit History, Training). All five share the
// same shape: no index() endpoint exists for any of them (confirmed by
// reading each vueportal controller directly) — the record set is already
// present on the employee object itself (eager-loaded on every
// `/employee_master_data/index` row), and every store/update/delete call
// returns the employee's full remaining list for that relation, which
// becomes this component's new local state. Monthly Key Performance is
// NOT built on this component — it's a batch-per-year mutation, not
// single-row CRUD; see MonthlyKeyPerformanceTab.jsx.
//
// Props:
//   title               section heading
//   mode                'create' | 'edit' | 'view'
//   initialRecords      initialData?.<relation> — array | undefined
//   permissionPrefix    e.g. 'employee-master-data-merit-history'
//   columns             AntD Table columns (Actions column is appended by this component)
//   renderFields        (form) => JSX of the modal's Form.Item(s)
//   getInitialFormValues (record | null) => values for form.setFieldsValue on open
//   onCreate            async (values) => { success, records } | { success: false, errors }
//   onUpdate            async (record, values) => { success, records } | { success: false, errors }
//   onDelete            async (record) => fresh records array (delete failures are genuine HTTP
//                        errors here, not a 200-with-errors-body, so this one just throws normally)
//
// onCreate/onUpdate's `{ success: false, errors }` shape matches every one
// of these vueportal controllers' own quirk: `store`/`update` return HTTP
// 200 with just the raw Laravel validator error bag (no `success` key) on
// validation failure — never a 422. There's nothing to catch; `data.success`
// is the only reliable signal. `errors` is that raw `{ field: [messages] }`
// object, mapped onto the form below.
export default function PerformanceRecordTab({
  title,
  mode,
  initialRecords,
  permissionPrefix,
  columns,
  renderFields,
  getInitialFormValues,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const [records, setRecords] = useState(initialRecords || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();

  const readOnly = mode === "view";
  const canCreate = !readOnly && hasPermission(`${permissionPrefix}-create`);
  const canEdit = !readOnly && hasPermission(`${permissionPrefix}-edit`);
  const canDelete = !readOnly && hasPermission(`${permissionPrefix}-delete`);

  if (mode === "create") {
    return <Empty description="Save the employee first before adding records here." style={{ padding: "24px 0" }} />;
  }

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue(getInitialFormValues(null));
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(getInitialFormValues(record));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
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
      const result = editing ? await onUpdate(editing, values) : await onCreate(values);
      if (result.success) {
        setRecords(result.records);
        messageApi.success(editing ? "Record updated." : "Record added.");
        closeModal();
      } else {
        const [field, fieldErrors] = Object.entries(result.errors || {})[0] || [];
        if (field) {
          form.setFields([{ name: field, errors: [].concat(fieldErrors) }]);
        } else {
          messageApi.error("Failed to save record.");
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
      const fresh = await onDelete(record);
      setRecords(fresh);
      messageApi.success("Record deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setDeletingId(null);
    }
  };

  const actionColumn = {
    title: "Actions",
    key: "actions",
    width: 100,
    render: (_, record) => (
      <Space>
        {canEdit && (
          <Tooltip title="Edit">
            <Button
              color="green"
              variant="outlined"
              icon={<EditOutlined />}
              size="small"
              onClick={() => openEdit(record)}
            />
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
  };

  return (
    <div>
      {canCreate && (
        <div style={{ marginBottom: 12, textAlign: "right" }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add {title}
          </Button>
        </div>
      )}

      <Table
        rowKey="id"
        size="small"
        dataSource={records}
        columns={canEdit || canDelete ? [...columns, actionColumn] : columns}
        pagination={false}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={editing ? `Edit ${title}` : `Add ${title}`}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Save"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          {renderFields(form)}
        </Form>
      </Modal>
    </div>
  );
}
