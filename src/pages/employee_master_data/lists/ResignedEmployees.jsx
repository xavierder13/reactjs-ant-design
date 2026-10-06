import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card, Row, Col, Typography, Input, Space, Button, Breadcrumb, Table, Select, DatePicker,
  Tooltip, Popconfirm, Modal, Form, App,
} from "antd";
import { ReloadOutlined, SearchOutlined, ExportOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import employeeApi from "../../../services/employee/employeeApi";
import offboardingApi from "../../../services/employee/offboardingApi";
import handleApiError from "../../../utils/handleApiError";
import downloadBlobResponse from "../../../utils/downloadBlobResponse";
import { formatDate, DISPLAY_DATE_FORMAT } from "../../../utils/formatDate";
import ColumnSelector from "../components/ColumnSelector";
import OffboardingFormFields from "../components/tabs/offboarding/OffboardingFormFields";
import OffboardingFileSlot, { OffboardingFileSlots } from "../components/tabs/offboarding/OffboardingFileSlot";
import BranchFilter from "./BranchFilter";
import useListAccess from "./useListAccess";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 500];
const DATE_KEYS = ["date_created", "last_day_of_work", "resignation_date_filed", "resignation_date_received", "resignation_effectivity_date"];

// `title` must match the backend's resignedQuery() $table_fields names exactly
// — it maps them to real SQL expressions for the search.
const COLUMNS = [
  { title: "Employee Code", dataIndex: "employee_code", value: "employee_code" },
  { title: "Employee Name", dataIndex: "name", value: "name" },
  { title: "Branch", dataIndex: "branch", value: "branch" },
  { title: "Date Created", dataIndex: "date_created", value: "date_created" },
  { title: "Last Day of Work", dataIndex: "last_day_of_work", value: "last_day_of_work" },
  { title: "Resignation Date Filed", dataIndex: "resignation_date_filed", value: "resignation_date_filed" },
  { title: "Resignation File Receive Date", dataIndex: "resignation_date_received", value: "resignation_date_received" },
  { title: "Resignation Effectivity Date", dataIndex: "resignation_effectivity_date", value: "resignation_effectivity_date" },
  { title: "Reason of Resignation", dataIndex: "reason_of_resignation", value: "reason_of_resignation" },
].map((c) => (DATE_KEYS.includes(c.dataIndex) ? { ...c, render: (v) => formatDate(v) } : c));

const DATE_FIELD_OPTIONS = COLUMNS
  .filter((c) => DATE_KEYS.includes(c.dataIndex))
  .map((c) => ({ label: c.title, value: c.dataIndex }));

