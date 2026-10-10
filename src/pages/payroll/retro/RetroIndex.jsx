import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Tooltip, Select, Input, Popconfirm, Badge, Typography, App } from 'antd';
import { EditOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, BulbOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import retroApi from '../../../services/payroll/retroApi';
import handleApiError from '../../../utils/handleApiError';
import { formatDate } from '../../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../../utils/tablePagination';
import { ADJUSTMENT_COLORS, RETRO_STATUS_COLORS, cutoffOptions, employeeName, peso, retroLabel } from '../payrollHelpers';
import RetroFormModal from './RetroFormModal';
import RetroDetailsModal from './RetroDetailsModal';
import RetroSuggestionsModal from './RetroSuggestionsModal';

// Retroactive pay adjustments, each paid (Earning) or recovered (Deduction)
// on a payroll cut-off. Suggestions lists back-dated salary changes whose
// cut-offs were already paid at the old rate. No approval; Open → Applied
// (payroll run) | Cancelled. Server-side filters and pagination.
const RetroIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const perms = {
    canCreate: isAdmin || hasPermission('retro-create'),
    canEdit:   isAdmin || hasPermission('retro-edit'),
    canCancel: isAdmin || hasPermission('retro-cancel'),
    canDelete: isAdmin || hasPermission('retro-delete'),
  };

  const [options, setOptions] = useState({ types: {}, adjustments: [], statuses: [], cutoffs: [], branches: [], next_cutoff_id: null });
  const [filters, setFilters] = useState({});
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null); // {} = add, { suggestion } = from a suggestion
  const [savedCount, setSavedCount] = useState(0);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await retroApi.getAll({ ...filters, search: search || undefined, page: page.current, per_page: page.pageSize });
      setRows(data.retros.data);
      setTotal(data.retros.total);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  const countSuggestions = async () => {
    if (!perms.canCreate) return;
    try {
      const { data } = await retroApi.suggestions();
      setSuggestionCount(data.suggestions.length);
    } catch {
      // the badge is only a hint
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
        const { data } = await retroApi.getOptions();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      }
      await countSuggestions();
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };
  const changed = () => { fetchRows(); countSuggestions(); };

  const openEdit = async (id) => {
    try {
      const { data } = await retroApi.show(id);
      setEditing(data.retro);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const remove = async (record) => {
    try {
      const { data } = await retroApi.delete(record.id);
      message.success(data.message);
      changed();
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
      title: 'Type',
      dataIndex: 'retro_type',
      width: 230,
      render: (v, r) => (
        <Space size={4} wrap>
          {retroLabel(r)}
          {!Number(r.taxable) && <Tag>Non-taxable</Tag>}
          {r.compensation_id && <Tooltip title='From a back-dated salary change'><Tag color='cyan'>Salary</Tag></Tooltip>}
        </Space>
      ),
    },
    { title: 'Period', key: 'period', width: 190, render: (_, r) => `${formatDate(r.period_from)} – ${formatDate(r.period_to)}` },
    {
      title: 'Amount',
      dataIndex: 'amount',
      width: 160,
      align: 'right',
      render: (v, r) => <Space size={4}><Tag color={ADJUSTMENT_COLORS[r.adjustment]}>{r.adjustment === 'Earning' ? '+' : '−'}</Tag>{peso(v)}</Space>,
    },
    { title: 'Cut-off', dataIndex: 'cutoff_code', width: 110, render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', width: 110, render: (v) => <Tag color={RETRO_STATUS_COLORS[v]}>{v}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title='View'>
            <Button size='small' color='blue' variant='outlined' icon={<EyeOutlined />} onClick={() => setViewing(r.id)} />
          </Tooltip>
          {perms.canEdit && r.status === 'Open' && (
            <Tooltip title='Edit'>
              <Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => openEdit(r.id)} />
            </Tooltip>
          )}
          {perms.canDelete && r.status !== 'Applied' && (
            <Popconfirm
              title='Delete this retro?'
              description={r.compensation_id ? 'Only for a wrong entry — its salary change shows up in Suggestions again.' : 'Only for a wrong entry — otherwise cancel it.'}
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
            options={options.statuses.map((s) => ({ value: s, label: s }))}
            style={{ width: 140 }}
          />
          <Select
            allowClear
            placeholder='All types'
            value={filters.retro_type}
            onChange={(v) => setFilter({ retro_type: v })}
            options={Object.keys(options.types).map((t) => ({ value: t, label: t }))}
            style={{ width: 190 }}
          />
          <Select
            allowClear
            placeholder='All cut-offs'
            value={filters.payroll_cutoff_id}
            onChange={(v) => setFilter({ payroll_cutoff_id: v })}
            options={cutoffOptions(options.cutoffs)}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 240 }}
          />
          <Select
            allowClear
            placeholder='All branches'
            value={filters.branch_id}
            onChange={(v) => setFilter({ branch_id: v })}
            options={options.branches.map((b) => ({ value: b.id, label: b.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 180 }}
          />
          <Input.Search
            placeholder='Employee code or name'
            allowClear
            onSearch={(v) => { setSearch(v.trim()); setPage((p) => ({ ...p, current: 1 })); }}
            style={{ width: 210 }}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={changed} loading={loading}>Refresh</Button>
          {perms.canCreate && (
            <Badge count={suggestionCount} size='small'>
              <Button icon={<BulbOutlined />} onClick={() => setSuggestionsOpen(true)}>Suggestions</Button>
            </Badge>
          )}
          {perms.canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={() => setEditing({})}>Add Retro</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1150 }}
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
      <RetroFormModal
        open={!!editing}
        retro={editing?.id ? editing : null}
        suggestion={editing?.suggestion || null}
        options={options}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setSavedCount((n) => n + 1); changed(); }}
      />
      <RetroDetailsModal
        retroId={viewing}
        refreshKey={savedCount}
        perms={perms}
        onClose={() => setViewing(null)}
        onChanged={changed}
        onEdit={(r) => setEditing(r)}
      />
      <RetroSuggestionsModal
        open={suggestionsOpen}
        refreshKey={savedCount}
        onClose={() => setSuggestionsOpen(false)}
        onCreate={(s) => setEditing({ suggestion: s })}
        onChanged={changed}
      />
    </div>
  );
};

export default RetroIndex;
