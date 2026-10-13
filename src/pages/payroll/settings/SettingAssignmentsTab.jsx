import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Table, Tag, Button, Space, Tooltip, Select, Input, Modal, Alert, Typography, App,
} from 'antd';
import { EditOutlined, CloseCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import payrollSettingApi from '../../../services/payroll/payrollSettingApi';
import handleApiError from '../../../utils/handleApiError';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../../utils/tablePagination';
import { formatDate } from '../../../utils/formatDate';
import { ASSIGNED_SETTING_FIELDS, ASSIGN_SCOPES, assignScopeLabel, settingValueText, cutoffLabel } from '../payrollHelpers';
import SettingAssignmentFormModal from './SettingAssignmentFormModal';

const SCOPE_COLORS = { employee: 'gold', position: 'cyan', branch: 'geekblue', company: 'purple' };
const STATUS_COLORS = { Active: 'green', Cancelled: 'default' };

// Payroll Settings → Assigned Settings: an employee / position / branch /
// company's own working days a year, hours per day and contribution timing
// from a start cut-off. Each field is taken from the most specific level that
// sets it (employee, position, branch, company), else from the General tab.
// No approval; changes are in the Audit Trail (Payroll).
const SettingAssignmentsTab = ({ canEdit }) => {
  const { message } = App.useApp();
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
      const { data } = await payrollSettingApi.assignmentIndex({ ...filters, status: filters.status || 'All' });
      setRows(data.assignments);
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
        const { data } = await payrollSettingApi.assignmentOptions();
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
      const { data } = await payrollSettingApi.assignmentCancel(cancelling.id, cancelReason.trim());
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
    ? rows.filter((r) => `${r.scope_name} ${r.start_cutoff?.code || ''} ${r.end_cutoff?.code || ''} ${r.reason || ''}`.toLowerCase().includes(term))
    : rows;

  const columns = [
    {
      title: 'Applies To',
      key: 'scope',
      render: (_, r) => (
        <div>
          <Tag color={SCOPE_COLORS[r.scope]}>{assignScopeLabel(r.scope)}</Tag>
          <span>{r.scope_name || '—'}</span>
        </div>
      ),
    },
    {
      title: 'Coverage',
      key: 'coverage',
      width: 240,
      render: (_, r) => {
        if (r.coverage === 'dates') {
          return <Tooltip title='The cut-offs ending in these dates'>{`${formatDate(r.effective_date)} – ${formatDate(r.end_date)}`}</Tooltip>;
        }
        if (r.end_cutoff_id === r.start_cutoff_id) return <Tooltip title={cutoffLabel(r.start_cutoff)}>{`${r.start_cutoff?.code} only`}</Tooltip>;
        return `${r.start_cutoff?.code} – ${r.end_cutoff?.code}`;
      },
    },
    {
      title: 'Settings',
      key: 'settings',
      render: (_, r) => (
        <Space size={[4, 4]} wrap>
          {ASSIGNED_SETTING_FIELDS.filter((f) => r[f.key] !== null && r[f.key] !== undefined).map((f) => (
            <Tag key={f.key}>{`${f.label}: ${settingValueText(f.key, r[f.key])}`}</Tag>
          ))}
        </Space>
      ),
    },
    { title: 'Reason / Memo', dataIndex: 'reason', ellipsis: true, render: (v) => v || '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s, r) => {
        const ended = s === 'Active' && r.end_date && r.end_date < dayjs().format('YYYY-MM-DD');
        return (
          <Tooltip title={r.status === 'Cancelled' ? `${r.cancel_reason} — ${r.canceller?.name || ''}` : (ended ? 'Its last cut-off has passed — the next level applies now' : null)}>
            <Tag color={ended ? 'default' : STATUS_COLORS[s]}>{ended ? 'Ended' : s}</Tag>
          </Tooltip>
        );
      },
    },
    { title: 'Set By', key: 'creator', width: 150, render: (_, r) => r.creator?.name || '—' },
    ...(canEdit ? [{
      title: 'Actions',
      width: 90,
      render: (_, record) => (record.status === 'Active' ? (
        <Space>
          <Tooltip title='Change'>
            <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title='Cancel'>
            <Button
              color='orange'
              variant='outlined'
              icon={<CloseCircleOutlined />}
              size='small'
              onClick={() => { setCancelReason(''); setCancelling(record); }}
            />
          </Tooltip>
        </Space>
      ) : null),
    }] : []),
  ];

  return (
    <div>
      <Alert
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
        title='Which settings an employee gets'
        description={'Each setting comes from the most specific level that sets it: the employee, then their position, branch and company '
          + '(by their current branch and position), else the General tab. An assignment applies only to its coverage — Cut-offs (From – To; one '
          + 'cut-off = that payroll only) or Dates (the cut-offs ending in them) — and after it the next level applies again; a blank setting follows the '
          + 'next level. Approved payrolls keep what they were computed with.'}
      />
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select
            allowClear
            placeholder='All levels'
            value={filters.scope}
            onChange={(v) => setFilter({ scope: v })}
            options={ASSIGN_SCOPES}
            style={{ width: 150 }}
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
            placeholder='Name, cut-off or reason'
            allowClear
            onSearch={(v) => setSearch(v.trim())}
            style={{ width: 230 }}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canEdit && <Button type='primary' icon={<PlusOutlined />} onClick={openCreate} disabled={!options}>Assign Settings</Button>}
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
      <SettingAssignmentFormModal open={formOpen} record={editing} options={options} onClose={closeForm} onSaved={handleSaved} />
      <Modal
        keyboard={false}
        open={!!cancelling}
        title='Cancel Assigned Settings'
        okText='Cancel Assignment'
        okButtonProps={{ danger: true }}
        confirmLoading={cancelSaving}
        cancelText='Back'
        onOk={confirmCancel}
        onCancel={() => setCancelling(null)}
        destroyOnHidden
      >
        <Typography.Paragraph>
          Payrolls generated from now on use the next level that applies (a broader group, or the General tab). It stays in the list as Cancelled.
        </Typography.Paragraph>
        <Input.TextArea rows={2} maxLength={2000} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder='Reason (required)' />
      </Modal>
    </div>
  );
};

export default SettingAssignmentsTab;
