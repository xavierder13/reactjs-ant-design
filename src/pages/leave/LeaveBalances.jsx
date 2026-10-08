import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Table, Tag, Button, Space, Tooltip, Select, Card, Empty, Typography, App } from 'antd';
import { EditOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import leaveApi from '../../services/leave/leaveApi';
import handleApiError from '../../utils/handleApiError';
import EmployeeSelect from '../manpower_request/request/EmployeeSelect';
import { LEAVE_STATUS_COLORS, leaveDates, num } from './leaveHelpers';
import LeaveCreditModal from './LeaveCreditModal';
import { tablePagination } from '../../utils/tablePagination';

const YEARS = [-1, 0, 1].map((d) => dayjs().year() + d).map((y) => ({ value: y, label: y }));

// One employee's leave for a year: per type credits / used / pending /
// balance (and why a type doesn't apply to them), HR's credit overrides,
// and that year's applications (with leave-list). Who can be picked:
// leave-balance-list-all = any employee (employee search);
// leave-balance-list = the user's subordinates and themself (from
// /leave/balance_scope).
const LeaveBalances = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const canEditCredits = isAdmin || hasPermission('leave-credits-edit');
  const canListLeaves = isAdmin || hasPermission('leave-list');
  const [scope, setScope] = useState(null); // { all, employees }

  const [employeeId, setEmployeeId] = useState(null);
  const [year, setYear]             = useState(dayjs().year());
  const [balances, setBalances]     = useState([]);
  const [leaves, setLeaves]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [editing, setEditing]       = useState(null);

  const load = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [{ data: b }, l] = await Promise.all([
        leaveApi.balances({ employee_id: employeeId, year }),
        canListLeaves
          ? leaveApi.getAll({ employee_id: employeeId, date_from: `${year}-01-01`, date_to: `${year}-12-31`, per_page: 100 })
          : Promise.resolve(null),
      ]);
      setBalances(b.balances);
      setLeaves(l ? l.data.leaves.data : []);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await leaveApi.balanceScope();
        setScope(data);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    run();
  }, [message]);

  useEffect(() => {
    const run = async () => { await load(); };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, year]);

  const balanceColumns = [
    {
      title: 'Leave Type',
      key: 'type',
      render: (_, r) => (
        <Space size={4} wrap>
          {r.leave_type.name}
          {!r.leave_type.is_paid && <Tag>Unpaid</Tag>}
          {!r.leave_type.active && <Tag>Inactive</Tag>}
        </Space>
      ),
    },
    {
      title: 'Credits',
      key: 'credits',
      width: 130,
      render: (_, r) => (r.credits === null ? <Typography.Text type='secondary'>No yearly balance</Typography.Text> : (
        <Tooltip title={r.is_override ? r.remarks || 'Set for this employee' : 'Leave type default'}>
          <span>{r.credits}{r.is_override && <Tag color='blue' style={{ marginLeft: 6 }}>Set</Tag>}</span>
        </Tooltip>
      )),
    },
    { title: 'Used', dataIndex: 'used', width: 80 },
    { title: 'Pending', dataIndex: 'pending', width: 90 },
    {
      title: 'Balance',
      dataIndex: 'balance',
      width: 90,
      render: (value) => (value === null ? '—' : <Typography.Text strong type={value <= 0 ? 'danger' : undefined}>{value}</Typography.Text>),
    },
    {
      title: 'Applies',
      dataIndex: 'ineligibility',
      render: (reason) => (reason ? <Tag color='orange'>{reason}</Tag> : <Tag color='green'>Eligible</Tag>),
    },
    ...(canEditCredits ? [{
      title: 'Actions',
      width: 80,
      render: (_, r) => (
        <Tooltip title='Edit credits'>
          <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => setEditing(r)} />
        </Tooltip>
      ),
    }] : []),
  ];

  const leaveColumns = [
    { title: 'Leave Type', key: 'type', render: (_, r) => r.leave_type?.name },
    { title: 'Dates', key: 'dates', render: (_, r) => leaveDates(r) },
    { title: 'Days', dataIndex: 'days', width: 70, render: num },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s) => <Tag color={LEAVE_STATUS_COLORS[s]}>{s}</Tag> },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <div style={{ width: 'min(380px, calc(100vw - 60px))' }}>
            {scope?.all ? (
              <EmployeeSelect value={employeeId} onChange={setEmployeeId} placeholder='Search employee' />
            ) : (
              <Select
                value={employeeId}
                onChange={setEmployeeId}
                loading={!scope}
                placeholder={scope && !scope.employees.length ? 'No subordinates to show' : 'Select a subordinate'}
                showSearch={{ optionFilterProp: 'label' }}
                style={{ width: '100%' }}
                options={(scope?.employees || []).map((e) => ({
                  value: e.id,
                  label: `${e.employee_code} - ${e.full_name} (${e.position?.name || 'No position'})${e.active ? '' : ' — Inactive'}`,
                }))}
              />
            )}
          </div>
          <Select value={year} onChange={setYear} options={YEARS} style={{ width: 100 }} />
        </Space>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} disabled={!employeeId}>Refresh</Button>
      </Space>

      {!employeeId ? (
        <Empty description='Pick an employee to see their leave balances.' />
      ) : (
        <>
          <Card size='small' title={`Balances — ${year}`} style={{ marginBottom: 16 }}>
            <Table
              rowKey={(r) => r.leave_type.id}
              size='small'
              columns={balanceColumns}
              dataSource={balances}
              loading={loading}
              pagination={false}
              scroll={{ x: 760 }}
            />
          </Card>
          {canListLeaves && (
          <Card size='small' title={`Leave Applications — ${year}`}>
            <Table
              rowKey='id'
              size='small'
              columns={leaveColumns}
              dataSource={leaves}
              loading={loading}
              pagination={tablePagination(10, { hideOnSinglePage: true })}
            />
          </Card>
          )}
        </>
      )}

      <LeaveCreditModal
        row={editing}
        employeeId={employeeId}
        year={year}
        onClose={() => setEditing(null)}
        onSaved={(fresh) => { setEditing(null); setBalances(fresh); }}
      />
    </div>
  );
};

export default LeaveBalances;
