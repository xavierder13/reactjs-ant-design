import { Row, Col } from 'antd';
import StatTile from './StatTile';

const fmt = (n) => (n ?? 0).toLocaleString();

// 12-month totals: hires, separations, net change, turnover rate.
export default function MovementSummary({ totals }) {
  return (
    <Row gutter={[12, 12]}>
      <Col flex='1 1 160px'><StatTile label='Hires' value={fmt(totals.hires)} /></Col>
      <Col flex='1 1 160px'><StatTile label='Separations' value={fmt(totals.separations)} /></Col>
      <Col flex='1 1 160px'><StatTile label='Net Change' value={totals.net > 0 ? `+${fmt(totals.net)}` : fmt(totals.net)} /></Col>
      <Col flex='1 1 180px'><StatTile label='Turnover Rate' value={`${totals.turnover_rate}%`} sub={`separations ÷ avg. headcount (${fmt(totals.avg_headcount)})`} /></Col>
    </Row>
  );
}
