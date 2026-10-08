import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Tooltip, Select, Input, DatePicker, Popconfirm, Segmented, App } from 'antd';
import { EyeOutlined, EditOutlined, CloseCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import useLeaveTypes from '../../hooks/useLeaveTypes';
import leaveApi from '../../services/leave/leaveApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { LEAVE_STATUS_COLORS, LEAVE_STATUSES, leaveDates, num } from './leaveHelpers';
import LeaveFormModal from './LeaveFormModal';
import LeaveDetailsModal from './LeaveDetailsModal';

// Leave applications. "For My Approval" = leaves waiting for this user's
// decision now (Access Chart level / subordinates, like MRF); "All" = every
// leave they may see (all with leave-list-all; else what they filed, their
// own, and those they approve / approved). Server-side pagination and
// filters: status, leave type, branch, dates overlapping a range, employee.
const LeaveApplicationIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items: leaveTypes } = useLeaveTypes();
  const [branches, setBranches] = useState([]);

  const isAdmin    = hasRole('Administrator');
  const canCreate  = isAdmin || hasPermission('leave-create');
  const canEdit    = isAdmin || hasPermission('leave-edit');
  const canCancel  = isAdmin || hasPermission('leave-cancel');

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
      const { data } = await leaveApi.getAll({
        ...filters,
        scope: view === 'approval' ? 'for_approval' : undefined,
        search: search || undefined,
        page: page.current,
        per_page: page.pageSize,
      });
      setRows(data.leaves.data);
      setTotal(data.leaves.total);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  // Any filter / search / page change reloads.
  useEffect(() => {
    const load = async () => { await fetchRows(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filters, search, page]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await leaveApi.getCreate();
        setBranches(data.branches);
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
  const handleActed = () => { setViewing(null); fetchRows(); };

  const cancelLeave = async (record) => {
    try {
      const { data } = await leaveApi.act('cancel', record.id, null);
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
    { title: 'Leave Type', key: 'type', render: (_, r) => r.leave_type?.name || '—' },
    { title: 'Dates', key: 'dates', render: (_, r) => leaveDates(r) },
    { title: 'Days', dataIndex: 'days', width: 70, render: num },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      render: (s, r) => (
        <Tag color={LEAVE_STATUS_COLORS[s]}>{s === 'Pending' && r.current_level ? `Pending · Level ${r.current_level}` : s}</Tag>
      ),
    },
    { title: 'Filed By', key: 'filer', width: 150, render: (_, r) => r.filer?.name || '—' },
    {
      title: 'Actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title={view === 'approval' ? 'View / Approve' : 'View'}>
            <Button color='blue' variant='outlined' icon={<EyeOutlined />} size='small' onClick={() => setViewing(record.id)} />
          </Tooltip>
          {canEdit && record.status === 'Pending' && (
            <Tooltip title='Edit'>
              <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canCancel && ['Pending', 'Approved'].includes(record.status) && (
            <Popconfirm title='Cancel this leave?' description='The days go back to the balance.' onConfirm={() => cancelLeave(record)}>
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
            options={LEAVE_STATUSES.map((s) => ({ value: s, label: s }))}
            style={{ width: 150 }}
          />
          <Select
            allowClear
            placeholder='All leave types'
            value={filters.leave_type_id}
            onChange={(v) => setFilter({ leave_type_id: v })}
            options={leaveTypes.map((t) => ({ value: t.id, label: t.name }))}
            style={{ width: 200 }}
          />
          <Select
            allowClear
            placeholder='All branches'
            value={filters.branch_id}
            onChange={(v) => setFilter({ branch_id: v })}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
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
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>File Leave</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{
          current: page.current,
          pageSize: page.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `${t} leave${t === 1 ? '' : 's'}`,
          onChange: (current, pageSize) => setPage({ current, pageSize }),
        }}
      />
      <LeaveFormModal open={formOpen} leave={editing} onClose={closeForm} onSaved={handleSaved} />
      <LeaveDetailsModal
        leaveId={viewing}
        canCancel={canCancel}
        onClose={() => setViewing(null)}
        onActed={handleActed}
      />
    </div>
  );
};

export default LeaveApplicationIndex;
