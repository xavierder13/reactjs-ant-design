import { Row, Col } from 'antd';
import StatTile from '../../workforce/components/StatTile';
import { soften } from '../../chartTheme';

// vueportal KpiCards.vue, drawn as the Workforce Dashboard's stat tiles: the
// card color (lightened) marks the top bar and icon badge; values stay in ink.
export default function KpiCards({ kpiCards }) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
      {kpiCards.map((k) => (
        <Col key={k.label} xs={12} sm={8} md={4}>
          <StatTile tone={soften(k.hexColor)} icon={k.icon} label={k.label} value={k.value} sub={k.sub} />
        </Col>
      ))}
    </Row>
  );
}
