import { Row, Col, Card, Typography } from 'antd';

const { Text } = Typography;

// vueportal KpiCards.vue
export default function KpiCards({ kpiCards }) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
      {kpiCards.map((k) => (
        <Col key={k.label} xs={12} sm={8} md={4}>
          <Card size='small' style={{ borderRadius: 8, borderTop: `3px solid ${k.hexColor}`, height: '100%' }} styles={{ body: { padding: '12px 14px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 16, marginRight: 4 }}>{k.icon}</span>
              <Text style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Text>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.hexColor, lineHeight: 1, marginTop: 4 }}>{k.value}</div>
            <Text type='secondary' style={{ fontSize: 11, marginTop: 4, display: 'block' }}>{k.sub}</Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
