import { Card, Typography } from 'antd';

const { Text } = Typography;

// Headline number (hero = the one the section leads with). `tone` (a TONES
// color) draws the top accent bar and the icon badge; the value stays in ink.
export default function StatTile({ label, value, sub, hero, tone, icon }) {
  return (
    <Card
      size='small'
      style={{ height: '100%', borderRadius: 10, overflow: 'hidden', borderTop: tone ? `3px solid ${tone}` : undefined }}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && tone && <IconBadge icon={icon} tone={tone} />}
        <Text type='secondary' style={{ fontSize: 12 }}>{label}</Text>
      </div>
      <div style={{ fontSize: hero ? 44 : 26, fontWeight: 700, lineHeight: 1.2, marginTop: 6, color: '#1f1f1d' }}>{value}</div>
      {sub && <Text type='secondary' style={{ fontSize: 12 }}>{sub}</Text>}
    </Card>
  );
}

// Tinted round badge holding an icon in the tone color.
export function IconBadge({ icon, tone, size = 28 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: `${tone}1f`, color: tone, fontSize: size * 0.5,
    }}
    >
      {icon}
    </span>
  );
}
