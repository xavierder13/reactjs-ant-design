import { Row, Col, Table, Tag, Typography } from 'antd';
import { AuditOutlined, TeamOutlined, UserDeleteOutlined } from '@ant-design/icons';
import StatTile from './StatTile';
import ChartCard from './ChartCard';
import { MonthlyCountChart, TrendLineChart } from './workforceCharts';
import { TONES } from './workforceTones';

const { Text } = Typography;
const fmt = (n) => (n ?? 0).toLocaleString();
const pct = (v) => (v == null ? '—' : `${v}%`);

const reasonColumns = [
  { title: 'Reason', dataIndex: 'label' },
  { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={v === 'Voluntary' ? 'blue' : v === 'Involuntary' ? 'orange' : 'default'}>{v}</Tag> },
  { title: 'Left', dataIndex: 'left', align: 'right', defaultSortOrder: 'descend', sorter: (a, b) => a.left - b.left },
  { title: 'Interviewed', dataIndex: 'interviewed', align: 'right', sorter: (a, b) => a.interviewed - b.interviewed },
  { title: 'Coverage', dataIndex: 'coverage', align: 'right', render: pct, sorter: (a, b) => (a.coverage ?? -1) - (b.coverage ?? -1) },
];

// Exit Interview Analysis (Offboarding KPI 6a): exit interviews conducted in
// a month (offboarding Exit Interview Date) ÷ employees who left that month,
// over the last 12 months; and, per resignation reason, how many leavers had
// an exit interview. `months` carries the "(to date)" label.
export default function ExitInterviews({ data: x, months }) {
  return (
    <>
      <Row gutter={[12, 12]}>
        <Col flex='1 1 200px'>
          <StatTile tone={TONES.people} icon={<AuditOutlined />} label='Exit Interview Rate' value={pct(x.rate)}
            sub={`${fmt(x.interviews)} interviews ÷ ${fmt(x.left)} employees who left`} />
        </Col>
        <Col flex='1 1 200px'>
          <StatTile tone={TONES.people} icon={<TeamOutlined />} label='Leavers Interviewed' value={pct(x.coverage)}
            sub={`${fmt(x.interviewed_leavers)} of ${fmt(x.left)} leavers have an exit interview`} />
        </Col>
        <Col flex='1 1 200px'>
          <StatTile tone={TONES.warning} icon={<UserDeleteOutlined />} label='Not Interviewed' value={fmt(x.left - x.interviewed_leavers)}
            sub='leavers with no Exit Interview Date' />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}>
          <ChartCard title='Exit Interview Rate per Month'>
            <TrendLineChart months={months} field='rate' label='Exit interview rate' suffix='%' />
          </ChartCard>
        </Col>
        <Col xs={24} lg={14}>
          <ChartCard title='Exit Interviews vs. Employees Who Left'>
            <MonthlyCountChart months={months} series={[{ field: 'left', label: 'Left' }, { field: 'interviews', label: 'Exit interviews' }]} />
          </ChartCard>
        </Col>
        <Col xs={24}>
          <ChartCard title='Exit Interviews by Reason for Leaving'>
            <Table rowKey='label' size='small' columns={reasonColumns} dataSource={x.by_reason} pagination={{ pageSize: 10, showSizeChanger: true }} scroll={{ x: 'max-content' }} />
            <Text type='secondary' style={{ fontSize: 12 }}>
              Reasons as recorded on each leaver&apos;s latest offboarding (Voluntary / Involuntary as in Attrition). An exit interview counts in the month of its Exit Interview Date; a leaver counts in the month of Date Resigned.
            </Text>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
