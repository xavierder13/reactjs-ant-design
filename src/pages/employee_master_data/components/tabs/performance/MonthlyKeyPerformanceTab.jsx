import { useMemo, useState } from "react";
import { Table, Button, Modal, Form, Select, InputNumber, Space, Tooltip, Empty, App } from "antd";
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

// Monthly Key Performance is NOT a single-row CRUD record like the other
// Performance Management sub-tabs — vueportal's own reference
// (MonthlyKeyPerformance.vue) manages it a whole YEAR at a time: "Add
// Period" creates all 12 months in one call, "Delete Period" removes all
// 12 rows for that year in one call, and only a row's `grade` is ever
// individually editable. See keyPerformanceApi.js for the confirmed
// backend contract.
export default function MonthlyKeyPerformanceTab({ employeeId, mode, initialRecords }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
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

  const yearsPresent = useMemo(
    () => [...new Set(records.map((r) => r.year))].sort(),
    [records]
  );
  const yearsAvailableToAdd = useMemo(
    () => ALL_YEARS.filter((y) => !yearsPresent.includes(y)),
    [yearsPresent]
  );

  const filteredRecords = filterYear === "all" ? records : records.filter((r) => String(r.year) === String(filterYear));

  if (mode === "create") {
    return <Empty description="Save the employee first before adding records here." style={{ padding: "24px 0" }} />;
  }

  const openAddPeriod = () => {
    setPeriodModalMode("add");
    periodForm.resetFields();
    setPeriodModalOpen(true);
  };

  const openDeletePeriod = () => {
    setPeriodModalMode("delete");
    periodForm.resetFields();
    setPeriodModalOpen(true);
  };

  const handlePeriodConfirm = async () => {
    let values;
    try {
      values = await periodForm.validateFields();
    } catch {
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
    gradeForm.setFieldsValue({ grade: record.grade });
    setGradeModalOpen(true);
  };

  const handleGradeSave = async () => {
    let values;
    try {
      values = await gradeForm.validateFields();
    } catch {
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
            <Button danger icon={<DeleteOutlined />} disabled={!records.length} onClick={openDeletePeriod}>
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
        title={periodModalMode === "add" ? "Add Period" : "Delete Period"}
        open={periodModalOpen}
        onCancel={() => setPeriodModalOpen(false)}
        onOk={handlePeriodConfirm}
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
        title={`Edit Grade — ${editingRow?.month} ${editingRow?.year}`}
        open={gradeModalOpen}
        onCancel={() => setGradeModalOpen(false)}
        onOk={handleGradeSave}
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
