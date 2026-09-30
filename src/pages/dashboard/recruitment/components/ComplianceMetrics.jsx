import { Row, Col, Card, Typography } from 'antd';
import ChartBox from './ChartBox';
import { LINE, lineScales } from '../../chartTheme';

const { Text } = Typography;

// vueportal ComplianceMetrics.vue — right column reserved there for a future card.
export default function ComplianceMetrics({ nonCompliantByMonth }) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={12}>
        <Card size='small' title='Non-Compliant Trend by Month' style={{ borderRadius: 8 }}
          extra={<Text type='secondary' style={{ fontSize: 11 }}>Rising = process issue</Text>}>
          <ChartBox
            type='line'
            options={{ interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false } }, scales: lineScales('', true) }}
            data={{ labels: nonCompliantByMonth.labels, datasets: [{ label: 'Non-Compliant', data: nonCompliantByMonth.data, borderColor: '#f5222d', backgroundColor: 'rgba(245,34,45,0.1)', fill: true, ...LINE }] }}
          />
        </Card>
      </Col>
    </Row>
  );
}
