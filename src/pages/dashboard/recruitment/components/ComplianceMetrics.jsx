import { Row, Col, Card, Typography } from 'antd';
import ChartBox from './ChartBox';
import { CHART_OPTS } from '../chartSetup';

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
            options={CHART_OPTS}
            data={{ labels: nonCompliantByMonth.labels, datasets: [{ label: 'Non-Compliant', data: nonCompliantByMonth.data, borderColor: '#f5222d', backgroundColor: 'rgba(245,34,45,0.1)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 }] }}
          />
        </Card>
      </Col>
    </Row>
  );
}
