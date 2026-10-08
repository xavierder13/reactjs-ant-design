import { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Space, Tooltip, Select, Input, DatePicker, Modal, App,
} from 'antd';
import { EyeOutlined, EditOutlined, CloseCircleOutlined, PlusOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import shiftAssignmentApi from '../../services/shift/shiftAssignmentApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../utils/tablePagination';
import { SHIFT_STATUS_COLORS, periodDays } from './shiftHelpers';
import ShiftAssignmentFormModal from './ShiftAssignmentFormModal';
import ShiftHistoryModal from './ShiftHistoryModal';
import ShiftBulkAssignModal from './ShiftBulkAssignModal';

// Temporary shifting (relieving): a shift overrides an employee's Work
// Schedule for a short period. No approval — users with the permission
// assign / change / cancel directly, limited to the employees they manage
// (everyone with shift-assignment-list-all). Every change is kept (History).
const ShiftAssignmentIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('shift-assignment-create');
  const canEdit   = isAdmin || hasPermission('shift-assignment-edit');
  const canCancel = isAdmin || hasPermission('shift-assignment-cancel');

  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState({ status: 'Active' });
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [history, setHistory]   = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await shiftAssignmentApi.getAll({ ...filters, search: search || undefined, page: page.current, per_page: page.pageSize });
      setRows(data.assignments.data);
      setTotal(data.assignments.total);
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
        const { data } = await shiftAssignmentApi.options();
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

  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      message.error('Give the reason for cancelling');
      return;
    }
    setCancelSaving(true);
    try {
      const { data } = await shiftAssignmentApi.cancel(cancelling.id, cancelReason.trim());
      message.success(data.message);
      setCancelling(null);
      // the last row of a filtered page leaves → step back a page
      if (rows.length === 1 && page.current > 1 && filters.status === 'Active') setPage((p) => ({ ...p, current: p.current - 1 }));
      else fetchRows();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setCancelSaving(false);
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
    { title: 'Shift', key: 'shift', render: (_, r) => <Tooltip title={r.shift?.name}><Tag color='blue'>{r.shift?.code}</Tag></Tooltip> },
    {
      title: 'Period',
      key: 'period',
      render: (_, r) => `${formatDate(r.date_from)} – ${formatDate(r.date_to)} (${periodDays(r)} day${periodDays(r) === 1 ? '' : 's'})`,
    },
    { title: 'Relieving', key: 'relieved', render: (_, r) => r.relieved_employee?.full_name || '—' },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true, render: (v) => v || '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s, r) => (
        <Tooltip title={r.status === 'Cancelled' ? r.cancel_reason : null}><Tag color={SHIFT_STATUS_COLORS[s]}>{s}</Tag></Tooltip>
      ),
    },
    { title: 'Assigned By', key: 'creator', width: 150, render: (_, r) => r.creator?.name || '—' },
    {
      title: 'Actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title='History'>
            <Button color='blue' variant='outlined' icon={<EyeOutlined />} size='small' onClick={() => setHistory(record)} />
          </Tooltip>
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
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select
            allowClear
            placeholder='All statuses'
            value={filters.status}
            onChange={(v) => setFilter({ status: v })}
            options={['Active', 'Cancelled'].map((s) => ({ value: s, label: s }))}
            style={{ width: 140 }}
          />
          <Select
            allowClear
            placeholder='All shifts'
            value={filters.shift_id}
            onChange={(v) => setFilter({ shift_id: v })}
            options={(options?.all_shifts || []).map((s) => ({ value: s.id, label: `${s.code}${s.active ? '' : ' (inactive)'}` }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 160 }}
          />
          <Select
            allowClear
            placeholder='All branches'
            value={filters.branch_id}
            onChange={(v) => setFilter({ branch_id: v })}
            options={(options?.branches || []).map((b) => ({ value: b.id, label: b.name }))}
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
          {canCreate && <Button icon={<TeamOutlined />} onClick={() => setBulkOpen(true)} disabled={!options}>Group Shift Allocation</Button>}
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={openCreate} disabled={!options}>Assign Shift</Button>}
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
      <ShiftAssignmentFormModal open={formOpen} assignment={editing} options={options} onClose={closeForm} onSaved={handleSaved} />
      <ShiftHistoryModal assignment={history} onClose={() => setHistory(null)} />
      <ShiftBulkAssignModal
        open={bulkOpen}
        options={options}
        onClose={() => setBulkOpen(false)}
        onSaved={() => { setBulkOpen(false); fetchRows(); }}
      />
      <Modal
        open={!!cancelling}
        title='Cancel Shifting'
        okText='Cancel Shifting'
        okButtonProps={{ danger: true }}
        confirmLoading={cancelSaving}
        cancelText='Back'
        onOk={confirmCancel}
        onCancel={() => setCancelling(null)}
        destroyOnHidden
      >
        <p>The employee goes back to their Work Schedule for these dates. The shifting stays in the history.</p>
        <Input.TextArea rows={2} maxLength={2000} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder='Reason (required)' />
      </Modal>
    </div>
  );
};

export default ShiftAssignmentIndex;
