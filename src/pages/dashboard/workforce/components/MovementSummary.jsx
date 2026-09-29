import { Row, Col } from 'antd';
import { UserAddOutlined, UserDeleteOutlined, SwapOutlined, PercentageOutlined } from '@ant-design/icons';
import StatTile from './StatTile';
import { TONES } from './workforceTones';

const fmt = (n) => (n ?? 0).toLocaleString();

// 12-month totals: hires, separations, net change, turnover rate.
export default function MovementSummary({ totals }) {
  return (
    <Row gutter={[12, 12]}>
      <Col flex='1 1 160px'><StatTile tone={TONES.growth} icon={<UserAddOutlined />} label='Hires' value={fmt(totals.hires)} /></Col>
      <Col flex='1 1 160px'><StatTile tone={TONES.serious} icon={<UserDeleteOutlined />} label='Separations' value={fmt(totals.separations)} /></Col>
      <Col flex='1 1 160px'><StatTile tone={totals.net >= 0 ? TONES.growth : TONES.serious} icon={<SwapOutlined />} label='Net Change' value={totals.net > 0 ? `+${fmt(totals.net)}` : fmt(totals.net)} sub={totals.net >= 0 ? 'more hires than separations' : 'more separations than hires'} /></Col>
      <Col flex='1 1 180px'><StatTile tone={TONES.serious} icon={<PercentageOutlined />} label='Turnover Rate' value={`${totals.turnover_rate}%`} sub={`separations ÷ avg. headcount (${fmt(totals.avg_headcount)})`} /></Col>
    </Row>
  );
}
