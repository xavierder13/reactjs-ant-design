import { Card, Typography } from 'antd';

const { Text } = Typography;

// Headline number (hero = the one the section leads with).
export default function StatTile({ label, value, sub, hero }) {
  return (
    <Card size='small' style={{ height: '100%', borderRadius: 8 }} styles={{ body: { padding: '12px 14px' } }}>
      <Text type='secondary' style={{ fontSize: 12 }}>{label}</Text>
      <div style={{ fontSize: hero ? 40 : 24, fontWeight: 700, lineHeight: 1.2, marginTop: 2 }}>{value}</div>
      {sub && <Text type='secondary' style={{ fontSize: 12 }}>{sub}</Text>}
    </Card>
  );
}
