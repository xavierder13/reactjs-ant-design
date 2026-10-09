import { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Space, Tooltip, Select, Input, DatePicker, Popconfirm, Segmented, App,
} from 'antd';
import { EyeOutlined, EditOutlined, CloseCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import filingAccess from '../../utils/filingAccess';
import timeEntryApi from '../../services/time_entry/timeEntryApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../utils/tablePagination';
import { TIME_ENTRY_STATUS_COLORS, TIME_ENTRY_STATUSES, timeRange, breakRange } from './timeEntryHelpers';
import TimeEntryFormModal from './TimeEntryFormModal';
import PaidTag from '../../components/approval/PaidTag';
import TimeEntryDetailsModal from './TimeEntryDetailsModal';

// Manual time-in / time-out for days the biometric device couldn't record
// (field work, official business, missed punch, device problem). "For My
// Approval" = waiting for this user's decision now (Access Chart level /
// subordinates, like leave and MRF); "All" = everything they may see.
const TimeEntryIndex = () => {
  const { message } = App.useApp();
  const auth = useAuth();
  const { hasRole } = auth;
  const access = filingAccess(auth, 'time-entry');
  const isAdmin   = hasRole('Administrator');
  const canCreate  = access.canCreate;

  const [options, setOptions] = useState({ types: [], branches: [] });
  const [view, setView]       = useState('approval');
  const [filters, setFilters] = useState({});
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [viewing, setViewing]   = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await timeEntryApi.getAll({
        ...filters,
        // the status filter is off in "For My Approval" (always Pending there)
        status: view === 'approval' ? undefined : filters.status,
        scope: view === 'approval' ? 'for_approval' : undefined,
        search: search || undefined,
        page: page.current,
        per_page: page.pageSize,
      });
      setRows(data.entries.data);
      setTotal(data.entries.total);
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
        const { data } = await timeEntryApi.options();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit   = (record) => { setEditing(record); setFormOpen(true); };
  const closeForm  = () => { setFormOpen(false); setEditing(null); };
  const handleSaved = () => { closeForm(); fetchRows(); };

  const cancelEntry = async (record) => {
    try {
      const { data } = await timeEntryApi.act('cancel', record.id, null);
      message.success(data.message);
      fetchRows();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (r.employee ? (
        <div>
          <div>{r.employee.full_name}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.employee.employee_code} · {r.employee.branch?.name || '—'}</div>
        </div>
      ) : '—'),
    },
    { title: 'Date', dataIndex: 'date', width: 120, render: (d) => formatDate(d) },
    {
      title: 'Time',
      key: 'time',
      width: 170,
      render: (_, r) => (
        <div>
          <div>{timeRange(r.time_in, r.time_out)}</div>
          {breakRange(r.break_out, r.break_in) && (
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{`Break ${breakRange(r.break_out, r.break_in)}`}</div>
          )}
        </div>
      ),
    },
    { title: 'Type', dataIndex: 'entry_type', width: 150, render: (t, r) => <Tooltip title={r.location}>{t}</Tooltip> },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      render: (s, r) => (
        <>
          <Tag color={TIME_ENTRY_STATUS_COLORS[s]}>{s === 'Pending' && r.current_level ? `Pending · Level ${r.current_level}` : s}</Tag>
          <PaidTag paidIn={r.paid_in} pendingIn={r.pending_in} />
        </>
      ),
    },
    {
      title: 'Actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title={view === 'approval' ? 'View / Approve' : 'View'}>
            <Button color='blue' variant='outlined' icon={<EyeOutlined />} size='small' onClick={() => setViewing(record.id)} />
          </Tooltip>
          {access.canEdit(record) && record.status === 'Pending' && (
            <Tooltip title='Edit'>
              <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {access.canCancel(record) && ['Pending', 'Approved'].includes(record.status) && (isAdmin || (!record.paid_in && !record.pending_in)) && (
            <Popconfirm title='Cancel this time entry?' onConfirm={() => cancelEntry(record)}>
              <Tooltip title='Cancel'>
                <Button color='orange' variant='outlined' icon={<CloseCircleOutlined />} size='small' />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Segmented
            value={view}
            onChange={(v) => { setView(v); setPage((p) => ({ ...p, current: 1 })); }}
            options={[{ value: 'approval', label: 'For My Approval' }, { value: 'all', label: 'All' }]}
          />
          <Select
            allowClear
            disabled={view === 'approval'}
            placeholder='All statuses'
            value={filters.status}
            onChange={(v) => setFilter({ status: v })}
            options={TIME_ENTRY_STATUSES.map((s) => ({ value: s, label: s }))}
            style={{ width: 140 }}
          />
          <Select
            allowClear
            placeholder='All types'
            value={filters.entry_type}
            onChange={(v) => setFilter({ entry_type: v })}
            options={options.types.map((t) => ({ value: t, label: t }))}
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
            onChange={(range) => setFilter({
              date_from: range?.[0]?.format('YYYY-MM-DD'),
              date_to: range?.[1]?.format('YYYY-MM-DD'),
            })}
          />
          <Input.Search
            placeholder='Employee code or name'
            allowClear
            onSearch={(v) => { setSearch(v.trim()); setPage((p) => ({ ...p, current: 1 })); }}
            style={{ width: 220 }}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>File Time Entry</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1000 }}
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
      <TimeEntryFormModal open={formOpen} entry={editing} types={options.types} onClose={closeForm} onSaved={handleSaved} />
      <TimeEntryDetailsModal
        entryId={viewing}
        onClose={() => setViewing(null)}
        onActed={() => { setViewing(null); fetchRows(); }}
      />
    </div>
  );
};

export default TimeEntryIndex;
