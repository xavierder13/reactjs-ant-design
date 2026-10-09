import { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Space, Tooltip, Select, Input, Modal, Alert, App,
} from 'antd';
import { EditOutlined, CloseCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import groupScheduleApi from '../../services/shift/groupScheduleApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate } from '../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../utils/tablePagination';
import { GROUP_KINDS, GROUP_SCOPES, SHIFT_STATUS_COLORS, patternSummary, periodDays, scopeLabel } from './shiftHelpers';
import GroupScheduleFormModal from './GroupScheduleFormModal';

const SCOPE_COLORS = { company: 'purple', branch: 'geekblue', position: 'cyan' };

// Default schedules per company / branch / position. An employee with no
// Work Schedule of their own follows the most specific default (position,
// then branch, then company); a Group Shifting replaces everyone's Work
// Schedule for its period (an employee's own shifting still comes first).
// No approval; changes are in the Audit Trail (Attendance).
const GroupScheduleIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('group-schedule-create');
  const canEdit   = isAdmin || hasPermission('group-schedule-edit');
  const canCancel = isAdmin || hasPermission('group-schedule-cancel');

  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState({ status: 'Active' });
  const [search, setSearch]   = useState('');
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await groupScheduleApi.getAll({ ...filters, status: filters.status || 'All' });
      setRows(data.group_schedules);
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
  }, [filters]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await groupScheduleApi.options();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit   = (record) => { setEditing(record); setFormOpen(true); };
  const closeForm  = () => { setFormOpen(false); setEditing(null); };
  const handleSaved = () => { closeForm(); fetchRows(); };

  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      message.error('Give the reason for cancelling');
      return;
    }
    setCancelSaving(true);
    try {
      const { data } = await groupScheduleApi.cancel(cancelling.id, cancelReason.trim());
      message.success(data.message);
      setCancelling(null);
      fetchRows();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setCancelSaving(false);
    }
  };

  const term = search.toLowerCase();
  const shown = term
    ? rows.filter((r) => `${r.scope_name} ${r.shift?.code} ${r.shift?.name} ${r.reason || ''}`.toLowerCase().includes(term))
    : rows;

  const columns = [
    {
      title: 'Group',
      key: 'group',
      render: (_, r) => (
        <div>
          <Tag color={SCOPE_COLORS[r.scope]}>{scopeLabel(r.scope)}</Tag>
          <span>{r.scope_name || '—'}</span>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'kind',
      width: 170,
      render: (k) => GROUP_KINDS.find((g) => g.value === k)?.label,
    },
    {
      title: 'Shift',
      key: 'shift',
      render: (_, r) => (
        <Tooltip title={r.shift ? `${r.shift.name} — ${patternSummary(r.shift.days)}` : null}>
          <Tag color='blue'>{r.shift?.code}</Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Effective / Period',
      key: 'period',
      render: (_, r) => (r.kind === 'shifting'
        ? `${formatDate(r.date_from)} – ${formatDate(r.date_to)} (${periodDays(r)} day${periodDays(r) === 1 ? '' : 's'})`
        : `From ${formatDate(r.date_from)}`),
    },
    { title: 'Reason / Memo', dataIndex: 'reason', ellipsis: true, render: (v) => v || '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s, r) => (
        <Tooltip title={r.status === 'Cancelled' ? `${r.cancel_reason} — ${r.canceller?.name || ''}` : null}>
          <Tag color={SHIFT_STATUS_COLORS[s]}>{s}</Tag>
        </Tooltip>
      ),
    },
    { title: 'Set By', key: 'creator', width: 150, render: (_, r) => r.creator?.name || '—' },
    {
      title: 'Actions',
      width: 90,
      render: (_, record) => (
        <Space>
          {canEdit && record.status === 'Active' && (
            <Tooltip title='Change'>
              <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canCancel && record.status === 'Active' && (
            <Tooltip title='Cancel'>
              <Button
                color='orange'
                variant='outlined'
                icon={<CloseCircleOutlined />}
                size='small'
                onClick={() => { setCancelReason(''); setCancelling(record); }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Alert
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
        title='Which schedule an employee follows'
        description={'1. their own Shifting · 2. a Group Shifting · 3. their own Work Schedule · 4. a Default Work Schedule · otherwise No Schedule. '
          + 'Among groups the most specific wins: position, then branch, then company (by the employee\'s current branch and position).'}
      />
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select
            allowClear
            placeholder='All types'
            value={filters.kind}
            onChange={(v) => setFilter({ kind: v })}
            options={GROUP_KINDS}
            style={{ width: 190 }}
          />
          <Select
            allowClear
            placeholder='All groups'
            value={filters.scope}
            onChange={(v) => setFilter({ scope: v })}
            options={GROUP_SCOPES}
            style={{ width: 140 }}
          />
          <Select
            allowClear
            placeholder='All statuses'
            value={filters.status}
            onChange={(v) => setFilter({ status: v })}
            options={['Active', 'Cancelled'].map((s) => ({ value: s, label: s }))}
            style={{ width: 140 }}
          />
          <Input.Search
            placeholder='Group, shift or reason'
            allowClear
            onSearch={(v) => setSearch(v.trim())}
            style={{ width: 220 }}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={openCreate} disabled={!options}>Set Default Schedule</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={shown}
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: PAGE_SIZE_OPTIONS, showTotal: showRecordRange }}
      />
      <GroupScheduleFormModal open={formOpen} record={editing} options={options} onClose={closeForm} onSaved={handleSaved} />
      <Modal
        open={!!cancelling}
        title='Cancel Default Schedule'
        okText='Cancel Default'
        okButtonProps={{ danger: true }}
        confirmLoading={cancelSaving}
        cancelText='Back'
        onOk={confirmCancel}
        onCancel={() => setCancelling(null)}
        destroyOnHidden
      >
        <p>Employees who follow it go to the next schedule that applies (a broader default, or No Schedule). It stays in the list as Cancelled.</p>
        <Input.TextArea rows={2} maxLength={2000} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder='Reason (required)' />
      </Modal>
    </div>
  );
};

export default GroupScheduleIndex;
