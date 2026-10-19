import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table, Tag, Button, Space, Tooltip, Select, Input, DatePicker, Segmented, Progress, App,
} from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import clearanceApi from '../../services/clearance/clearanceApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../utils/tablePagination';
import { CLEARANCE_STATUSES, CLEARANCE_STATUS_COLORS, statusLabel, isOverdue, separationLabel } from './clearanceHelpers';
import ClearanceFormModal from './ClearanceFormModal';

// `can` = who the view is for (signatories, final approvers, HR)
const VIEWS = [
  { value: 'to_sign', label: 'To Clear', can: (a) => a.hasPermission('clearance-sign') },
  { value: 'for_approval', label: 'For My Approval', can: (a) => a.isAdmin || a.hasPermission('clearance-approve') },
  { value: 'overdue', label: 'Past Due', can: (a) => a.isAdmin || a.hasPermission('clearance-list-all') },
  { value: 'all', label: 'All', can: () => true },
];

// Offboarding clearances. "To Clear" = clearances whose current component
// waits for this user (its in-charge: assigned, Immediate Head or Branch
// Manager); "For My Approval" = every component cleared, waiting at this
// user's final approval level; "Past Due" = open past the clear-by date. The bell links
// here with ?scope=…, and "Separations without a clearance" with ?new=1.
const ClearanceIndex = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('clearance-create');

  const scopeParam = params.get('scope');
  const defaultView = isAdmin || hasPermission('clearance-list-all') || canCreate ? 'all'
    : (hasPermission('clearance-approve') && !hasPermission('clearance-sign') ? 'for_approval' : 'to_sign');
  const view = VIEWS.some((v) => v.value === scopeParam) ? scopeParam : defaultView;
  // the views this user has a use for (and the one a link opened)
  const views = VIEWS.filter((v) => v.value === view || v.can({ isAdmin, hasPermission })).map(({ value, label }) => ({ value, label }));

  const [options, setOptions] = useState({ separation_types: [], branches: [] });
  const [filters, setFilters] = useState({});
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  // ?new=1 (the bell's "Separations without a clearance") opens the form
  const [formState, setFormOpen] = useState(false);
  const formOpen = formState || (canCreate && params.get('new') === '1');

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await clearanceApi.getAll({
        ...filters,
        status: view === 'all' ? filters.status : undefined,
        scope: view === 'all' ? undefined : view,
        search: search || undefined,
        page: page.current,
        per_page: page.pageSize,
      });
      setRows(data.clearances.data);
      setTotal(data.clearances.total);
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
  }, [view, filters, search, page]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await clearanceApi.options();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);

  const setView = (v) => {
    setParams(v === defaultView ? {} : { scope: v });
    setPage((p) => ({ ...p, current: 1 }));
  };
  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };
  const closeForm = () => {
    setFormOpen(false);
    if (params.get('new')) setParams({});
  };

  const columns = [
    { title: 'Clearance No.', dataIndex: 'clearance_no', width: 150 },
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (r.employee ? (
        <div>
          <div>{r.employee.full_name}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            {[r.employee.employee_code, r.employee.position?.name, r.employee.branch?.name].filter(Boolean).join(' · ')}
          </div>
        </div>
      ) : '—'),
    },
    { title: 'Separation', key: 'separation', width: 160, render: (_, r) => separationLabel(r) },
    { title: 'Last Day', dataIndex: 'last_day_of_work', width: 110, render: (d) => formatDate(d) },
    {
      title: 'Clear By',
      dataIndex: 'due_date',
      width: 120,
      render: (d, r) => (isOverdue(r)
        ? <Tooltip title='Past due'><Tag icon={<WarningOutlined />} color='red'>{formatDate(d)}</Tag></Tooltip>
        : formatDate(d)),
    },
    {
      title: 'Components',
      key: 'progress',
      width: 160,
      render: (_, r) => (
        <Tooltip title={`${r.items_cleared} of ${r.items_total} cleared`}>
          <Progress
            size='small'
            percent={r.items_total ? Math.round((r.items_cleared / r.items_total) * 100) : 0}
            format={() => `${r.items_cleared}/${r.items_total}`}
            status={r.status === 'Cancelled' ? 'exception' : undefined}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 170,
      render: (s, r) => <Tag color={CLEARANCE_STATUS_COLORS[s]}>{statusLabel(s, r.current_level)}{s === 'In Progress' && r.current_step ? ` · ${r.current_step}` : ''}</Tag>,
    },
    {
      title: 'Actions',
      width: 80,
      render: (_, r) => (
        <Space>
          <Tooltip title={view === 'to_sign' ? 'View / Sign' : 'View'}>
            <Button color='blue' variant='outlined' icon={<EyeOutlined />} size='small' onClick={() => navigate(`/clearances/${r.id}`)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Segmented value={view} onChange={setView} options={views} />
          <Select
            allowClear
            disabled={view !== 'all'}
            placeholder='All statuses'
            value={filters.status}
            onChange={(v) => setFilter({ status: v })}
            options={CLEARANCE_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
            style={{ width: 170 }}
          />
          <Select
            allowClear
            placeholder='All branches'
            value={filters.branch_id}
            onChange={(v) => setFilter({ branch_id: v })}
            options={options.branches.map((b) => ({ value: b.id, label: b.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 200 }}
          />
          <DatePicker.RangePicker
            format={DISPLAY_DATE_FORMAT}
            placeholder={['Last day from', 'to']}
            onChange={(range) => setFilter({
              date_from: range?.[0]?.format('YYYY-MM-DD'),
              date_to: range?.[1]?.format('YYYY-MM-DD'),
            })}
          />
          <Input.Search
            placeholder='Clearance no., code or name'
            allowClear
            onSearch={(v) => { setSearch(v.trim()); setPage((p) => ({ ...p, current: 1 })); }}
            style={{ width: 240 }}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>Start Clearance</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1100 }}
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
      <ClearanceFormModal
        open={formOpen}
        clearance={null}
        separationTypes={options.separation_types}
        templates={options.templates || []}
        onClose={closeForm}
        onSaved={(saved) => { closeForm(); navigate(`/clearances/${saved.id}`); }}
      />
    </div>
  );
};

export default ClearanceIndex;
