import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Tooltip, Select, Input, Progress, Popconfirm, Typography, App } from 'antd';
import { EditOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import deductionApi from '../../../services/payroll/deductionApi';
import handleApiError from '../../../utils/handleApiError';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../../utils/tablePagination';
import { DEDUCTION_STATUS_COLORS, employeeName, peso } from '../payrollHelpers';
import DeductionFormModal from './DeductionFormModal';
import DeductionDetailsModal from './DeductionDetailsModal';

// Scheduled deductions (loans, cash advances, …) with their balance. View
// opens the details and payment ledger (record payment, hold / resume,
// cancel). No approval — saved by permission. Server-side filters and
// pagination.
const DeductionIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const perms = {
    canCreate: isAdmin || hasPermission('deduction-create'),
    canEdit:   isAdmin || hasPermission('deduction-edit'),
    canCancel: isAdmin || hasPermission('deduction-cancel'),
    canDelete: isAdmin || hasPermission('deduction-delete'),
    canPay:    isAdmin || hasPermission('deduction-payment'),
  };

  const [options, setOptions] = useState({ types: [], cutoffs: [], branches: [], schedules: [], statuses: [] });
  const [filters, setFilters] = useState({});
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null); // {} = add
  const [savedCount, setSavedCount] = useState(0); // reloads the open details after an edit

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await deductionApi.getAll({ ...filters, search: search || undefined, page: page.current, per_page: page.pageSize });
      setRows(data.deductions.data);
      setTotal(data.deductions.total);
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
        const { data } = await deductionApi.getOptions();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };

  // edit needs the full record (the list rows are flattened)
  const openEdit = async (id) => {
    try {
      const { data } = await deductionApi.show(id);
      setEditing(data.deduction);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const remove = async (record) => {
    try {
      const { data } = await deductionApi.delete(record.id);
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
      width: 230,
      fixed: 'left',
      render: (_, r) => (
        <div>
          <div>{employeeName(r)} {!r.active && <Tag>Inactive</Tag>}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{r.employee_code} · {r.branch || '-'}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Deduction',
      key: 'type',
      width: 210,
      render: (_, r) => (
        <div>
          <div>{r.type_name}</div>
          {r.reference_no && <Typography.Text type='secondary' style={{ fontSize: 12 }}>Ref. {r.reference_no}</Typography.Text>}
        </div>
      ),
    },
    { title: 'Total', dataIndex: 'total_amount', width: 120, align: 'right', render: (v) => peso(v) },
    { title: 'Per Cut-off', dataIndex: 'amount_per_cutoff', width: 120, align: 'right', render: (v) => peso(v) },
    {
      title: 'Balance',
      dataIndex: 'balance',
      width: 170,
      render: (v, r) => (
        <div>
          <strong>{peso(v)}</strong>
          <Progress
            percent={Number(r.total_amount) ? Math.round((Number(r.total_paid) / Number(r.total_amount)) * 100) : 0}
            size='small'
            showInfo={false}
            status={r.status === 'Fully Paid' ? 'success' : 'normal'}
          />
        </div>
      ),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 180,
      render: (_, r) => (
        <div>
          <div>{r.schedule}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>from {r.start_cutoff || '-'}</Typography.Text>
        </div>
      ),
    },
    { title: 'Status', dataIndex: 'status', width: 110, render: (v) => <Tag color={DEDUCTION_STATUS_COLORS[v]}>{v}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, r) => {
        const open = ['Active', 'On Hold'].includes(r.status);
        return (
          <Space>
            <Tooltip title='View & payments'>
              <Button size='small' color='blue' variant='outlined' icon={<EyeOutlined />} onClick={() => setViewing(r.id)} />
            </Tooltip>
            {perms.canEdit && open && (
              <Tooltip title='Edit'>
                <Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => openEdit(r.id)} />
              </Tooltip>
            )}
            {perms.canDelete && Number(r.total_paid) === 0 && (
              <Popconfirm
                title='Delete this deduction?'
                description='Only for a wrong entry with no payment — otherwise cancel it.'
                okText='Delete'
                okButtonProps={{ danger: true }}
                onConfirm={() => remove(r)}
              >
                <Tooltip title='Delete'>
                  <Button size='small' danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
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
            options={options.statuses.map((s) => ({ value: s, label: s }))}
            style={{ width: 150 }}
          />
          <Select
            allowClear
            placeholder='All types'
            value={filters.deduction_type_id}
            onChange={(v) => setFilter({ deduction_type_id: v })}
            options={options.types.map((t) => ({ value: t.id, label: t.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder='All branches'
            value={filters.branch_id}
            onChange={(v) => setFilter({ branch_id: v })}
            options={options.branches.map((b) => ({ value: b.id, label: b.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 190 }}
          />
          <Input.Search
            placeholder='Employee or reference no.'
            allowClear
            onSearch={(v) => { setSearch(v.trim()); setPage((p) => ({ ...p, current: 1 })); }}
            style={{ width: 230 }}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {perms.canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={() => setEditing({})}>Add Deduction</Button>}
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
      <DeductionFormModal
        open={!!editing}
        deduction={editing?.id ? editing : null}
        options={options}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setSavedCount((n) => n + 1); fetchRows(); }}
      />
      <DeductionDetailsModal
        deductionId={viewing}
        refreshKey={savedCount}
        options={options}
        perms={perms}
        onClose={() => setViewing(null)}
        onChanged={fetchRows}
        onEdit={(d) => setEditing(d)}
      />
    </div>
  );
};

export default DeductionIndex;
