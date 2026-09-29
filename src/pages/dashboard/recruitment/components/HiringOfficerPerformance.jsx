import { Card, Table, Tag } from 'antd';
import { getRankColor } from '../chartSetup';

const columns = [
  { title: '#', dataIndex: 'rank', width: 40, render: (v) => <span style={{ fontWeight: 900, color: getRankColor(v) }}>{v}</span> },
  { title: 'Officer', dataIndex: 'officerName' },
  { title: 'Position', dataIndex: 'officerPosition' },
  { title: 'Hired', dataIndex: 'hiredCount', align: 'right' },
  { title: 'Avg Days', dataIndex: 'avgDays', align: 'right', render: (v) => <span style={{ color: v > 30 ? '#f5222d' : v > 20 ? '#faad14' : '#389e0d' }}>{v != null ? v + 'd' : 'N/A'}</span> },
  { title: 'Hire Rate', dataIndex: 'hireRate', align: 'right', render: (v) => <Tag color='success'>{v}%</Tag> },
];

// vueportal HiringOfficerPerformance.vue (top 15 officers)
export default function HiringOfficerPerformance({ hiringOfficerStats }) {
  return (
    <Card size='small' title='Hiring Officer Leaderboard' style={{ borderRadius: 8, marginBottom: 24 }}>
      {/* 10 per page with a visible pager; vueportal lists only the first 10 of up to 15 */}
      <Table size='small' rowKey='rank' dataSource={hiringOfficerStats} columns={columns} pagination={{ defaultPageSize: 10, hideOnSinglePage: true }} />
    </Card>
  );
}
