import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag, Input, Select, DatePicker, Space, Button, Typography, Badge, Alert, Tooltip, Popconfirm, App } from 'antd';
import { ReloadOutlined, SearchOutlined, EyeOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';

import recruitmentApi from '../../services/recruitment/recruitmentApi';
import useAuth from '../../hooks/useAuth';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import ColumnSelector from '../employee_master_data/components/ColumnSelector';
import { APPLICANT_STAGES, DATE_FIELDS } from './applicants/stages';
import { STATUS_FILTERS, STAGE_FILTERS, matchesStage, progressTagProps, isoFromDisplay } from './applicants/applicantStatus';
import ApplicantDrawer from './applicants/ApplicantDrawer';
import { detailsComplete, finalRequiredFiles, missingFiles, errorMessage, gatewayMessage } from './applicants/requirements';

const { RangePicker } = DatePicker;

// Gateway dates are "MM/DD/YYYY" strings — sort them as YYYY-MM-DD.
const dateSorter = (field) => (a, b) => isoFromDisplay(a[field]).localeCompare(isoFromDisplay(b[field]));
const textSorter = (field) => (a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? ''));
const show = (v) => (v === null || v === undefined || v === '' ? '-' : v);

// Every column the lists can show (vueportal ApplicantDataTable.vue's
// headers, plus contact/source details). `names` resolves the comma-
// separated preference ids against the response's branches/positions.
// "Incomplete" warnings next to the status (portal ApplicantDataTable):
// details while the Initial Interview is on process, final requirement
// files while the Final Interview is. `secondary` = the row's
// { educ_attains, references, files } once loaded.
const incompleteWarnings = (row, secondary) => {
  if (!secondary) return [];
  const warnings = [];
  if (Number(row.status) === 1 && row.initial_interview_status !== null && Number(row.initial_interview_status) === 0
    && !detailsComplete(row, secondary.educ_attains, secondary.references)) {
    warnings.push('Incomplete Details');
  }
  if (row.final_interview_status !== null && Number(row.final_interview_status) === 0) {
    const missing = missingFiles(finalRequiredFiles(row.employment_position), secondary.files);
    if (missing.length) warnings.push(`Incomplete Requirements: ${missing.join(', ')}`);
  }
  return warnings;
};

// Rows whose warnings depend on secondary details.
const needsSecondary = (row) => (Number(row.status) === 1 && row.initial_interview_status !== null && Number(row.initial_interview_status) === 0)
  || (row.final_interview_status !== null && Number(row.final_interview_status) === 0);

