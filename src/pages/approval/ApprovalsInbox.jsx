import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Tabs, Table, Badge, Button, Space, Tooltip, Typography, Empty, Spin, App } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import approvalInboxApi from '../../services/approval/approvalInboxApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate, DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import LeaveDetailsModal from '../leave/LeaveDetailsModal';
import TimeEntryDetailsModal from '../time_entry/TimeEntryDetailsModal';
import OvertimeDetailsModal from '../overtime/OvertimeDetailsModal';

// Approvals (/approvals, My Workspace): every document waiting for the
// user's decision, one tab per module (vueportal ApprovalInboxService — the
// bell's "For approval" queries, so the counts match the bell). Leave, time
// entries and overtime open their details modal here (approve / disapprove
// in it); the others open their own page, where they are approved.
// The active tab is kept in `?tab=`.
const OPEN_PAGE = {
  mrf: (id) => `/manpower-requests/${id}`,
  kpi: (id) => `/kpi-evaluations/${id}`,
  payroll_run: (id) => `/payroll-runs/${id}`,
  thirteenth_month: () => '/thirteenth-month',
  clearance: (id) => `/clearances/${id}`,
};
const COLUMN_TITLES = {
  leave: ['Leave Type', 'Dates'], time_entry: ['Entry Type', 'Time'], overtime: ['Day Type', 'Time'],
  mrf: ['MRF No.', 'Details'], kpi: ['Position', 'Period'], payroll_run: ['Payroll', 'Employees · Net Pay'],
  thirteenth_month: ['13th Month', 'Employees · Amount'], clearance: ['Clearance No.', 'Details'],
};
const DATE_TITLES = { leave: 'From', time_entry: 'Date', overtime: 'Date', mrf: 'Requested', kpi: 'Period End', payroll_run: 'Pay Date', thirteenth_month: 'Pay Date', clearance: 'Clear By' };

export default function ApprovalsInbox() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modules, setModules] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null); // { key, id }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await approvalInboxApi.inbox();
      setModules(data.modules || []);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const run = async () => { await load(); };
    run();
  }, [load]);

  const onActed = () => { setViewing(null); load(); };

  if (!modules) return <Spin style={{ display: 'block', margin: '48px auto' }} />;
  if (!modules.length) return <Empty description='You have no approval rights in any module.' />;

  const open = (key, id) => (OPEN_PAGE[key] ? navigate(OPEN_PAGE[key](id)) : setViewing({ key, id }));

  const columnsFor = (key) => {
    const [refTitle, detailTitle] = COLUMN_TITLES[key];
    const hasEmployee = !['payroll_run', 'thirteenth_month'].includes(key);
    return [
      { title: refTitle, dataIndex: 'reference', render: (v) => v || '—' },
      ...(hasEmployee ? [
        { title: key === 'mrf' ? 'Requested By' : 'Employee', dataIndex: 'employee', render: (v) => v || '—' },
        { title: 'Branch', dataIndex: 'branch', render: (v) => v || '—' },
      ] : []),
      { title: detailTitle, dataIndex: 'detail', render: (v) => v || '—' },
      { title: DATE_TITLES[key], dataIndex: 'date', width: 120, render: (v) => formatDate(v) },
      { title: 'Submitted', dataIndex: 'submitted_at', width: 170, render: (v) => (v ? dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : '—') },
      {
        title: 'Actions',
        key: 'actions',
        width: 80,
        render: (_, r) => (
          <Space>
            <Tooltip title={OPEN_PAGE[key] ? 'Open to decide' : 'View and decide'}>
              <Button color='blue' variant='outlined' size='small' icon={<EyeOutlined />} onClick={() => open(key, r.id)} />
            </Tooltip>
          </Space>
        ),
      },
    ];
  };

  const requested = searchParams.get('tab');
  const firstWithRows = modules.find((m) => m.rows.length)?.key || modules[0].key;
  const activeKey = modules.some((m) => m.key === requested) ? requested : firstWithRows;
  const total = modules.reduce((n, m) => n + m.rows.length, 0);

  return (
    <Card size='small'>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} wrap>
        <Typography.Text type='secondary'>{total} waiting for your decision</Typography.Text>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
      </Space>
      <Tabs
        activeKey={activeKey}
        onChange={(tab) => setSearchParams({ tab }, { replace: true })}
        items={modules.map((m) => ({
          key: m.key,
          label: <Space size={6}>{m.label}<Badge count={m.rows.length} showZero={false} size='small' /></Space>,
          children: (
            <Table
              rowKey='id'
              size='small'
              loading={loading}
              columns={columnsFor(m.key)}
              dataSource={m.rows}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: 'Nothing waiting for you' }}
            />
          ),
        }))}
      />

      <LeaveDetailsModal leaveId={viewing?.key === 'leave' ? viewing.id : null} onClose={() => setViewing(null)} onActed={onActed} />
      <TimeEntryDetailsModal entryId={viewing?.key === 'time_entry' ? viewing.id : null} onClose={() => setViewing(null)} onActed={onActed} />
      <OvertimeDetailsModal overtimeId={viewing?.key === 'overtime' ? viewing.id : null} onClose={() => setViewing(null)} onActed={onActed} />
    </Card>
  );
}
