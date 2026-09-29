import { Row, Col } from 'antd';
import { LogoutOutlined, StopOutlined, HourglassOutlined, FileSearchOutlined } from '@ant-design/icons';
import StatTile from './StatTile';
import { TONES } from './workforceTones';

const fmt = (n) => (n ?? 0).toLocaleString();

// 12-month separations split by type, early attrition, and the top reason.
export default function AttritionSummary({ attrition }) {
  const type = (label) => attrition.by_type.find((t) => t.label === label) || { count: 0, pct: 0 };
  const voluntary = type('Voluntary');
  const involuntary = type('Involuntary');
  const top = attrition.by_reason[0];
  return (
    <Row gutter={[12, 12]}>
      <Col flex='1 1 170px'><StatTile tone={TONES.voluntary} icon={<LogoutOutlined />} label='Voluntary' value={fmt(voluntary.count)} sub={`${voluntary.pct}% of ${fmt(attrition.separations)} separations`} /></Col>
      <Col flex='1 1 170px'><StatTile tone={TONES.involuntary} icon={<StopOutlined />} label='Involuntary' value={fmt(involuntary.count)} sub={`${involuntary.pct}% · incl. end of contract, AWOL, dismissal`} /></Col>
      <Col flex='1 1 190px'><StatTile tone={TONES.serious} icon={<HourglassOutlined />} label={`Early Attrition (< ${attrition.early.months} months)`} value={`${attrition.early.pct}%`} sub={`${fmt(attrition.early.count)} left before completing probation`} /></Col>
      <Col flex='1 1 190px'><StatTile tone={TONES.neutral} icon={<FileSearchOutlined />} label='Top Reason' value={top ? fmt(top.count) : '—'} sub={top ? `${top.label} (${top.type.toLowerCase()})` : 'no separations'} /></Col>
    </Row>
  );
}
