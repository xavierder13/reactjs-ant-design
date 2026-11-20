import { useMemo, useState } from "react";
import { Modal, Table, Tag, Select, Space, Typography, Input, Descriptions, App } from "antd";
import { SearchOutlined } from "@ant-design/icons";

import employeeReferralApi from "../../../services/employee/employeeReferralApi";
import handleApiError from "../../../utils/handleApiError";
import useAuth from "../../../hooks/useAuth";
import RecordLink from "../../../components/RecordLink";
import EmployeeRecordCell from "./EmployeeRecordCell";
import ApplicantDrawer from "../../recruitment/applicants/ApplicantDrawer";
import { APPLICANT_LIST_PERMISSIONS, isInnerControl, lookupMaps } from "./referralHelpers";
import { STAGE_FILTERS, matchesStage, progressTagProps, isoFromDisplay } from "../../recruitment/applicants/applicantStatus";

const show = (v) => (v === null || v === undefined || v === "" ? "-" : v);
const textSorter = (key) => (a, b) => String(a[key] || "").localeCompare(String(b[key] || ""));
const dateSorter = (key) => (a, b) => isoFromDisplay(a[key]).localeCompare(isoFromDisplay(b[key]));
const fullName = (r) => [`${r.last_name || ""},`, r.first_name, r.middle_name].filter(Boolean).join(" ");

const buildColumns = (openApplicant, canOpenEmployee) => [
  {
    title: "Full Name", dataIndex: "name", sorter: textSorter("name"),
    render: (v, r) => (
      <RecordLink onClick={openApplicant ? () => openApplicant(r.id) : undefined} title="Open applicant details">
        {v}
      </RecordLink>
    ),
  },
  { title: "Position Applied", dataIndex: "position_name", sorter: textSorter("position_name"), render: show },
  { title: "Branch Applied", dataIndex: "branch_name", sorter: textSorter("branch_name"), render: show },
  { title: "Date Submitted", dataIndex: "created_at", sorter: dateSorter("created_at"), render: show },
  { title: "Contract Signed", dataIndex: "signing_of_contract_date", sorter: dateSorter("signing_of_contract_date"), render: show },
  {
    title: "Status", dataIndex: "progress_status", sorter: textSorter("progress_status"),
    render: (v, row) => (v ? <Tag {...progressTagProps(row)}>{v}</Tag> : "-"),
  },
  {
    title: "Employee Record", key: "employee_code", sorter: textSorter("employee_code"),
    render: (_, r) => <EmployeeRecordCell applicant={r} canOpen={canOpenEmployee} returnTo="/employees/referral-codes" />,
  },
];

// View Referrals (Referral Codes row action): the careers-portal applicants
// at any stage who entered this employee's referral code, with the All
// Applicants page's stage filter (the stage name inside progress_status).
// Rows come from the portal's All Applicants list, scoped to the user. A
// row (or its name link) opens the recruitment ApplicantDrawer.
export default function ReferralApplicantsModal({ employee, onClose }) {
  const { message: messageApi } = App.useApp();
  const { hasRole, hasPermission, hasAnyPermission } = useAuth();
  const canOpenApplicant = hasRole("Administrator") || hasAnyPermission(...APPLICANT_LIST_PERMISSIONS);
  const canOpenEmployee = hasRole("Administrator") || hasPermission("employee-master-data-list");
  const [names, setNames] = useState({ branches: {}, positions: {} });
  const [viewingId, setViewingId] = useState(null);
  const columns = useMemo(
    () => buildColumns(canOpenApplicant ? setViewingId : null, canOpenEmployee),
    [canOpenApplicant, canOpenEmployee],
  );
  const [loading, setLoading] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [stage, setStage] = useState();
  const [search, setSearch] = useState("");

  // fetch when the modal opens; clear when it closes
  const afterOpenChange = async (open) => {
    if (!open) {
      setApplicants([]);
      setStage(undefined);
      setSearch("");
      return;
    }
    setLoading(true);
    try {
      const { data } = await employeeReferralApi.getReferrals(employee.id);
      setApplicants(data.applicants || []);
      setNames(lookupMaps(data));
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  };

  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? applicants.filter((r) => [r.name, r.position_name, r.branch_name].some((v) => String(v || "").toLowerCase().includes(term)))
      : applicants;
  }, [applicants, search]);

  const stageCounts = useMemo(
    () => Object.fromEntries(STAGE_FILTERS.map((s) => [s, searched.filter((r) => matchesStage(r, s)).length])),
    [searched],
  );
  const rows = useMemo(() => searched.filter((r) => matchesStage(r, stage)), [searched, stage]);

  return (
    <Modal
      open={!!employee}
      title="Referrals"
      onCancel={onClose}
      afterOpenChange={afterOpenChange}
      footer={null}
      // wide enough for every column without side-scrolling, still a dialog
      width="min(1280px, 90vw)"
      style={{ top: 48 }}
      keyboard={false}
      destroyOnHidden
    >
      {employee && (
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Referrer">{fullName(employee)}</Descriptions.Item>
          <Descriptions.Item label="Referral Code"><Typography.Text strong>{employee.referral_code}</Typography.Text></Descriptions.Item>
          <Descriptions.Item label="Branch">{show(employee.branch)}</Descriptions.Item>
          <Descriptions.Item label="Hired">{(stageCounts.Hired ?? 0).toLocaleString()} of {searched.length.toLocaleString()}</Descriptions.Item>
        </Descriptions>
      )}
      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search name, position or branch..."
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
      </Space>
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={loading}
        onRow={(r) => ({
          onClick: (e) => { if (canOpenApplicant && !isInnerControl(e)) setViewingId(r.id); },
          className: canOpenApplicant ? "record-row--clickable" : undefined,
        })}
        scroll={{ x: "max-content", y: "min(480px, calc(100vh - 400px))" }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (total, [from, to]) => `${from}-${to} of ${total}` }}
        locale={{ emptyText: loading ? " " : "No applicant has used this referral code." }}
      />

      <ApplicantDrawer
        applicantId={viewingId}
        open={Boolean(viewingId)}
        onClose={() => setViewingId(null)}
        maps={names}
        onApplicantChange={(id, row) => { if (row) setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, ...row } : a))); }}
      />
    </Modal>
  );
}