// The Resigned list — vueportal EmployeeResigned.vue. One row per employee
// (their latest offboarding record), filtered by a chosen offboarding date
// (default: Resignation Date Filed, 1st of the month → today, the same
// window as the "Resigned This Month" dashboard card). Rows are offboarding
// records, so Edit opens the offboarding form; saving or deleting one also
// re-syncs the employee's active/date_resigned server-side.
export default function ResignedEmployees() {
  const { message: messageApi } = App.useApp();
  const { can, canFilterByBranch } = useListAccess();
  const [form] = Form.useForm();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    search_branch: "",
    date_field_param: "resignation_date_filed",
    date_range: [dayjs().startOf("month"), dayjs()],
  });
  const [selectedColumns, setSelectedColumns] = useState(COLUMNS);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const canEdit = can("employee-master-data-offboarding-edit");
  const canDelete = can("employee-master-data-offboarding-delete");

  const buildPayload = useCallback(() => ({
    search: filters.search,
    search_branch: filters.search_branch,
    date_field_param: filters.date_field_param,
    date_from: filters.date_range?.[0]?.format("YYYY-MM-DD") || "",
    date_to: filters.date_range?.[1]?.format("YYYY-MM-DD") || "",
    table_headers: selectedColumns.map((c) => ({ text: c.title, value: c.value })),
  }), [filters, selectedColumns]);

  const loadPage = useCallback(async (page, pageSize) => {
    setLoading(true);
    try {
      const { data } = await employeeApi.getResigned({ ...buildPayload(), items_per_page: pageSize }, page);
      setRows(data.employees.data);
      setPagination({ current: data.employees.current_page, pageSize: Number(data.employees.per_page), total: data.employees.total });
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  }, [buildPayload, messageApi]);

  useEffect(() => {
    const load = async () => { await loadPage(1, pagination.pageSize); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedColumns]);

  const refresh = () => loadPage(pagination.current, pagination.pageSize);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const handleExport = async () => {
    if (!pagination.total) {
      messageApi.warning("No record found.");
      return;
    }
    setExporting(true);
    try {
      const response = await employeeApi.exportResigned(buildPayload());
      if (await downloadBlobResponse(response, "Employee_Resigned.xls", messageApi)) {
        messageApi.success("Export downloaded.");
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (record) => {
    setDeletingId(record.id);
    try {
      const { data } = await offboardingApi.remove(record.id);
      if (data.error) {
        messageApi.error(data.error);
        return;
      }
      messageApi.success("Offboarding record deleted.");
      await refresh();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setDeletingId(null);
    }
  };

  const closeModal = () => {
    setEditing(null);
    setPendingFiles({});
  };

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen || !editing) return;
    const toDay = (v) => (v && !String(v).startsWith("0000") ? dayjs(v) : null);
    form.setFieldsValue({
      last_day_of_work: toDay(editing.last_day_of_work),
      reason_of_resignation: editing.reason_of_resignation || undefined,
      resignation_date_filed: toDay(editing.resignation_date_filed),
      resignation_date_received: toDay(editing.resignation_date_received),
      resignation_effectivity_date: toDay(editing.resignation_effectivity_date),
      coe_is_issued: Boolean(editing.coe_is_issued),
      last_pay_is_issued: Boolean(editing.last_pay_is_issued),
      compliance: editing.compliance || undefined,
    });
  };

  // A file deleted inside the modal comes back as the employee's full
  // offboarding list — keep the open record in step so its slot empties.
  const handleFileDeleted = (offboardings) => {
    const fresh = offboardings?.find((o) => o.id === editing?.id);
    if (fresh) setEditing((prev) => ({ ...prev, ...fresh }));
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const formData = new FormData();
    formData.append("employee_id", editing.employee_id);
    formData.append("last_day_of_work", values.last_day_of_work.format("YYYY-MM-DD"));
    if (values.reason_of_resignation) formData.append("reason_of_resignation", values.reason_of_resignation);
    ["resignation_date_filed", "resignation_date_received", "resignation_effectivity_date"].forEach((key) => {
      if (values[key]) formData.append(key, values[key].format("YYYY-MM-DD"));
    });
    formData.append("coe_is_issued", values.coe_is_issued ? "1" : "0");
    formData.append("last_pay_is_issued", values.last_pay_is_issued ? "1" : "0");
    if (values.compliance) formData.append("compliance", values.compliance);
    Object.entries(pendingFiles).forEach(([key, file]) => { if (file) formData.append(key, file); });

    setSaving(true);
    try {
      const { data } = await offboardingApi.update(editing.id, formData);
      if (data.success) {
        messageApi.success("Offboarding record updated.");
        closeModal();
        await refresh();
      } else {
        const [field, fieldErrors] = Object.entries(data || {})[0] || [];
        if (field && field !== "error") {
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

  const columns = [
    ...selectedColumns.map(({ title, dataIndex, render }) => ({ title, dataIndex, render, key: dataIndex })),
    ...(canEdit || canDelete ? [{
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 90,
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Tooltip title="Edit Offboarding">
              <Button color="green" variant="outlined" icon={<EditOutlined />} size="small" onClick={() => setEditing(record)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Delete this offboarding record?"
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

  const fileSlot = (label, documentType) => (
    <OffboardingFileSlot
      label={label}
      documentType={documentType}
      record={editing}
      pendingFile={pendingFiles[documentType]}
      onPendingFileChange={(file) => setPendingFiles((p) => ({ ...p, [documentType]: file }))}
      canDownload={can("employee-master-data-offboarding-file-download")}
      canDeleteFile={can("employee-master-data-offboarding-file-delete")}
      onFileDeleted={handleFileDeleted}
    />
  );

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: <Link to="/employees">Employee Master Data</Link> },
          { title: "Resigned" },
        ]}
      />
      <Card
        title={
          <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
            <Col flex="none">
              <Typography.Title level={4} style={{ margin: 0 }}>Resigned</Typography.Title>
            </Col>
            <Col flex="none">
              <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={refresh} disabled={loading}>Refresh</Button>
                {can("employee-master-data-export") && (
                  <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>Export</Button>
                )}
              </Space>
            </Col>
          </Row>
        }
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <Space.Compact style={{ minWidth: 260 }}>
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => setFilter("search", searchInput)}
              allowClear
            />
            <Button icon={<SearchOutlined />} onClick={() => setFilter("search", searchInput)}>Search</Button>
          </Space.Compact>
          {canFilterByBranch && (
            <BranchFilter value={filters.search_branch} onChange={(v) => setFilter("search_branch", v)} />
          )}
          <Select
            value={filters.date_field_param}
            onChange={(v) => setFilter("date_field_param", v)}
            options={DATE_FIELD_OPTIONS}
            style={{ width: 240 }}
          />
          <DatePicker.RangePicker
            value={filters.date_range}
            onChange={(range) => setFilter("date_range", range)}
            format={DISPLAY_DATE_FORMAT}
            allowEmpty={[true, true]}
          />
        </Space>
        <div style={{ marginBottom: 16 }}>
          <ColumnSelector headers={COLUMNS} selectedHeaders={selectedColumns} onChange={setSelectedColumns} maxColumns={COLUMNS.length} />
        </div>

        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: "max-content" }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (total, [from, to]) => `${from}-${to} of ${total}`,
            onChange: (page, pageSize) => loadPage(page, pageSize),
          }}
        />
      </Card>

      <Modal
        title={editing ? `${editing.employee_code ? `${editing.employee_code} - ` : ""}${editing.name || ""}` : ""}
        open={Boolean(editing)}
        onCancel={closeModal}
        onOk={handleSave}
        afterOpenChange={handleAfterOpenChange}
        confirmLoading={saving}
        okText="Save"
        width={880}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <OffboardingFormFields />
          {editing && (
            <OffboardingFileSlots>
              {fileSlot("Last Day File", "last_day_file")}
              {fileSlot("Clearance File", "clearance_file")}
              {fileSlot("Quitclaim File", "quitclaim_file")}
            </OffboardingFileSlots>
          )}
        </Form>
      </Modal>
    </>
  );
}
