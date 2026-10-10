import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Table, Tag, Button, Space, Select, DatePicker, Typography, Tooltip, Modal, Descriptions, App } from 'antd';
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import auditTrailApi from '../../services/audit/auditTrailApi';
import EmployeeSelect from '../manpower_request/request/EmployeeSelect';
import ExpandIcon from '../../components/ExpandIcon';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../utils/tablePagination';

const ACTIONS = {
  created: { label: 'Added',   color: 'green' },
  updated: { label: 'Edited',  color: 'blue' },
  deleted: { label: 'Deleted', color: 'red' },
};

// 'leave_type_id' → 'Leave Type', 'filed_by' → 'Filed By'.
const fieldLabel = (field) => field
  .replace(/_id$/, '')
  .split('_')
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ');

// Logged values: names already resolved by the backend; dates and
// timestamps formatted; lists (a shift's days, a holiday's branches) one
// per line.
const showValue = (value, field) => {
  if (value === null || value === undefined || value === '') return <Typography.Text type='secondary'>—</Typography.Text>;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  // a 0 / 1 status flag (e.g. a holiday's) — leave statuses are words
  if (field === 'status' && [0, 1, '0', '1'].includes(value)) return Number(value) ? 'Active' : 'Inactive';
  if (Array.isArray(value)) return value.length ? value.map((v) => <div key={v}>{v}</div>) : <Typography.Text type='secondary'>none</Typography.Text>;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return dayjs(value).format(DISPLAY_DATE_FORMAT);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)) {
    const d = dayjs(value);
    if (d.isValid()) return d.format(d.format('HH:mm:ss') === '00:00:00' ? DISPLAY_DATE_FORMAT : `${DISPLAY_DATE_FORMAT} hh:mm A`);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const CHANGE_COLUMNS = [
  { title: 'Field', dataIndex: 'field', width: 200, render: fieldLabel },
  { title: 'Before', dataIndex: 'old', render: (v, c) => showValue(v, c.field) },
  { title: 'After', dataIndex: 'new', render: (v, c) => showValue(v, c.field) },
];

// An added record has no before, a deleted one no after.
const changeColumns = (action, columns = CHANGE_COLUMNS) => (action === 'updated'
  ? columns
  : columns.filter((c) => c.dataIndex !== (action === 'created' ? 'old' : 'new')));

// The viewer: previous value tinted red, new value green.
const VIEWER_COLUMNS = [
  CHANGE_COLUMNS[0],
  { ...CHANGE_COLUMNS[1], title: 'Previous Data', onCell: () => ({ style: { background: 'rgba(255, 77, 79, 0.06)' } }) },
  { ...CHANGE_COLUMNS[2], title: 'New Data', onCell: () => ({ style: { background: 'rgba(82, 196, 26, 0.08)' } }) },
];

// Audit trail of leave, attendance and payroll records: who added, edited
// or deleted what and when, with every changed field's before / after
// value (expand a row, or View for the Previous / New Data viewer). Newest
// first; server-side filters and pagination.
const AuditTrailIndex = () => {
  const { message } = App.useApp();
  const [options, setOptions] = useState({ modules: [], records: [], users: [] });
  const [filters, setFilters] = useState({});
  const [page, setPage]       = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  // the entry in the viewer — kept while it closes, so it doesn't blank out
  const [viewing, setViewing] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await auditTrailApi.getAll({ ...filters, page: page.current, per_page: page.pageSize });
      setRows(data.logs.data);
      setTotal(data.logs.total);
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
  }, [filters, page]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await auditTrailApi.getOptions();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'created_at',
      width: 170,
      render: (v) => (v ? dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm:ss A`) : '-'),
    },
    { title: 'User', dataIndex: 'user', width: 180, render: (v) => v || <Typography.Text type='secondary'>System</Typography.Text> },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 90,
      render: (v) => <Tag color={ACTIONS[v]?.color}>{ACTIONS[v]?.label || v}</Tag>,
    },
    { title: 'Module', dataIndex: 'module', width: 110 },
    { title: 'Record', key: 'record', width: 190, render: (_, r) => `${r.record} #${r.record_id}` },
    { title: 'Employee', dataIndex: 'employee', width: 230, render: (v) => v || '-' },
    {
      title: 'Changed Fields',
      dataIndex: 'changes',
      render: (changes) => changes.map((c) => fieldLabel(c.field)).join(', '),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Space>
          <Tooltip title='View'>
            <Button
              color='blue'
              variant='outlined'
              icon={<EyeOutlined />}
              size='small'
              disabled={r.changes.length === 0}
              onClick={() => { setViewing(r); setViewerOpen(true); }}
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
          <Select
            allowClear
            placeholder='All modules'
            value={filters.log_name}
            onChange={(v) => setFilter({ log_name: v })}
            options={options.modules.map((m) => ({ value: m, label: m }))}
            style={{ width: 140 }}
          />
          <Select
            allowClear
            placeholder='All records'
            value={filters.record}
            onChange={(v) => setFilter({ record: v })}
            options={options.records}
            style={{ width: 180 }}
          />
          <Select
            allowClear
            placeholder='All actions'
            value={filters.description}
            onChange={(v) => setFilter({ description: v })}
            options={Object.entries(ACTIONS).map(([value, a]) => ({ value, label: a.label }))}
            style={{ width: 130 }}
          />
          <Select
            allowClear
            placeholder='All users'
            value={filters.causer_id}
            onChange={(v) => setFilter({ causer_id: v })}
            options={options.users.map((u) => ({ value: u.id, label: u.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 200 }}
          />
          <div style={{ width: 240 }}>
            <EmployeeSelect
              value={filters.employee_id}
              onChange={(v) => setFilter({ employee_id: v ?? undefined })}
              placeholder='All employees'
            />
          </div>
          <DatePicker.RangePicker
            format={DISPLAY_DATE_FORMAT}
            onChange={(range) => setFilter({
              date_from: range?.[0]?.format('YYYY-MM-DD'),
              date_to: range?.[1]?.format('YYYY-MM-DD'),
            })}
          />
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1100 }}
        expandable={{
          expandIcon: (props) => <ExpandIcon {...props} />,
          rowExpandable: (r) => r.changes.length > 0,
          expandedRowRender: (r) => (
            <Table
              rowKey='field'
              size='small'
              columns={changeColumns(r.action)}
              dataSource={r.changes}
              pagination={false}
            />
          ),
        }}
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
      <Modal
        keyboard={false}
        title={viewing && `${viewing.record} #${viewing.record_id}`}
        open={viewerOpen}
        onCancel={() => setViewerOpen(false)}
        footer={<Button onClick={() => setViewerOpen(false)}>Close</Button>}
        width={{ xs: '100%', sm: '95%', md: 820 }}
        destroyOnHidden
      >
        {viewing && (
          <>
            <Descriptions
              size='small'
              column={{ xs: 1, sm: 2 }}
              style={{ marginBottom: 16 }}
              items={[
                { key: 'action', label: 'Action', children: <Tag color={ACTIONS[viewing.action]?.color}>{ACTIONS[viewing.action]?.label || viewing.action}</Tag> },
                { key: 'when', label: 'Date & Time', children: viewing.created_at ? dayjs(viewing.created_at).format(`${DISPLAY_DATE_FORMAT} hh:mm:ss A`) : '-' },
                { key: 'user', label: 'User', children: viewing.user || <Typography.Text type='secondary'>System</Typography.Text> },
                { key: 'module', label: 'Module', children: viewing.module },
                { key: 'employee', label: 'Employee', children: viewing.employee || '-' },
              ]}
            />
            <Table
              rowKey='field'
              size='small'
              bordered
              columns={changeColumns(viewing.action, VIEWER_COLUMNS)}
              dataSource={viewing.changes}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default AuditTrailIndex;
