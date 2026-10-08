import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Table, Tag, Button, Space, Tooltip, Select, Input, Checkbox, Typography, App } from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import compensationApi from '../../services/compensation/compensationApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate } from '../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../utils/tablePagination';
import GenerateTemplateModal from '../employee_master_data/components/GenerateTemplateModal';
import ImportDataModal from '../employee_master_data/components/ImportDataModal';
import { CHANGE_TYPE_COLORS, peso } from './compensationHelpers';
import CompensationFormModal from './CompensationFormModal';
import CompensationHistoryModal from './CompensationHistoryModal';

const STATUSES = [
  { value: 1, label: 'Active employees' },
  { value: 0, label: 'Inactive employees' },
  { value: -1, label: 'All employees' },
];

// Salary history: each employee with the salary in force today (blank =
// none saved yet). View opens their history (add / edit / delete there).
// No approval — saving is by permission. Bulk changes: Generate Template →
// fill effective_date + the new rate → Import. Server-side filters and
// pagination.
const CompensationIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('compensation-create');
  const canEdit   = isAdmin || hasPermission('compensation-edit');
  const canDelete = isAdmin || hasPermission('compensation-delete');
  const canTemplate = isAdmin || hasPermission('compensation-template-download');
  const canImport = isAdmin || hasPermission('compensation-import');

  const [options, setOptions] = useState({ pay_bases: [], change_types: [], branches: [] });
  const [filters, setFilters] = useState({ status: 1 });
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [adding, setAdding]   = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [importOpen, setImportOpen]     = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await compensationApi.getAll({
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
        const { data } = await compensationApi.getOptions();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };

  const columns = [
    { title: 'Employee Code', dataIndex: 'employee_code', width: 130 },
    {
      title: 'Name',
      key: 'name',
      width: 230,
      render: (_, r) => (
        <Space size={4}>
          {`${r.last_name}, ${r.first_name}${r.middle_name ? ` ${r.middle_name}` : ''}`}
          {!r.active && <Tag>Inactive</Tag>}
        </Space>
      ),
    },
    { title: 'Branch', dataIndex: 'branch', width: 150, render: (v) => v || '-' },
    { title: 'Position', dataIndex: 'position', width: 180, render: (v) => v || '-' },
    { title: 'Pay Basis', dataIndex: 'pay_basis', width: 90, render: (v) => v || '-' },
    {
      title: 'Basic Rate',
      dataIndex: 'basic_rate',
      width: 130,
      align: 'right',
      render: (v) => (v ? peso(v) : <Typography.Text type='secondary'>No salary yet</Typography.Text>),
    },
    {
      title: 'Effective Since',
      dataIndex: 'effective_date',
      width: 170,
      render: (v, r) => (
        <Space size={4} wrap>
          {v ? formatDate(v) : '-'}
          {r.next_effective_date && (
            <Tooltip title='A salary change is saved for a later date'>
              <Tag color='blue'>Change on {dayjs(r.next_effective_date).format('MM/DD/YYYY')}</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: 'Change Type', dataIndex: 'change_type', width: 140, render: (v) => (v ? <Tag color={CHANGE_TYPE_COLORS[v]}>{v}</Tag> : '-') },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, r) => (
        <Tooltip title='Salary history'>
          <Button size='small' color='blue' variant='outlined' icon={<EyeOutlined />} onClick={() => setViewing(r.id)} />
        </Tooltip>
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
            options={options.branches.map((b) => ({ value: b.id, label: b.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 200 }}
          />
          <Select
            allowClear
            placeholder='All pay bases'
            value={filters.pay_basis}
            onChange={(v) => setFilter({ pay_basis: v })}
            options={options.pay_bases.map((b) => ({ value: b, label: b }))}
            style={{ width: 150 }}
          />
          <Checkbox checked={!!filters.without_salary} onChange={(e) => setFilter({ without_salary: e.target.checked || undefined })}>
            No salary yet
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
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={() => setAdding(true)}>Add Salary Change</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1300 }}
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
      <CompensationHistoryModal
        employeeId={viewing}
        options={options}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        onClose={() => setViewing(null)}
        onChanged={fetchRows}
      />
      <CompensationFormModal
        open={adding}
        options={options}
        onClose={() => setAdding(false)}
        onSaved={() => { setAdding(false); fetchRows(); }}
      />
      <GenerateTemplateModal open={templateOpen} types={['compensation']} onClose={() => setTemplateOpen(false)} />
      <ImportDataModal open={importOpen} types={['compensation']} onClose={() => setImportOpen(false)} onImported={fetchRows} />
    </div>
  );
};

export default CompensationIndex;
