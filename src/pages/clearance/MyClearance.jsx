import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Card, Row, Col, Descriptions, Progress, Statistic, Alert, Table, Tag, Select, Space, Button, Spin, Typography, App,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import myClearanceApi from '../../services/clearance/myClearanceApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate, DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { peso } from '../payroll/payrollHelpers';
import ApprovalSteps from '../../components/approval/ApprovalSteps';
import ExpandIcon from '../../components/ExpandIcon';
import {
  CLEARANCE_STATUS_COLORS, ITEM_STATUS_COLORS, ACCOUNTABILITY_STATUS_COLORS, statusLabel, isOverdue, separationLabel,
} from './clearanceHelpers';
import ClearanceStageSteps from './ClearanceStageSteps';

// My Workspace → My Clearance (/my-clearance, any linked account): the
// employee's own clearance — where it is in the process, each component's
// sign-off and in-charge, their accountabilities and the final approval.
// Read-only: signing, accountabilities and approval stay on the Clearance
// page (HR / in-charges / approvers). Several clearances (e.g. one
// cancelled, one restarted) → a picker, latest first.
export default function MyClearance() {
  const { message } = App.useApp();
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadOne = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await myClearanceApi.getById(id);
      setData(res);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  const loadAll = useCallback(async () => {
    try {
      const { data: res } = await myClearanceApi.getAll();
      setList(res);
      const id = res.clearances[0]?.id || null;
      setSelected(id);
      await loadOne(id);
    } catch (error) {
      handleApiError(error, message);
    }
  }, [loadOne, message]);

  useEffect(() => {
    const run = async () => { await loadAll(); };
    run();
  }, [loadAll]);

  if (!list) return <Spin style={{ display: 'block', margin: '48px auto' }} />;
  if (!list.linked) {
    return <Alert type='info' showIcon title='Your account is not linked to an employee record, so there is no clearance to show. Ask HR to link it (User Accounts → Employee).' />;
  }
  if (!list.clearances.length) {
    return <Alert type='info' showIcon title='No clearance has been started for you.' description='HR starts your clearance when you leave the company; its progress shows here.' />;
  }

  const c = data?.clearance;
  const applicable = (data?.items || []).filter((i) => i.status !== 'Not Applicable');
  const cleared = applicable.filter((i) => i.status === 'Cleared').length;
  const current = (data?.items || []).find((i) => i.is_current);

  const componentColumns = [
    { title: '#', dataIndex: 'sequence', width: 50 },
    { title: 'Component', dataIndex: 'department_name', render: (v, i) => <>{v} {i.is_current && <Tag color='blue'>Current</Tag>}</> },
    { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <Tag color={ITEM_STATUS_COLORS[s]}>{s === 'Not Applicable' ? 'N/A' : s}</Tag> },
    {
      title: 'Signed By',
      key: 'signed',
      render: (_, i) => {
        if (i.status === 'Cleared') return `${i.cleared_by || '—'} · ${i.cleared_at ? dayjs(i.cleared_at).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : ''}`;
        if (i.status === 'Pending') return <Typography.Text type='secondary'>{i.signatories?.length ? `In-charge: ${i.signatories.join(', ')}` : 'HR signs'}</Typography.Text>;
        return '—';
      },
    },
    { title: 'Accountabilities', key: 'acc', width: 140, align: 'right', render: (_, i) => i.accountabilities.length || '—' },
  ];
  const accountabilityColumns = [
    { title: 'Accountability', dataIndex: 'description' },
    { title: 'Amount', dataIndex: 'amount', width: 120, align: 'right', render: (v) => peso(v) },
    { title: 'Status', dataIndex: 'status', width: 170, render: (s) => <Tag color={ACCOUNTABILITY_STATUS_COLORS[s]}>{s}</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', render: (v) => v || '—' },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        {list.clearances.length > 1 ? (
          <Select
            value={selected}
            onChange={(id) => { setSelected(id); loadOne(id); }}
            options={list.clearances.map((r) => ({ value: r.id, label: `${r.clearance_no} · ${statusLabel(r.status, r.current_level)}` }))}
            style={{ width: 280 }}
          />
        ) : <span />}
        <Button icon={<ReloadOutlined />} onClick={() => loadOne(selected)} loading={loading}>Refresh</Button>
      </Space>

      {!data ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <Spin spinning={loading}>
          <Card size='small' style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]} align='middle'>
              <Col xs={24} lg={17}>
                <Descriptions
                  size='small'
                  column={{ xs: 1, sm: 2, xl: 3 }}
                  items={[
                    { key: 'no', label: 'Clearance No.', children: <strong>{c.clearance_no}</strong> },
                    { key: 'status', label: 'Status', children: <Tag color={CLEARANCE_STATUS_COLORS[c.status]}>{statusLabel(c.status, c.current_level)}{current ? ` · ${current.department_name}` : ''}</Tag> },
                    { key: 'type', label: 'Separation', children: separationLabel(c) },
                    { key: 'last', label: 'Last Day of Work', children: formatDate(c.last_day_of_work) },
                    { key: 'due', label: 'Clear By', children: isOverdue(c) ? <Tag color='red'>{`${formatDate(c.due_date)} · past due`}</Tag> : formatDate(c.due_date) },
                    ...(c.cleared_at ? [{ key: 'cleared', label: 'Cleared On', children: formatDate(c.cleared_at) }] : []),
                  ]}
                />
              </Col>
              <Col xs={24} lg={7}>
                <Space orientation='vertical' style={{ width: '100%' }}>
                  <Progress
                    percent={applicable.length ? Math.round((cleared / applicable.length) * 100) : 0}
                    format={() => `${cleared}/${applicable.length}`}
                    status={c.status === 'Cancelled' ? 'exception' : (c.status === 'Cleared' ? 'success' : 'active')}
                  />
                  <Row gutter={16}>
                    <Col span={12}><Statistic title='Unsettled' value={peso(data.totals.unsettled)} styles={{ content: { fontSize: 16 } }} /></Col>
                    <Col span={12}><Statistic title='Deduct from Final Pay' value={peso(data.totals.deduct)} styles={{ content: { fontSize: 16 } }} /></Col>
                  </Row>
                </Space>
              </Col>
            </Row>
            {c.status === 'Cancelled' && (
              <Alert type='warning' showIcon style={{ marginTop: 12 }} title={`Cancelled${c.action_remarks ? ` — ${c.action_remarks}` : ''}`} />
            )}
            <ClearanceStageSteps clearance={c} items={data.items} approval={data.approval} />
          </Card>

          <Typography.Title level={5}>Components</Typography.Title>
          <Table
            rowKey='id'
            size='small'
            pagination={false}
            columns={componentColumns}
            dataSource={data.items}
            scroll={{ x: 'max-content' }}
            expandable={{
              expandIcon: (props) => <ExpandIcon {...props} />,
              rowExpandable: (i) => i.accountabilities.length > 0,
              expandedRowRender: (i) => <Table rowKey='id' size='small' pagination={false} columns={accountabilityColumns} dataSource={i.accountabilities} />,
            }}
            style={{ marginBottom: 16 }}
          />

          <Typography.Title level={5}>Final Approval</Typography.Title>
          <ApprovalSteps approval={data.approval} chartName='Clearance' />
        </Spin>
      )}
    </div>
  );
}
