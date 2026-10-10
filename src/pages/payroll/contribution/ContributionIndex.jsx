import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Tooltip, Select, Input, Checkbox, Typography, App } from 'antd';
import { EditOutlined, EyeOutlined, HistoryOutlined, ReloadOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import contributionProfileApi from '../../../services/payroll/contributionProfileApi';
import handleApiError from '../../../utils/handleApiError';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../../utils/tablePagination';
import { MODE_COLORS, employeeName } from '../payrollHelpers';
import ContributionProfileModal from './ContributionProfileModal';
import ContributionComputeModal from './ContributionComputeModal';
import ContributionHistoryModal from './ContributionHistoryModal';
import GenerateTemplateModal from '../../employee_master_data/components/GenerateTemplateModal';
import ImportDataModal from '../../employee_master_data/components/ImportDataModal';

const STATUSES = [
  { value: 1, label: 'Active employees' },
  { value: 0, label: 'Inactive employees' },
  { value: -1, label: 'All employees' },
];
const MISSING = [
  { value: 'sss', label: 'No SSS no.' },
  { value: 'philhealth', label: 'No PhilHealth no.' },
  { value: 'pagibig', label: 'No Pag-IBIG no.' },
  { value: 'tin', label: 'No TIN' },
];

const govNumber = (v) => (!v || v === '-' ? <Tag color='red'>Missing</Tag> : v);

// Employees with their government numbers and how each statutory deduction
// applies (Computed from the tables / Fixed / Exempt). Edit opens the
// profile; View shows the monthly computation; History (payroll-report-view)
// the contributions actually deducted per cut-off from approved payslips.
// Bulk: Generate Template (every profile) → edit → Import. Server-side
// filters and pagination.
const ContributionIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const canEdit = isAdmin || hasPermission('contribution-profile-edit');
  const canHistory = isAdmin || hasPermission('payroll-report-view');
  const canTemplate = isAdmin || hasPermission('contribution-profile-template-download');
  const canImport = isAdmin || hasPermission('contribution-profile-import');

  const [branches, setBranches] = useState([]);
  const [filters, setFilters]   = useState({ status: 1 });
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [computing, setComputing] = useState(null);
  const [history, setHistory] = useState(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [importOpen, setImportOpen]     = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await contributionProfileApi.getAll({
        ...filters,
        search: search || undefined,
        page: page.current,
        per_page: page.pageSize,
      });
      setRows(data.employees.data);
      setTotal(data.employees.total);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchRows(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, search, page]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await contributionProfileApi.getOptions();
        setBranches(data.branches);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };

  const modeTag = (mode) => <Tag color={MODE_COLORS[mode]}>{mode}</Tag>;

  const columns = [
    { title: 'Employee Code', dataIndex: 'employee_code', width: 130, fixed: 'left' },
    {
      title: 'Name',
      key: 'name',
      width: 220,
      render: (_, r) => (
        <Space size={4} wrap>
          {employeeName(r)}
          {!r.active && <Tag>Inactive</Tag>}
        </Space>
      ),
    },
    { title: 'Branch', dataIndex: 'branch', width: 140, render: (v) => v || '-' },
    {
      title: 'SSS',
      key: 'sss',
      width: 150,
      render: (_, r) => <div>{govNumber(r.sss_no)}<div style={{ marginTop: 2 }}>{modeTag(r.sss_mode)}</div></div>,
    },
    {
      title: 'PhilHealth',
      key: 'philhealth',
      width: 160,
      render: (_, r) => <div>{govNumber(r.philhealth_no)}<div style={{ marginTop: 2 }}>{modeTag(r.philhealth_mode)}</div></div>,
    },
    {
      title: 'Pag-IBIG',
      key: 'pagibig',
      width: 160,
      render: (_, r) => (
        <div>
          {govNumber(r.pagibig_no)}
          <div style={{ marginTop: 2 }}>
            {modeTag(r.pagibig_mode)}
            {Number(r.pagibig_ee_additional) > 0 && <Tag color='cyan'>+ voluntary</Tag>}
          </div>
        </div>
      ),
    },
    {
      title: 'TIN / Tax',
      key: 'tax',
      width: 160,
      render: (_, r) => (
        <div>
          {govNumber(r.tin_no)}
          <div style={{ marginTop: 2 }}>{Number(r.minimum_wage_earner) ? <Tag color='orange'>MWE</Tag> : modeTag(r.tax_mode)}</div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: canHistory ? 125 : 90,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title='Monthly contributions'>
            <Button
              size='small'
              color='blue'
              variant='outlined'
              icon={<EyeOutlined />}
              onClick={() => setComputing({ id: r.id, label: `${r.employee_code} - ${employeeName(r)}` })}
            />
          </Tooltip>
          {canHistory && (
            <Tooltip title='Contribution history (approved payslips)'>
              <Button
                size='small'
                color='blue'
                variant='outlined'
                icon={<HistoryOutlined />}
                onClick={() => setHistory({ id: r.id, label: `${r.employee_code} - ${employeeName(r)}` })}
              />
            </Tooltip>
          )}
          <Tooltip title={canEdit ? 'Edit profile' : 'View profile'}>
            <Button
              size='small'
              color='green'
              variant='outlined'
              icon={<EditOutlined />}
              onClick={() => setEditing(r.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select value={filters.status} onChange={(v) => setFilter({ status: v })} options={STATUSES} style={{ width: 170 }} />
          <Select
            allowClear
            placeholder='All branches'
            value={filters.branch_id}
            onChange={(v) => setFilter({ branch_id: v })}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 190 }}
          />
          <Select
            allowClear
            placeholder='Any mode'
            value={filters.mode}
            onChange={(v) => setFilter({ mode: v })}
            options={[{ value: 'Fixed', label: 'Has a Fixed amount' }, { value: 'Exempt', label: 'Has an exemption' }]}
            style={{ width: 180 }}
          />
          <Select
            allowClear
            placeholder='Government numbers'
            value={filters.missing}
            onChange={(v) => setFilter({ missing: v })}
            options={MISSING}
            style={{ width: 180 }}
          />
          <Checkbox checked={!!filters.mwe} onChange={(e) => setFilter({ mwe: e.target.checked || undefined })}>
            Minimum wage earners
          </Checkbox>
          <Input.Search
            placeholder='Employee code or name'
            allowClear
            onSearch={(v) => { setSearch(v.trim()); setPage((p) => ({ ...p, current: 1 })); }}
            style={{ width: 220 }}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canTemplate && <Button icon={<DownloadOutlined />} onClick={() => setTemplateOpen(true)}>Generate Template</Button>}
          {canImport && <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>Import</Button>}
        </Space>
      </Space>
      <Typography.Paragraph type='secondary' style={{ fontSize: 12 }}>
        No profile saved = everything Computed from the tables in force (Set Up → Contribution Tables).
      </Typography.Paragraph>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1250 }}
        pagination={{
          current: page.current,
          pageSize: page.pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          showTotal: showRecordRange,
          onChange: (current, pageSize) => setPage({ current, pageSize }),
        }}
      />
      <ContributionProfileModal
        employeeId={editing}
        canEdit={canEdit}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchRows(); }}
      />
      <ContributionComputeModal employee={computing} onClose={() => setComputing(null)} />
      <ContributionHistoryModal employee={history} onClose={() => setHistory(null)} />
      <GenerateTemplateModal open={templateOpen} types={['contribution_profile']} onClose={() => setTemplateOpen(false)} />
      <ImportDataModal open={importOpen} types={['contribution_profile']} onClose={() => setImportOpen(false)} onImported={fetchRows} />
    </div>
  );
};

export default ContributionIndex;
