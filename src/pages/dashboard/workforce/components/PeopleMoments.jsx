import { Row, Col, Table, Tag, Typography } from 'antd';
import { GiftOutlined, TrophyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ChartCard from './ChartCard';
import { IconBadge } from './StatTile';
import { TONES } from './workforceTones';

const { Text } = Typography;

const when = (date) => {
  const days = dayjs(date).diff(dayjs().startOf('day'), 'day');
  if (days === 0) return <Tag color='green' style={{ margin: 0 }}>Today</Tag>;
  if (days === 1) return <Tag color='blue' style={{ margin: 0 }}>Tomorrow</Tag>;
  return dayjs(date).format('MM/DD');
};

const person = { title: 'Employee', dataIndex: 'name', render: (name, r) => (<><div>{name}</div><Text type='secondary' style={{ fontSize: 12 }}>{[r.position, r.branch].filter(Boolean).join(' · ')}</Text></>) };

const birthdayColumns = [{ title: 'Date', dataIndex: 'date', width: 96, render: when }, person];
const anniversaryColumns = [
  { title: 'Date', dataIndex: 'date', width: 96, render: when },
  person,
  { title: 'Years', dataIndex: 'years', align: 'right', render: (y) => (y % 5 === 0 ? <Tag color='gold' style={{ margin: 0 }}>{y} yrs</Tag> : y) },
];

const Title = ({ icon, tone, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconBadge icon={icon} tone={tone} size={24} />{children}</span>
);

// Upcoming birthdays and work anniversaries of active employees.
export default function PeopleMoments({ moments }) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <ChartCard title={<Title icon={<GiftOutlined />} tone={TONES.people}>Birthdays · {moments.birthdays.length}</Title>}>
          <Table rowKey='id' size='small' columns={birthdayColumns} dataSource={moments.birthdays} pagination={{ pageSize: 8, hideOnSinglePage: true }} locale={{ emptyText: `No birthdays in the next ${moments.days} days.` }} />
        </ChartCard>
      </Col>
      <Col xs={24} lg={12}>
        <ChartCard title={<Title icon={<TrophyOutlined />} tone={TONES.growth}>Work Anniversaries · {moments.anniversaries.length}</Title>}>
          <Table rowKey='id' size='small' columns={anniversaryColumns} dataSource={moments.anniversaries} pagination={{ pageSize: 8, hideOnSinglePage: true }} locale={{ emptyText: `No work anniversaries in the next ${moments.days} days.` }} />
        </ChartCard>
      </Col>
    </Row>
  );
}
