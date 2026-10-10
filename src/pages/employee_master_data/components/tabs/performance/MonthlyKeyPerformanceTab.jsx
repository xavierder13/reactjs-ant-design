import { useMemo, useState } from "react";
import { Table, Button, Modal, Form, Select, InputNumber, Space, Tooltip, App } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";

import useAuth from "../../../../../hooks/useAuth";
import handleApiError from "../../../../../utils/handleApiError";
import keyPerformanceApi from "../../../../../services/employee/keyPerformanceApi";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
// Matches EmployeeKeyPerformanceController@store's own validation
// (`between:2020, <current year>`) exactly.
const ALL_YEARS = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => 2020 + i);
// Stable reference (not a fresh `[]` literal on every render) so the
// yearsPresent useMemo below doesn't invalidate every render when
// pendingRecords is undefined.
const EMPTY_RECORDS = [];

// Monthly Key Performance is NOT a single-row CRUD record like the other
// Performance Management sub-tabs — vueportal's own reference
// (MonthlyKeyPerformance.vue) manages it a whole YEAR at a time: "Add
// Period" creates all 12 months in one call, "Delete Period" removes all
// 12 rows for that year in one call, and only a row's `grade` is ever
// individually editable. See keyPerformanceApi.js for the confirmed
// backend contract.
//
// Create mode (2026-09-24): matches MonthlyKeyPerformance.vue's own
// savePeriod()/removePeriod()/saveItem() exactly — in create mode
// (editedIndex === -1 there), those methods only ever mutate the local
// `monthly_key_performances` array, never call an API; the whole array is
// bundled as JSON into EmployeeMasterDataController@store()'s
// `monthly_key_performances` field alongside the rest of the new
// employee, confirmed by reading store() directly. Ported the same way:
// pendingRecords/onPendingRecordsChange (lifted to EmployeeForm.jsx) take
// over from `records`/the API calls whenever mode === 'create'.
export default function MonthlyKeyPerformanceTab({ employeeId, mode, initialRecords, pendingRecords, onPendingRecordsChange }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const isCreateMode = mode === "create";
  const [records, setRecords] = useState(initialRecords || []);
  const [filterYear, setFilterYear] = useState("all");

  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [periodModalMode, setPeriodModalMode] = useState("add"); // 'add' | 'delete'
  const [periodSaving, setPeriodSaving] = useState(false);
  const [periodForm] = Form.useForm();

  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeForm] = Form.useForm();

  const readOnly = mode === "view";
  const canCreate = !readOnly && hasPermission("employee-master-data-key-performance-create");
  const canEdit = !readOnly && hasPermission("employee-master-data-key-performance-edit");
  const canDelete = !readOnly && hasPermission("employee-master-data-key-performance-delete");

  const displayedRecords = isCreateMode ? (pendingRecords || EMPTY_RECORDS) : records;

  const yearsPresent = useMemo(
    () => [...new Set(displayedRecords.map((r) => r.year))].sort(),
    [displayedRecords]
  );
  const yearsAvailableToAdd = useMemo(
    () => ALL_YEARS.filter((y) => !yearsPresent.includes(y)),
    [yearsPresent]
  );

  const filteredRecords = filterYear === "all" ? displayedRecords : displayedRecords.filter((r) => String(r.year) === String(filterYear));

  const openAddPeriod = () => {
    setPeriodModalMode("add");
    setPeriodModalOpen(true);
  };

  const openDeletePeriod = () => {
    setPeriodModalMode("delete");
    setPeriodModalOpen(true);
  };

  // Reset only after the Modal has actually opened, not in
  // openAddPeriod/openDeletePeriod above — this Modal has destroyOnHidden,
  // so its <Form> doesn't exist in the tree yet at the moment those
  // handlers run. Calling periodForm.resetFields() before that triggers
  // AntD's "Instance created by useForm is not connected to any Form
  // element" warning — confirmed live (reported against
  // WorkScheduleTab.jsx, same copy-pasted pattern here).
  const handlePeriodModalAfterOpenChange = (isOpen) => {
    if (isOpen) periodForm.resetFields();
  };

  const handlePeriodConfirm = async () => {
    let values;
    try {
      values = await periodForm.validateFields();
    } catch {
      return;
    }

    if (isCreateMode) {
      if (periodModalMode === "add") {
        const newRows = MONTHS.map((month) => ({ year: values.year, month, grade: null, id: `local-${values.year}-${month}` }));
        onPendingRecordsChange([...(pendingRecords || []), ...newRows]);
        messageApi.success("Period added.");
      } else {
        onPendingRecordsChange((pendingRecords || []).filter((r) => String(r.year) !== String(values.year)));
        messageApi.success("Period removed.");
      }
      setPeriodModalOpen(false);
      return;
    }

    setPeriodSaving(true);
    try {
      if (periodModalMode === "add") {
        const payload = {
          employee_id: employeeId,
          monthly_key_performances: MONTHS.map((month) => ({ year: values.year, month, grade: null })),
        };
        const { data } = await keyPerformanceApi.create(payload);
        if (data.success) {
          setRecords(data.performances);
          messageApi.success("Period added.");
          setPeriodModalOpen(false);
        } else {
          messageApi.error(Object.values(data)[0]?.[0] || "Failed to add period.");
        }
      } else {
        const { data } = await keyPerformanceApi.remove(employeeId, values.year);
        if (data.success) {
          setRecords(data.performances);
          messageApi.success("Period deleted.");
          setPeriodModalOpen(false);
        } else {
          messageApi.error(data.error || "Failed to delete period.");
        }
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setPeriodSaving(false);
    }
  };

  const openEditGrade = (record) => {
    setEditingRow(record);
    setGradeModalOpen(true);
  };

  // Same reasoning as handlePeriodModalAfterOpenChange above — this
  // Modal also has destroyOnHidden.
  const handleGradeModalAfterOpenChange = (isOpen) => {
    if (isOpen) gradeForm.setFieldsValue({ grade: editingRow?.grade });
  };

  const handleGradeSave = async () => {
    let values;
    try {
      values = await gradeForm.validateFields();
    } catch {
      return;
    }

    if (isCreateMode) {
      onPendingRecordsChange((pendingRecords || []).map((r) => (r.id === editingRow.id ? { ...r, grade: values.grade } : r)));
      messageApi.success("Grade updated.");
      setGradeModalOpen(false);
      return;
    }

    setGradeSaving(true);
    try {
      const { data } = await keyPerformanceApi.update(editingRow.id, { grade: values.grade });
      if (data.success) {
        setRecords(data.performances);
        messageApi.success("Grade updated.");
        setGradeModalOpen(false);
      } else {
        messageApi.error(Object.values(data)[0]?.[0] || "Failed to update grade.");
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setGradeSaving(false);
    }
  };

  const columns = [
    { title: "Year", dataIndex: "year", key: "year", width: 100 },
    { title: "Month", dataIndex: "month", key: "month" },
    { title: "Grade (%)", dataIndex: "grade", key: "grade", render: (v) => v ?? "-" },
    ...(canEdit ? [{
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_, record) => (
        <Tooltip title="Edit Grade">
          <Button icon={<EditOutlined />} size="small" color="green" variant="outlined" onClick={() => openEditGrade(record)} />
        </Tooltip>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Select
          value={filterYear}
          onChange={setFilterYear}
          style={{ width: 160 }}
          options={[{ label: "Show All", value: "all" }, ...yearsPresent.map((y) => ({ label: String(y), value: y }))]}
        />
        <Space>
          {canDelete && (
            <Button danger icon={<DeleteOutlined />} disabled={!displayedRecords.length} onClick={openDeletePeriod}>
              Delete Period
            </Button>
          )}
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} disabled={!yearsAvailableToAdd.length} onClick={openAddPeriod}>
              Add Period
            </Button>
          )}
        </Space>
      </div>

      <Table
        rowKey="id"
        size="small"
        dataSource={filteredRecords}
        columns={columns}
        pagination={false}
        scroll={{ x: "max-content" }}
      />

      <Modal
        keyboard={false}
        title={periodModalMode === "add" ? "Add Period" : "Delete Period"}
        open={periodModalOpen}
        onCancel={() => setPeriodModalOpen(false)}
        onOk={handlePeriodConfirm}
        afterOpenChange={handlePeriodModalAfterOpenChange}
        confirmLoading={periodSaving}
        okText={periodModalMode === "add" ? "Add" : "Delete"}
        okButtonProps={periodModalMode === "delete" ? { danger: true } : undefined}
        destroyOnHidden
      >
        <Form form={periodForm} layout="vertical">
          <Form.Item name="year" label="Period (Year)" rules={[{ required: true, message: "Please select a year." }]}>
            <Select
              placeholder="Select year"
              options={(periodModalMode === "add" ? yearsAvailableToAdd : yearsPresent).map((y) => ({ label: String(y), value: y }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        keyboard={false}
        title={`Edit Grade — ${editingRow?.month} ${editingRow?.year}`}
        open={gradeModalOpen}
        onCancel={() => setGradeModalOpen(false)}
        onOk={handleGradeSave}
        afterOpenChange={handleGradeModalAfterOpenChange}
        confirmLoading={gradeSaving}
        okText="Save"
        destroyOnHidden
      >
        <Form form={gradeForm} layout="vertical">
          <Form.Item
            name="grade"
            label="Grade (%)"
            rules={[{ type: "number", min: 0, max: 999999.99, message: "Enter a valid grade." }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} max={999999.99} step={0.01} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
