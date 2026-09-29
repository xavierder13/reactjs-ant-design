import { Card } from 'antd';

export default function ChartCard({ title, extra, children }) {
  return <Card size='small' title={title} extra={extra} style={{ height: '100%', borderRadius: 8 }}>{children}</Card>;
}
