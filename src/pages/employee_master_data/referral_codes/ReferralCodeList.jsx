import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Row, Col, Typography, Input, Space, Button, Breadcrumb, Table, Select, Tag, Tooltip, Alert, App } from "antd";
import { ReloadOutlined, SearchOutlined, EyeOutlined, ExportOutlined } from "@ant-design/icons";

import employeeReferralApi from "../../../services/employee/employeeReferralApi";
import handleApiError from "../../../utils/handleApiError";
import { isActiveValue } from "../../../utils/employeeStatus";
import { buildReferralLink, copyText } from "../../../utils/referralLink";
import useAuth from "../../../hooks/useAuth";
import ReferralApplicantsModal from "./ReferralApplicantsModal";
import RecordLink from "../../../components/RecordLink";
import useTableColumns from '../../../hooks/useTableColumns';
import { fetchAllPages, saveReferralWorkbook } from "./referralExport";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 500];
const STATUS_OPTIONS = [
  { label: "All Employees", value: "" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];
const CODE_STATUS_OPTIONS = [
  { label: "All Codes", value: "" },
  { label: "Code Active", value: "Active" },
  { label: "Code Inactive", value: "Inactive" },
  { label: "No Code", value: "None" },
];
const REFERRAL_OPTIONS = [
  { label: "All Referrals", value: "" },
  { label: "With Referrals", value: "1" },
];

const fullName = (r) => [`${r.last_name || ""},`, r.first_name, r.middle_name].filter(Boolean).join(" ");

// Referral Codes — every employee with their referral code and careers-portal
// referral link, copyable straight from the row. The portal only honours a
// code whose is_active is true, so each code shows that status; employees
// with no code yet show "No code" (Human Resource → Sync & Updates →
// Generate Referral Codes creates them). With employee-referral-view-referrals
// the list also counts each code's referred applicants (careers portal, any
// stage), can show only codes with referrals, and opens View Referrals.
export default function ReferralCodeList() {
  const { message: messageApi } = App.useApp();
  const { hasRole, hasPermission } = useAuth();
  const canViewReferrals = hasRole("Administrator") || hasPermission("employee-referral-view-referrals");
  const canOpenEmployee = hasRole("Administrator") || hasPermission("employee-master-data-list");

  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "Active", code_status: "", branch_id: null, has_referrals: "" });
  const [referralsError, setReferralsError] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [exporting, setExporting] = useState(false);

  const payloadOf = useCallback((pageSize) => ({
    search: filters.search,
    status: filters.status || undefined,
    code_status: filters.code_status || undefined,
    branch_id: filters.branch_id || undefined,
    has_referrals: (canViewReferrals && filters.has_referrals) || undefined,
    items_per_page: pageSize,
  }), [filters, canViewReferrals]);

  const loadPage = useCallback(async (page, pageSize) => {
    setLoading(true);
    try {
      const { data } = await employeeReferralApi.getAll(payloadOf(pageSize), page);
      setRows(data.employees.data);
      setBranches(data.branches || []);
      setReferralsError(data.referrals_error || null);
      setPagination({ current: data.employees.current_page, pageSize: Number(data.employees.per_page), total: data.employees.total });
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  }, [payloadOf, messageApi]);

  useEffect(() => {
    const load = async () => { await loadPage(1, pagination.pageSize); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const refresh = () => loadPage(pagination.current, pagination.pageSize);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  // Export: every employee the filters match (not just this page)
  const handleExport = async () => {
    setExporting(true);
    try {
      let countsFailed = false;
      const all = await fetchAllPages(async (page, perPage) => {
        const { data } = await employeeReferralApi.getAll(payloadOf(perPage), page);
        countsFailed = countsFailed || Boolean(data.referrals_error);
        return data.employees;
      });
      if (!all.length) { messageApi.info("No employees to export."); return; }
      saveReferralWorkbook("Referral Codes", [{
        name: "Referral Codes",
        rows: all,
        columns: [
          ["Emp. Code", (r) => r.employee_code],
          ["Employee Name", fullName],
          ["Branch", (r) => r.branch],
          ["Position", (r) => r.position],
          ["Status", (r) => (isActiveValue(r.active) ? "Active" : "Inactive")],
          ["Referral Code", (r) => r.referral_code || "No code"],
          ["Code Status", (r) => (r.referral_code ? (Number(r.referral_is_active) ? "Active" : "Inactive") : "")],
          ["Referral Link", (r) => (r.referral_code ? buildReferralLink(r.referral_code) : "")],
          ...(canViewReferrals && !countsFailed ? [["Referrals", (r) => Number(r.referral_count || 0)]] : []),
        ],
      }]);
      if (canViewReferrals && countsFailed) messageApi.warning("Exported without the Referrals counts — the careers portal didn't answer.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setExporting(false);
    }
  };

  const copyLink = (code) => {
    copyText(buildReferralLink(code))
      .then(() => messageApi.success("Referral link copied!"))
      .catch(() => messageApi.error("Could not copy link."));
  };

  const columns = [
    { title: "Emp. Code", dataIndex: "employee_code", key: "employee_code" },
    {
      title: "Employee Name", key: "name",
      render: (_, r) => (
        <RecordLink to={canOpenEmployee ? `/employees/${r.id}` : undefined} state={{ returnTo: "/employees/referral-codes" }} title="Open employee record">
          {fullName(r)}
        </RecordLink>
      ),
    },
    { title: "Branch", dataIndex: "branch", key: "branch", render: (v) => v || "-" },
    { title: "Position", dataIndex: "position", key: "position", render: (v) => v || "-" },
    {
      title: "Status",
      dataIndex: "active",
      key: "active",
      render: (v) => (isActiveValue(v) ? <Tag color="success">Active</Tag> : <Tag>Inactive</Tag>),
    },
    {
      title: "Referral Code",
      dataIndex: "referral_code",
      key: "referral_code",
      render: (code, r) => (code ? (
        <Space size={6}>
          <Typography.Text strong copyable={{ text: code, tooltips: ["Copy code", "Copied"] }}>{code}</Typography.Text>
          {!Number(r.referral_is_active) && (
            <Tooltip title="The careers portal won't accept this code until it is reactivated.">
              <Tag color="warning">Inactive</Tag>
            </Tooltip>
          )}
        </Space>
      ) : <Typography.Text type="secondary">No code</Typography.Text>),
    },
    {
      title: "Referral Link",
      key: "referral_link",
      render: (_, r) => (r.referral_code ? (
        <Space size={6}>
          <Typography.Text type="secondary" style={{ maxWidth: 280 }} ellipsis={{ tooltip: buildReferralLink(r.referral_code) }}>
            {buildReferralLink(r.referral_code)}
          </Typography.Text>
          <Button size="small" onClick={() => copyLink(r.referral_code)}>Copy link</Button>
        </Space>
      ) : "-"),
    },
    ...(canViewReferrals ? [
      {
        title: "Referrals",
        dataIndex: "referral_count",
        key: "referral_count",
        align: "center",
        render: (v) => (referralsError ? "-" : (Number(v) ? <Tag color="blue">{Number(v).toLocaleString()}</Tag> : <Typography.Text type="secondary">0</Typography.Text>)),
      },
      {
        title: "Action",
        key: "action",
        align: "center",
        render: (_, r) => (r.referral_code ? (
          <Tooltip title="View Referrals">
            <Button size="small" color="blue" variant="outlined" icon={<EyeOutlined />} onClick={() => setViewing(r)} />
          </Tooltip>
        ) : null),
      },
    ] : []),
  ];
  const { columns: shownColumns, chooser } = useTableColumns('table:employee_master_data/referral_codes/ReferralCodeList', columns);

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: "Employee" },
          { title: "Referral Codes" },
        ]}
      />
      <Card
        title={
          <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
            <Col flex="none">
              <Typography.Title level={4} style={{ margin: 0 }}>Referral Codes</Typography.Title>
            </Col>
            <Col flex="none">
              <Space wrap>
                <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting} disabled={loading}>Export</Button>
                {chooser}
                <Button icon={<ReloadOutlined />} onClick={refresh} disabled={loading}>Refresh</Button>
              </Space>
            </Col>
          </Row>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Space.Compact style={{ minWidth: 260 }}>
            <Input
              placeholder="Search name, code or referral code..."
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
          <Select value={filters.code_status} onChange={(v) => setFilter("code_status", v)} options={CODE_STATUS_OPTIONS} style={{ width: 150 }} />
          <Select
            value={filters.branch_id ?? undefined}
            onChange={(v) => setFilter("branch_id", v ?? null)}
            placeholder="All Branches"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={branches.map((b) => ({ label: b.name, value: b.id }))}
          />
          {canViewReferrals && (
            <Select value={filters.has_referrals} onChange={(v) => setFilter("has_referrals", v)} options={REFERRAL_OPTIONS} style={{ width: 150 }} />
          )}
        </Space>

        {canViewReferrals && referralsError && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }} title={`Referral counts are unavailable: ${referralsError}`} />
        )}

        <Table
          rowKey="id"
          size="small"
          columns={shownColumns}
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

      <ReferralApplicantsModal employee={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