const buildColumns = (names, secondary) => {
  const preference = (ids, map) => (ids
    ? String(ids).split(',').map((id) => map[id.trim()] || id).join(', ')
    : '-');
  const date = (dataIndex, title) => ({ title, dataIndex, render: show, sorter: dateSorter(dataIndex) });
  const text = (dataIndex, title) => ({ title, dataIndex, render: show, sorter: textSorter(dataIndex) });

  return [
    { ...text('name', 'Full Name'), fixed: 'left', render: (v) => <Typography.Text strong>{v}</Typography.Text> },
    text('position_name', 'Position Applied'),
    text('branch_name', 'Branch Applied'),
    date('created_at', 'Date Submitted'),
    date('screening_date', 'Screening Date'),
    { title: 'Position Pref.', dataIndex: 'position_preference', render: (v) => preference(v, names.positions) },
    { title: 'Branch Pref.', dataIndex: 'branch_preference', render: (v) => preference(v, names.branches) },
    date('initial_interview_date', 'Initial Interview Date'),
    date('iq_date', 'Exam Date'),
    date('bi_date', 'BI Date'),
    text('branch_complied', 'Branch Complied'),
    date('final_interview_date', 'Final Interview Date'),
    text('employment_position', 'Employment Position'),
    text('employment_branch', 'Employment Branch'),
    text('hiring_officer_position', 'Officer Position'),
    text('hiring_officer_name', 'Officer Name'),
    date('orientation_date', 'Orientation Date'),
    date('signing_of_contract_date', 'Contract Signed'),
    text('email', 'Email'),
    text('contact_no', 'Contact No.'),
    text('how_learn', 'Source'),
    {
      title: 'Status', dataIndex: 'progress_status', sorter: textSorter('progress_status'),
      render: (v, row) => {
        const warnings = incompleteWarnings(row, secondary[row.id]);
        return (
          <Space size={4}>
            {v ? <Tag {...progressTagProps(row)}>{v}</Tag> : '-'}
            {warnings.map((w) => (
              <Tooltip key={w} title={w}>
                <WarningOutlined style={{ color: '#faad14' }} />
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
  ];
};

const MAX_COLUMNS = 12;

// /recruitment/<stage> — one ATS applicant list (stage from APPLICANT_STAGES).
// Loads the whole list once (the gateway doesn't paginate) and filters in
// memory: search, status (counts shown on the filter), branch, position and
// date submitted. Columns are pickable, starting from the stage's defaults.
export default function JobApplicantList({ stageKey }) {
  const { message: messageApi } = App.useApp();
  const stage = APPLICANT_STAGES.find((s) => s.key === stageKey);
  const { hasRole, hasPermission } = useAuth();
  const can = (p) => hasRole('Administrator') || hasPermission(p);
  const canDelete = can('careers-applicant-delete');
  // Branch Managers only ever get their own branch's applicants (the gateway
  // scopes them), so the portal locks branch choice for that role
  // (DialogExport.vue `:readonly="hasRole('Branch Manager')"`) — hide it.
  const showBranchFilter = hasRole('Administrator') || !hasRole('Branch Manager');

  const [rows, setRows] = useState([]);
  const [names, setNames] = useState({ branches: {}, positions: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  // Stage lists open on On Process (the portal fixes them there); All
  // Applicants and Hired show every status.
  const [statusFilter, setStatusFilter] = useState(['applicant-list', 'hired-list'].includes(stageKey) ? 'all' : 'process');
  const [branch, setBranch] = useState(null);
  const [position, setPosition] = useState(null);
  // Stage filter — All Applicants page only, like the portal's index-new.
  const [stageFilter, setStageFilter] = useState(null);
  const showStageFilter = stage.key === 'applicant-list';
  const showStatusFilter = stage.key !== 'hired-list';
  const [dateRange, setDateRange] = useState(null);
  const dateFieldOptions = DATE_FIELDS.slice(0, stage.dates);
  const [dateField, setDateField] = useState(stage.dateField);

  // applicant id → { educ_attains, references, files } for the warnings.
  const [secondary, setSecondary] = useState({});
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const allColumns = useMemo(() => buildColumns(names, secondary), [names, secondary]);
  const [viewingId, setViewingId] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(stage.columns);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await recruitmentApi.getApplicants(stage.api);
        if (cancelled) return;
        if (!Array.isArray(data?.job_applicants)) {
          setRows([]);
          setLoadError(data?.error || 'The careers portal returned no applicant list.');
          return;
        }
        setRows(data.job_applicants);
        setSecondary({});
        setNames({
          branches: Object.fromEntries((data.branches || []).map((b) => [String(b.id), b.name])),
          positions: Object.fromEntries((data.positions || []).map((p) => [String(p.id), p.name])),
        });
      } catch (error) {
        if (cancelled) return;
        setRows([]);
        setLoadError(error.response?.data?.error || 'Could not load applicants from the careers portal.');
        handleApiError(error, messageApi);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [stage.api, reloadKey, messageApi]);

  // Search / branch / position / date only — the stage options count on this.
  const commonFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const [from, to] = dateRange ? dateRange.map((d) => d.format('YYYY-MM-DD')) : [];
    return rows.filter((r) => {
      if (q && ![r.name, r.position_name, r.branch_name, r.email, r.contact_no]
        .some((v) => String(v ?? '').toLowerCase().includes(q))) return false;
      if (branch && r.branch_name !== branch) return false;
      if (position && r.position_name !== position) return false;
      if (from) {
        const date = isoFromDisplay(r[dateField]);
        if (!date || date < from || date > to) return false;
      }
      return true;
    });
  }, [rows, search, branch, position, dateRange, dateField]);

  const stageCounts = useMemo(() => Object.fromEntries(
    STAGE_FILTERS.map((s) => [s, commonFiltered.filter((r) => matchesStage(r, s)).length]),
  ), [commonFiltered]);

  // Everything except the status filter — the status counts are computed on
  // this so each count matches what clicking it would show.
  const baseFiltered = useMemo(
    () => commonFiltered.filter((r) => matchesStage(r, stageFilter)),
    [commonFiltered, stageFilter],
  );

  const statusCounts = useMemo(() => Object.fromEntries(
    STATUS_FILTERS.map((f) => [f.value, baseFiltered.filter(f.match).length]),
  ), [baseFiltered]);

  const filtered = useMemo(() => {
    const match = STATUS_FILTERS.find((f) => f.value === statusFilter).match;
    return baseFiltered.filter(match);
  }, [baseFiltered, statusFilter]);

  // Secondary details for the rows on the current page that need them
  // (the portal loads them for the visible rows too).
  // Clamped: narrowing the filters can leave fewer pages than pageNo.
  const currentPage = Math.min(pageNo, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const pageIds = useMemo(() => filtered
    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
    .filter(needsSecondary)
    .map((r) => r.id), [filtered, currentPage, pageSize]);
  const missingIds = useMemo(() => pageIds.filter((id) => !(id in secondary)), [pageIds, secondary]);

  useEffect(() => {
    if (!missingIds.length) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await recruitmentApi.secondaryDetails(missingIds);
        if (cancelled || !data?.success) return;
        const of = (list, id) => (list || []).filter((x) => x.applicant_id === id);
        setSecondary((prev) => ({
          ...prev,
          ...Object.fromEntries(missingIds.map((id) => [id, {
            educ_attains: of(data.educ_attains, id),
            references: of(data.references, id),
            files: of(data.files, id),
          }])),
        }));
      } catch {
        // Warnings are a hint only; the list stays usable without them.
      }
    };
    load();
    return () => { cancelled = true; };
  }, [missingIds]);

  // A save in the drawer: swap in the portal's updated row and refresh its
  // warnings.
  const handleApplicantChange = (id, row) => {
    if (row) setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...row } : r)));
    setSecondary((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const deleteApplicant = async (record) => {
    try {
      const { data } = await recruitmentApi.deleteApplicant(record.id);
      if (!data?.success) {
        messageApi.error(gatewayMessage(data, 'The applicant could not be deleted.'));
        return;
      }
      messageApi.success(data.message || 'Applicant deleted.');
      setRows((prev) => prev.filter((r) => r.id !== record.id));
    } catch (error) {
      messageApi.error(errorMessage(error, 'The applicant could not be deleted.'));
    }
  };

  const optionsOf = (field) => [...new Set(rows.map((r) => r[field]).filter(Boolean))]
    .sort()
    .map((v) => ({ label: v, value: v }));

  const columnHeaders = allColumns.map((c) => ({ title: c.title, value: c.dataIndex }));
  const columns = [
    // Position in the filtered list (AntD's render index restarts per page).
    { title: '#', key: 'row_no', width: 56, render: (_, record) => filtered.indexOf(record) + 1 },
    ...allColumns.filter((c) => selectedKeys.includes(c.dataIndex)),
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: canDelete ? 90 : 60,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button color="blue" variant="outlined" size="small" icon={<EyeOutlined />} onClick={() => setViewingId(record.id)} />
          </Tooltip>
          {canDelete && (
            <Popconfirm
              title="Delete this applicant?"
              description="Their application and uploaded files are removed. This can't be undone."
              okText="Delete" okButtonProps={{ danger: true }}
              onConfirm={() => deleteApplicant(record)}
            >
              <Tooltip title="Delete">
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={(
        <Space>
          <span>{stage.title}</span>
          <Badge count={filtered.length} showZero overflowCount={99999} color="#389e0d" />
        </Space>
      )}
      extra={(
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)} loading={loading}>
            Refresh
          </Button>
        </Space>
      )}
    >
      {loadError && (
        <Alert type="error" showIcon title={loadError} style={{ marginBottom: 16 }} />
      )}

      {/* Status filter buttons, coloured like the status tags; the active
          one is filled, the rest outlined. Not on Hired — every row there
          has the same outcome. */}
      {showStatusFilter && (
        <Space wrap style={{ marginBottom: 16 }}>
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <Button
                key={f.value}
                color={f.color}
                variant={active ? 'solid' : 'outlined'}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
                <span style={{ fontWeight: 600, opacity: active ? 1 : 0.85 }}>
                  {(statusCounts[f.value] ?? 0).toLocaleString()}
                </span>
              </Button>
            );
          })}
        </Space>
      )}

      <Space wrap align="end" style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search name, position, branch, email, contact"
          style={{ width: 320 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {showStageFilter && (
          <Select
            allowClear placeholder="Stage" style={{ width: 230 }}
            value={stageFilter} onChange={setStageFilter}
            options={STAGE_FILTERS.map((s) => ({ value: s, label: `${s} (${(stageCounts[s] ?? 0).toLocaleString()})` }))}
          />
        )}
        {showBranchFilter && (
          <Select
            allowClear showSearch placeholder="Branch applied" style={{ width: 200 }}
            options={optionsOf('branch_name')} value={branch} onChange={setBranch}
          />
        )}
        <Select
          allowClear showSearch placeholder="Position applied" style={{ width: 220 }}
          options={optionsOf('position_name')} value={position} onChange={setPosition}
        />
        <Space.Compact>
          <Select
            style={{ width: 190 }}
            value={dateField}
            onChange={setDateField}
            options={dateFieldOptions}
            title="Filter by date"
          />
          <RangePicker
            format={DISPLAY_DATE_FORMAT}
            placeholder={['From', 'To']}
            value={dateRange}
            onChange={setDateRange}
          />
        </Space.Compact>
        <ColumnSelector
          headers={columnHeaders}
          selectedHeaders={columnHeaders.filter((h) => selectedKeys.includes(h.value))}
          onChange={(selected) => setSelectedKeys(selected.map((h) => h.value))}
          maxColumns={MAX_COLUMNS}
        />
      </Space>

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={filtered}
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: currentPage,
          pageSize,
          showSizeChanger: true,
          showTotal: (total) => `${total.toLocaleString()} applicants`,
          onChange: (current, size) => { setPageNo(current); setPageSize(size); },
        }}
      />

      <ApplicantDrawer
        applicantId={viewingId}
        open={Boolean(viewingId)}
        onClose={() => setViewingId(null)}
        maps={names}
        onApplicantChange={handleApplicantChange}
      />
    </Card>
  );
}
