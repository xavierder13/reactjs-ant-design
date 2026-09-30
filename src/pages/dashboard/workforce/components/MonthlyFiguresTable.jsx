import { Table } from 'antd';

const fmt = (n) => (n ?? 0).toLocaleString();

// Net follows the Net Change tile (growth green / loss orange), in darker
// shades that stay readable as table text (≥ 4.5:1); the +/− sign carries
// the meaning too, so color is never the only cue.
const NET_UP = '#237804';     // 5.6:1
const NET_DOWN = '#d4380d';   // 4.8:1
const netCell = (v) => {
  if (v > 0) return <span style={{ color: NET_UP, fontWeight: 600 }}>+{v}</span>;
  if (v < 0) return <span style={{ color: NET_DOWN, fontWeight: 600 }}>{v}</span>;
  return <span style={{ color: '#52514e' }}>0</span>;
};

const columns = [
  { title: 'Month', dataIndex: 'label' },
  { title: 'Hires', dataIndex: 'hires', align: 'right' },
  { title: 'Separations', dataIndex: 'separations', align: 'right' },
  { title: 'Net', dataIndex: 'net', align: 'right', render: netCell },
  { title: 'Headcount (end)', dataIndex: 'headcount_end', align: 'right', render: fmt },
  { title: 'Turnover', dataIndex: 'turnover_rate', align: 'right', render: (v) => `${v}%` },
];

// Table view of the 12-month trend (every charted value in writing).
export default function MonthlyFiguresTable({ months }) {
  return <Table rowKey='month' size='small' columns={columns} dataSource={months} pagination={false} scroll={{ x: 'max-content' }} />;
}
