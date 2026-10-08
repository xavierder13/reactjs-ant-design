import { useState } from 'react';
import { Segmented, Table, Typography } from 'antd';
import ChartCard from './ChartCard';
import { tablePagination } from '../../../../utils/tablePagination';

const { Text } = Typography;
const fmt = (n) => (n ?? 0).toLocaleString();

const GROUPS = [
  { label: 'Branch', value: 'branch' },
  { label: 'Department', value: 'department' },
  { label: 'Position', value: 'position' },
];

const columnsFor = (groupLabel) => [
  { title: groupLabel, dataIndex: 'label', sorter: (a, b) => a.label.localeCompare(b.label) },
  { title: 'Headcount', dataIndex: 'headcount', align: 'right', render: fmt, sorter: (a, b) => a.headcount - b.headcount },
  { title: 'Separations', dataIndex: 'separations', align: 'right', defaultSortOrder: 'descend', sorter: (a, b) => a.separations - b.separations },
  { title: 'Voluntary', dataIndex: 'voluntary', align: 'right', sorter: (a, b) => a.voluntary - b.voluntary },
  { title: 'Involuntary', dataIndex: 'involuntary', align: 'right', sorter: (a, b) => a.involuntary - b.involuntary },
  { title: 'Others', dataIndex: 'other', align: 'right', sorter: (a, b) => a.other - b.other },
  { title: 'Left < 6 months', dataIndex: 'early', align: 'right', sorter: (a, b) => a.early - b.early },
  {
    title: 'Turnover', dataIndex: 'turnover_rate', align: 'right',
    render: (v) => (v == null ? '—' : `${v}%`),
    sorter: (a, b) => (a.turnover_rate ?? -1) - (b.turnover_rate ?? -1),
  },
];

// 12-month turnover per branch / department / position (current assignment).
export default function TurnoverTable({ turnoverBy }) {
  const [group, setGroup] = useState('branch');
  const groupLabel = GROUPS.find((g) => g.value === group).label;
  return (
    <ChartCard title='Turnover by Group' extra={<Segmented size='small' options={GROUPS} value={group} onChange={setGroup} />}>
      <Table
        key={group}
        rowKey='label' size='small' scroll={{ x: 'max-content' }}
        columns={columnsFor(groupLabel)} dataSource={turnoverBy[group]}
        pagination={tablePagination(10)}
      />
      <Text type='secondary' style={{ fontSize: 12 }}>
        Turnover = separations ÷ average of the group&apos;s headcount 12 months ago and today. Grouped by each employee&apos;s current record; rates on small headcounts swing widely.
      </Text>
    </ChartCard>
  );
}
