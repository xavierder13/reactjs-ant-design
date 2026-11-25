import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Row, Col, Typography, Input, Space, Button, Breadcrumb, Table, Select, Tag, Segmented, App } from "antd";
import { ExportOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

import employeeReferralApi from "../../../services/employee/employeeReferralApi";
import handleApiError from "../../../utils/handleApiError";
import useAuth from "../../../hooks/useAuth";
import ExpandIcon from "../../../components/ExpandIcon";
import RecordLink from "../../../components/RecordLink";
import ApplicantDrawer from "../../recruitment/applicants/ApplicantDrawer";
import EmployeeRecordCell from "./EmployeeRecordCell";
import { APPLICANT_LIST_PERMISSIONS, isInnerControl, lookupMaps } from "./referralHelpers";
import { isActiveValue } from "../../../utils/employeeStatus";
import { STAGE_FILTERS, matchesStage, progressTagProps, isoFromDisplay } from "../../recruitment/applicants/applicantStatus";
import useTableColumns from "../../../hooks/useTableColumns";
import { saveReferralWorkbook } from "./referralExport";

const show = (v) => (v === null || v === undefined || v === "" ? "-" : v);
const textSorter = (key) => (a, b) => String(a[key] || "").localeCompare(String(b[key] || ""));
const dateSorter = (key) => (a, b) => isoFromDisplay(a[key]).localeCompare(isoFromDisplay(b[key]));
const fullName = (r) => (r ? [`${r.last_name || ""},`, r.first_name, r.middle_name].filter(Boolean).join(" ") : "");
const codeKey = (code) => String(code || "").trim().toUpperCase();
const isHired = (row) => matchesStage(row, "Hired");
const RETURN_STATE = { returnTo: "/employees/referred-applicants" };

// Referred Applicants — every careers-portal applicant (any stage) who
// entered a referral code, with the employee who owns that code. Grouped by
// referrer (expand for their applicants) or as one list; the stage filter is
// the All Applicants page's. A code no employee owns shows as "No employee
// owns this code". Read live from the portal (scoped like All Applicants).
// Name links (RecordLink) drill down: applicant → the recruitment
// ApplicantDrawer, referrer / synced hire → their employee profile; a click
// on an applicant row opens the drawer, on a referrer row expands it.
export default function ReferredApplicantList() {
  const { message: messageApi } = App.useApp();
  const navigate = useNavigate();
  const { hasRole, hasPermission, hasAnyPermission } = useAuth();
  const isAdmin = hasRole("Administrator");
  const canOpenEmployee = isAdmin || hasPermission("employee-master-data-list");
  const canOpenApplicant = isAdmin || hasAnyPermission(...APPLICANT_LIST_PERMISSIONS);

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("referrer");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState();
  const [branch, setBranch] = useState();
  const [names, setNames] = useState({ branches: {}, positions: {} });
  const [viewingId, setViewingId] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await employeeReferralApi.getReferred();
      setApplicants(data.applicants || []);
      setNames(lookupMaps(data));
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => { await load(); };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // search + branch first, so the stage counts follow them (All Applicants does the same)
  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applicants.filter((r) => (!branch || r.branch_name === branch)
      && (!term || [r.name, r.referral_code, fullName(r.referrer), r.referrer?.employee_code]
        .some((v) => String(v || "").toLowerCase().includes(term))));
  }, [applicants, search, branch]);

  const stageCounts = useMemo(
    () => Object.fromEntries(STAGE_FILTERS.map((s) => [s, searched.filter((r) => matchesStage(r, s)).length])),
    [searched],
  );
  const rows = useMemo(() => searched.filter((r) => matchesStage(r, stage)), [searched, stage]);

  const groups = useMemo(() => {
    const byCode = new Map();
    rows.forEach((r) => {
      const key = codeKey(r.referral_code);
      if (!byCode.has(key)) byCode.set(key, { key, referral_code: r.referrer?.referral_code || r.referral_code, referrer: r.referrer, applicants: [] });
      byCode.get(key).applicants.push(r);
    });
    return [...byCode.values()]
      .map((g) => ({ ...g, total: g.applicants.length, hired: g.applicants.filter(isHired).length }))
      .sort((a, b) => b.total - a.total || fullName(a.referrer).localeCompare(fullName(b.referrer)));
  }, [rows]);

  const branchOptions = useMemo(
    () => [...new Set(applicants.map((r) => r.branch_name).filter(Boolean))].sort().map((b) => ({ value: b, label: b })),
    [applicants],
  );

  // a status / hiring change saved in the drawer updates its row here
  const handleApplicantChange = (id, row) => {
    if (row) setApplicants((prev) => prev.map((r) => (r.id === id ? { ...r, ...row } : r)));
  };

  const employeePath = (id) => `/employees/${id}`;

  const referrerCell = (referrer) => (referrer ? (
    <Space orientation="vertical" size={0}>
      <RecordLink
        to={canOpenEmployee ? employeePath(referrer.id) : undefined}
        state={RETURN_STATE}
        title="Open the referrer's employee record"
      >
        {fullName(referrer)}
      </RecordLink>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {referrer.employee_code}{!isActiveValue(referrer.active) && " · Inactive employee"}
      </Typography.Text>
    </Space>
  ) : <Typography.Text type="warning">No employee owns this code</Typography.Text>);

  const openApplicantRow = (row) => {
    if (canOpenApplicant) setViewingId(row.id);
    else if (row.employee_id && canOpenEmployee) navigate(employeePath(row.employee_id), { state: RETURN_STATE });
  };
  const applicantRowProps = (row) => ({
    onClick: (e) => { if (!isInnerControl(e)) openApplicantRow(row); },
    className: canOpenApplicant || (row.employee_id && canOpenEmployee) ? "record-row--clickable" : undefined,
  });
  const toggleGroup = (key) => setExpandedKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));

  const applicantColumns = (withReferrer) => [
    {
      title: "Full Name", dataIndex: "name", sorter: textSorter("name"),
      render: (v, r) => (
        <RecordLink onClick={canOpenApplicant ? () => setViewingId(r.id) : undefined} title="Open applicant details">
          {v}
        </RecordLink>
      ),
    },
    ...(withReferrer ? [
      { title: "Referred By", key: "referrer", sorter: (a, b) => fullName(a.referrer).localeCompare(fullName(b.referrer)), render: (_, r) => referrerCell(r.referrer) },
      { title: "Referral Code", dataIndex: "referral_code", sorter: textSorter("referral_code"), render: (v) => <Typography.Text>{codeKey(v)}</Typography.Text> },
    ] : []),
    { title: "Position Applied", dataIndex: "position_name", sorter: textSorter("position_name"), render: show },
    { title: "Branch Applied", dataIndex: "branch_name", sorter: textSorter("branch_name"), render: show },
    { title: "Date Submitted", dataIndex: "created_at", sorter: dateSorter("created_at"), defaultSortOrder: withReferrer ? "descend" : undefined, render: show },
    { title: "Contract Signed", dataIndex: "signing_of_contract_date", sorter: dateSorter("signing_of_contract_date"), render: show },
    {
      title: "Status", dataIndex: "progress_status", sorter: textSorter("progress_status"),
      render: (v, row) => (v ? <Tag {...progressTagProps(row)}>{v}</Tag> : "-"),
    },
    {
      title: "Employee Record", key: "employee_code", sorter: textSorter("employee_code"),
      render: (_, r) => <EmployeeRecordCell applicant={r} canOpen={canOpenEmployee} returnTo={RETURN_STATE.returnTo} />,
    },
  ];

  const groupColumns = [
    { title: "Referrer", key: "referrer", sorter: (a, b) => fullName(a.referrer).localeCompare(fullName(b.referrer)), render: (_, g) => referrerCell(g.referrer) },
    { title: "Referral Code", dataIndex: "referral_code", render: (v) => <Typography.Text strong>{codeKey(v)}</Typography.Text> },
    { title: "Branch", key: "branch", render: (_, g) => show(g.referrer?.branch) },
    { title: "Position", key: "position", render: (_, g) => show(g.referrer?.position) },
    { title: "Referrals", dataIndex: "total", align: "center", sorter: (a, b) => a.total - b.total, render: (v) => <Tag color="blue">{v.toLocaleString()}</Tag> },
    { title: "Hired", dataIndex: "hired", align: "center", sorter: (a, b) => a.hired - b.hired, render: (v) => (v ? <Tag color="success">{v.toLocaleString()}</Tag> : <Typography.Text type="secondary">0</Typography.Text>) },
  ];
  const groupTable = useTableColumns("table:employee_master_data/referral_codes/ReferredApplicantList:referrer", groupColumns);
  const flatTable = useTableColumns("table:employee_master_data/referral_codes/ReferredApplicantList:all", applicantColumns(true));

  // Export: the filtered applicants (search, stage, branch) — By Referrer and every applicant
  const plainReferrer = (r) => (r ? fullName(r) : "No employee owns this code");
  const handleExport = () => {
    if (!rows.length) { messageApi.info("No referred applicants to export."); return; }
    saveReferralWorkbook("Referred Applicants", [
      {
        name: "By Referrer",
        rows: groups,
        columns: [
          ["Referrer", (g) => plainReferrer(g.referrer)],
          ["Employee Code", (g) => g.referrer?.employee_code],
          ["Referrer Status", (g) => (g.referrer ? (isActiveValue(g.referrer.active) ? "Active" : "Inactive") : "")],
          ["Referral Code", (g) => codeKey(g.referral_code)],
          ["Branch", (g) => g.referrer?.branch],
          ["Position", (g) => g.referrer?.position],
          ["Referrals", (g) => g.total],
          ["Hired", (g) => g.hired],
        ],
      },
      {
        name: "Applicants",
        rows,
        columns: [
          ["Full Name", (r) => r.name],
          ["Referred By", (r) => plainReferrer(r.referrer)],
          ["Referrer Employee Code", (r) => r.referrer?.employee_code],
          ["Referral Code", (r) => codeKey(r.referral_code)],
          ["Position Applied", (r) => r.position_name],
          ["Branch Applied", (r) => r.branch_name],
          ["Date Submitted", (r) => r.created_at],
          ["Contract Signed", (r) => r.signing_of_contract_date],
          ["Status", (r) => r.progress_status],
          ["Employee Record", (r) => r.employee_code || (isHired(r) ? "Not synced yet" : "")],
        ],
      },
    ]);
  };

  const pagination = { pageSize: 10, showSizeChanger: true, showTotal: (total, [from, to]) => `${from}-${to} of ${total}` };

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: "Employee" },
          { title: "Referred Applicants" },
        ]}
      />
      <Card
        title={
          <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
            <Col flex="none">
              <Typography.Title level={4} style={{ margin: 0 }}>Referred Applicants</Typography.Title>
            </Col>
            <Col flex="none">
              <Space wrap>
                <Button icon={<ExportOutlined />} onClick={handleExport} disabled={loading}>Export</Button>
                {view === "referrer" ? groupTable.chooser : flatTable.chooser}
                <Button icon={<ReloadOutlined />} onClick={load} disabled={loading}>Refresh</Button>
              </Space>
            </Col>
          </Row>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Segmented
            value={view}
            onChange={setView}
            options={[{ label: "By Referrer", value: "referrer" }, { label: "All Applicants", value: "all" }]}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search applicant, referrer or code..."
            style={{ width: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Stage"
            style={{ width: 230 }}
            value={stage}
            onChange={setStage}
            options={STAGE_FILTERS.map((s) => ({ value: s, label: `${s} (${(stageCounts[s] ?? 0).toLocaleString()})` }))}
          />
          <Select
            allowClear
            showSearch
            placeholder="Branch applied"
            style={{ width: 200 }}
            value={branch}
            onChange={setBranch}
            options={branchOptions}
          />
          <Typography.Text type="secondary">
            {rows.length.toLocaleString()} applicant{rows.length === 1 ? "" : "s"} · {rows.filter(isHired).length.toLocaleString()} hired
          </Typography.Text>
        </Space>

        {view === "referrer" ? (
          <Table
            rowKey="key"
            size="small"
            columns={groupTable.columns}
            dataSource={groups}
            loading={loading}
            scroll={{ x: "max-content" }}
            pagination={pagination}
            onRow={(g) => ({ onClick: (e) => { if (!isInnerControl(e)) toggleGroup(g.key); }, className: "record-row--clickable" })}
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpandedRowsChange: (keys) => setExpandedKeys([...keys]),
              expandIcon: (props) => <ExpandIcon {...props} />,
              expandedRowRender: (g) => (
                <Table
                  rowKey="id"
                  size="small"
                  columns={applicantColumns(false)}
                  dataSource={g.applicants}
                  onRow={applicantRowProps}
                  pagination={g.applicants.length > 10 ? { pageSize: 10 } : false}
                  scroll={{ x: "max-content" }}
                />
              ),
            }}
            locale={{ emptyText: loading ? " " : "No referred applicants." }}
          />
        ) : (
          <Table
            rowKey="id"
            size="small"
            columns={flatTable.columns}
            dataSource={rows}
            onRow={applicantRowProps}
            loading={loading}
            scroll={{ x: "max-content" }}
            pagination={pagination}
            locale={{ emptyText: loading ? " " : "No referred applicants." }}
          />
        )}
      </Card>

      <ApplicantDrawer
        applicantId={viewingId}
        open={Boolean(viewingId)}
        onClose={() => setViewingId(null)}
        maps={names}
        onApplicantChange={handleApplicantChange}
      />
    </>
  );
}
