import { Row, Col, Button, Table, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleOutlined, ClockCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import StatTile from './StatTile';
import ChartCard from './ChartCard';
import { TONES } from './workforceTones';
import useAuth from '../../../../hooks/useAuth';
import { tablePagination } from '../../../../utils/tablePagination';

const { Text } = Typography;
const fmt = (n) => (n ?? 0).toLocaleString();

const branchColumns = [
  { title: 'Branch', dataIndex: 'label' },
  { title: 'Overdue', dataIndex: 'overdue', align: 'right', sorter: (a, b) => a.overdue - b.overdue },
  { title: 'Due soon', dataIndex: 'due_soon', align: 'right', sorter: (a, b) => a.due_soon - b.due_soon },
];

// Probationary employees against their regularization date (Direct Hire Since
// + regularization_days, 180) (the For
// Regularization list's population), by status and by branch.
export default function RegularizationStatus({ regularization: r }) {
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const canOpenList = hasRole('Administrator') || hasPermission('employee-master-data-for-regularization');
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={10}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}><StatTile tone={TONES.critical} icon={<ExclamationCircleOutlined />} label='Overdue' value={fmt(r.overdue)} sub={`still probationary ${r.regularization_days}+ days after Direct Hire Since`} /></Col>
          <Col xs={24} sm={12}><StatTile tone={TONES.warning} icon={<ClockCircleOutlined />} label={`Due within ${r.due_days} days`} value={fmt(r.due_soon)} sub={`reach ${r.regularization_days} days by then`} /></Col>
          <Col xs={24}>
            <StatTile
              tone={TONES.people} icon={<SafetyCertificateOutlined />} label='Probationary (excl. Sales Specialists)'
              value={fmt(r.probationary)}
              sub={`${fmt(r.on_track)} not yet due${r.no_hire_date ? ` · ${r.no_hire_date} without a hire date` : ''}`}
            />
          </Col>
          {canOpenList && (
            <Col xs={24}><Button block onClick={() => navigate('/employees/for-regularization')}>Open For Regularization list</Button></Col>
          )}
        </Row>
      </Col>
      <Col xs={24} lg={14}>
        <ChartCard title='Overdue and Due Soon by Branch'>
          {r.by_branch.length ? (
            <Table rowKey='label' size='small' columns={branchColumns} dataSource={r.by_branch} pagination={tablePagination(8)} />
          ) : (
            <Text type='secondary'>No probationary employees are overdue or due soon.</Text>
          )}
        </ChartCard>
      </Col>
    </Row>
  );
}
