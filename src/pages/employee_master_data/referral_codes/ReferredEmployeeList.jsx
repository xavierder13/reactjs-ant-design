import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Card, Row, Col, Typography, Input, Space, Button, Breadcrumb, Table, Select, Tag, Segmented, DatePicker, App } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";

import employeeReferralApi from "../../../services/employee/employeeReferralApi";
import handleApiError from "../../../utils/handleApiError";
import useAuth from "../../../hooks/useAuth";
import ExpandIcon from "../../../components/ExpandIcon";
import RecordLink from "../../../components/RecordLink";
import { isActiveValue } from "../../../utils/employeeStatus";
import { DISPLAY_DATE_FORMAT, formatDate } from "../../../utils/formatDate";
import { isInnerControl } from "./referralHelpers";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];
const RETURN_STATE = { returnTo: "/employees/referred-employees" };
const STATUS_OPTIONS = [
  { label: "All Employees", value: "" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];
const name = (last, first, middle) => [`${last || ""},`, first, middle].filter(Boolean).join(" ");
const employeeName = (r) => name(r.last_name, r.first_name, r.middle_name);
const referrerName = (r) => name(r.referrer_last_name, r.referrer_first_name, r.referrer_middle_name);
const statusTag = (active) => (isActiveValue(active) ? <Tag color="success">Active</Tag> : <Tag>Inactive</Tag>);

// Referred Employees — employees hired through a referral (Employee Master
// Data `referred_by_code` / `referred_by_employee_id`, stored by the New
// Hired sync; past hires via Sync & Updates → Sync Referred Employees). Not
// the careers portal: Referred Applicants covers the pipeline. Server-side
// paginated and filtered; By Referrer counts each referrer's referred
// employees (active / regular) and expands to them.
export default function ReferredEmployeeList() {
  const { message: messageApi } = App.useApp();
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const canOpenEmployee = hasRole("Administrator") || hasPermission("employee-master-data-list");

  const [view, setView] = useState("referrer");
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({ branches: [], employment_types: [] });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "", branch_id: null, employment_type: null, dates: null });
  const [expandedKeys, setExpandedKeys] = useState([]);

  const payloadOf = useCallback((extra = {}) => ({
    search: filters.search,
    status: filters.status || undefined,
    branch_id: filters.branch_id || undefined,
    employment_type: filters.employment_type || undefined,
    date_from: filters.dates?.[0]?.format("YYYY-MM-DD"),
    date_to: filters.dates?.[1]?.format("YYYY-MM-DD"),
    ...extra,
  }), [filters]);

  const loadPage = useCallback(async (page, pageSize) => {
    setLoading(true);
    try {
      const { data } = await employeeReferralApi.getReferredEmployees(payloadOf({ view, items_per_page: pageSize }), page);
      setRows(data.rows.data);
      setExpandedKeys([]);
      setLookups({ branches: data.branches || [], employment_types: data.employment_types || [] });
      setPagination({ current: data.rows.current_page, pageSize: Number(data.rows.per_page), total: data.rows.total });
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  }, [payloadOf, view, messageApi]);

  useEffect(() => {
    const load = async () => { await loadPage(1, pagination.pageSize); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, view]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const refresh = () => loadPage(pagination.current, pagination.pageSize);
  const openEmployee = (id) => navigate(`/employees/${id}`, { state: RETURN_STATE });
  const employeeRowProps = (r) => ({
    onClick: (e) => { if (canOpenEmployee && !isInnerControl(e)) openEmployee(r.id); },
    className: canOpenEmployee ? "record-row--clickable" : undefined,
  });

  const referrerCell = (r, id) => (id ? (
    <Space orientation="vertical" size={0}>
      <RecordLink to={canOpenEmployee ? `/employees/${id}` : undefined} state={RETURN_STATE} title="Open the referrer's employee record">
        {referrerName(r)}
      </RecordLink>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {r.referrer_employee_code}{r.referrer_branch ? ` · ${r.referrer_branch}` : ""}{!isActiveValue(r.referrer_active) && " · Inactive employee"}
      </Typography.Text>
    </Space>
  ) : <Typography.Text type="warning">No employee owns this code</Typography.Text>);

  const employeeColumns = (withReferrer) => [
    {
      title: "Emp. Code", dataIndex: "employee_code", key: "employee_code",
      render: (v, r) => <RecordLink to={canOpenEmployee ? `/employees/${r.id}` : undefined} state={RETURN_STATE} title="Open employee record">{v}</RecordLink>,
    },
    { title: "Employee Name", key: "name", render: (_, r) => employeeName(r) },
    { title: "Branch", dataIndex: "branch", key: "branch", render: (v) => v || "-" },
    { title: "Position", dataIndex: "position", key: "position", render: (v) => v || "-" },
    { title: "Employment Type", dataIndex: "employment_type", key: "employment_type", render: (v) => v || "-" },
    { title: "Date Employed", dataIndex: "date_employed", key: "date_employed", render: (v) => formatDate(v) },
    { title: "Status", dataIndex: "active", key: "active", render: statusTag },
    ...(withReferrer ? [
      { title: "Referred By", key: "referrer", render: (_, r) => referrerCell(r, r.referred_by_employee_id) },
      { title: "Referral Code", dataIndex: "referred_by_code", key: "referred_by_code", render: (v) => String(v || "").trim().toUpperCase() },
    ] : []),
  ];

  const groupColumns = [
    { title: "Referrer", key: "referrer", render: (_, g) => referrerCell(g, g.referrer_id) },
    { title: "Referral Code", dataIndex: "referred_by_code", key: "referred_by_code", render: (v) => <Typography.Text strong>{v}</Typography.Text> },
    { title: "Position", dataIndex: "referrer_position", key: "referrer_position", render: (v) => v || "-" },
    { title: "Referred Employees", dataIndex: "total", key: "total", align: "center", render: (v) => <Tag color="blue">{Number(v).toLocaleString()}</Tag> },
    { title: "Still Active", dataIndex: "active_count", key: "active_count", align: "center", render: (v) => <Tag color="success">{Number(v).toLocaleString()}</Tag> },
    { title: "Regular", dataIndex: "regular_count", key: "regular_count", align: "center", render: (v) => (Number(v) ? <Tag color="green">{Number(v).toLocaleString()}</Tag> : <Typography.Text type="secondary">0</Typography.Text>) },
  ];

  const toggleGroup = (key) => setExpandedKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  const tablePagination = {
    ...pagination,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    showTotal: (total, [from, to]) => `${from}-${to} of ${total}`,
    onChange: (page, pageSize) => loadPage(page, pageSize),
  };

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: "Employee" },
          { title: "Referred Employees" },
        ]}
      />
      <Card
        title={
          <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
            <Col flex="none">
              <Typography.Title level={4} style={{ margin: 0 }}>Referred Employees</Typography.Title>
            </Col>
            <Col flex="none">
              <Button icon={<ReloadOutlined />} onClick={refresh} disabled={loading}>Refresh</Button>
            </Col>
          </Row>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Segmented
            value={view}
            onChange={setView}
            options={[{ label: "By Referrer", value: "referrer" }, { label: "All Employees", value: "employee" }]}
          />
          <Space.Compact style={{ minWidth: 260 }}>
            <Input
              placeholder="Search employee, referrer or code..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value) setFilter("search", "");
              }}
              onPressEnter={() => setFilter("search", searchInput)}
              allowClear
            />
            <Button icon={<SearchOutlined />} onClick={() => setFilter("search", searchInput)}>Search</Button>
          </Space.Compact>
          <Select value={filters.status} onChange={(v) => setFilter("status", v)} options={STATUS_OPTIONS} style={{ width: 150 }} />
          <Select
            value={filters.branch_id ?? undefined}
            onChange={(v) => setFilter("branch_id", v ?? null)}
            placeholder="All Branches"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={lookups.branches.map((b) => ({ label: b.name, value: b.id }))}
          />
          <Select
            value={filters.employment_type ?? undefined}
            onChange={(v) => setFilter("employment_type", v ?? null)}
            placeholder="Employment Type"
            allowClear
            style={{ width: 170 }}
            options={lookups.employment_types.map((t) => ({ label: t, value: t }))}
          />
          <DatePicker.RangePicker
            format={DISPLAY_DATE_FORMAT}
            placeholder={["Employed from", "Employed to"]}
            value={filters.dates}
            onChange={(v) => setFilter("dates", v && v[0] && v[1] ? [dayjs(v[0]), dayjs(v[1])] : null)}
          />
        </Space>

        {view === "referrer" ? (
          <Table
            rowKey="group_key"
            size="small"
            columns={groupColumns}
            dataSource={rows}
            loading={loading}
            scroll={{ x: "max-content" }}
            pagination={tablePagination}
            onRow={(g) => ({ onClick: (e) => { if (!isInnerControl(e)) toggleGroup(g.group_key); }, className: "record-row--clickable" })}
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpandedRowsChange: (keys) => setExpandedKeys([...keys]),
              expandIcon: (props) => <ExpandIcon {...props} />,
              expandedRowRender: (g) => (
                <GroupEmployees
                  groupKey={g.group_key}
                  payload={payloadOf({ group_key: g.group_key })}
                  columns={employeeColumns(false)}
                  rowProps={employeeRowProps}
                />
              ),
            }}
            locale={{ emptyText: loading ? " " : "No referred employees." }}
          />
        ) : (
          <Table
            rowKey="id"
            size="small"
            columns={employeeColumns(true)}
            dataSource={rows}
            loading={loading}
            scroll={{ x: "max-content" }}
            pagination={tablePagination}
            onRow={employeeRowProps}
            locale={{ emptyText: loading ? " " : "No referred employees." }}
          />
        )}
      </Card>
    </>
  );
}

// One referrer's employees (expanded row), loaded and paginated on its own.
function GroupEmployees({ groupKey, payload, columns, rowProps }) {
  const { message: messageApi } = App.useApp();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);

  const loadPage = async (page, pageSize) => {
    setLoading(true);
    try {
      const { data } = await employeeReferralApi.getReferredEmployees({ ...payload, view: "employee", items_per_page: pageSize }, page);
      setRows(data.rows.data);
      setPagination({ current: data.rows.current_page, pageSize: Number(data.rows.per_page), total: data.rows.total });
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await loadPage(1, 10); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);

  return (
    <Table
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={rows}
      loading={loading}
      scroll={{ x: "max-content" }}
      onRow={rowProps}
      pagination={pagination.total > pagination.pageSize ? {
        ...pagination,
        onChange: (page, pageSize) => loadPage(page, pageSize),
      } : false}
    />
  );
}
