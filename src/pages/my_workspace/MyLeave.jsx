import { Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import leaveApi from '../../services/leave/leaveApi';
import LeaveFormModal from '../leave/LeaveFormModal';
import LeaveDetailsModal from '../leave/LeaveDetailsModal';
import { LEAVE_STATUSES, LEAVE_STATUS_COLORS, leaveDates, num } from '../leave/leaveHelpers';
import MyFilingList from './MyFilingList';

// My Workspace → My Leave: this year's balances, then the user's own leave
// filings (MyFilingList).
const Balances = ({ data }) => (
  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
    {(data.balances || []).map((b) => (
      <Col key={b.leave_type.id} xs={12} sm={8} lg={6} xl={4}>
        <Card size='small'>
          <Statistic
            title={<>{b.leave_type.name}{!b.leave_type.is_paid && <Tag style={{ marginLeft: 6 }}>Unpaid</Tag>}</>}
            value={b.balance === null ? '—' : num(b.balance)}
            suffix={b.credits === null ? null : <Typography.Text type='secondary' style={{ fontSize: 13 }}>{`/ ${num(b.credits)}`}</Typography.Text>}
          />
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            {b.credits === null ? 'No credits — not tracked' : `${num(b.used)} used · ${num(b.pending)} pending`}
          </Typography.Text>
        </Card>
      </Col>
    ))}
  </Row>
);

const CONFIG = {
  module: 'leave',
  prefix: 'leave',
  rowsKey: 'leaves',
  noun: 'leave',
  title: 'Leave',
  statuses: LEAVE_STATUSES,
  statusColors: LEAVE_STATUS_COLORS,
  api: leaveApi,
  FormModal: LeaveFormModal,
  formProps: (editing) => ({ leave: editing }),
  DetailsModal: LeaveDetailsModal,
  detailsIdProp: 'leaveId',
  header: (data) => (data.linked ? (
    <>
      <Typography.Title level={5} style={{ marginTop: 0 }}>{`Balances ${data.year}`}</Typography.Title>
      <Balances data={data} />
    </>
  ) : null),
  columns: [
    { title: 'Leave Type', key: 'type', render: (_, r) => r.leave_type?.name || '—' },
    { title: 'Dates', key: 'dates', render: (_, r) => leaveDates(r) },
    {
      title: 'Days',
      dataIndex: 'days',
      width: 110,
      render: (v, r) => (
        <>
          {num(v)}
          {Number(r.unpaid_days) > 0 && <div><Typography.Text type='warning' style={{ fontSize: 12 }}>{`${num(r.unpaid_days)} unpaid`}</Typography.Text></div>}
        </>
      ),
    },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
  ],
};

const MyLeave = () => <MyFilingList config={CONFIG} />;

export default MyLeave;
