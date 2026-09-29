import { Table } from 'antd';

const fmt = (n) => (n ?? 0).toLocaleString();

const columns = [
  { title: 'Month', dataIndex: 'label' },
  { title: 'Hires', dataIndex: 'hires', align: 'right' },
  { title: 'Separations', dataIndex: 'separations', align: 'right' },
  { title: 'Net', dataIndex: 'net', align: 'right', render: (v) => (v > 0 ? `+${v}` : v) },
  { title: 'Headcount (end)', dataIndex: 'headcount_end', align: 'right', render: fmt },
  { title: 'Turnover', dataIndex: 'turnover_rate', align: 'right', render: (v) => `${v}%` },
];

// Table view of the 12-month trend (every charted value in writing).
export default function MonthlyFiguresTable({ months }) {
  return <Table rowKey='month' size='small' columns={columns} dataSource={months} pagination={false} scroll={{ x: 'max-content' }} />;
}
