import { Row, Col } from 'antd';
import { TeamOutlined, SafetyCertificateOutlined, UserOutlined, CalendarOutlined, FieldTimeOutlined } from '@ant-design/icons';
import StatTile from './StatTile';
import { TONES } from './workforceTones';

const fmt = (n) => (n ?? 0).toLocaleString();

// Active headcount + probationary share, gender, average age and tenure.
export default function HeadcountSummary({ headcount }) {
  return (
    <Row gutter={[12, 12]}>
      <Col flex='1 1 200px'><StatTile hero tone={TONES.people} icon={<TeamOutlined />} label='Active Headcount' value={fmt(headcount.active)} /></Col>
      <Col flex='1 1 180px'><StatTile tone={TONES.people} icon={<SafetyCertificateOutlined />} label='Probationary' value={`${headcount.probationary_pct}%`} sub={`${fmt(headcount.probationary)} probationary · ${fmt(headcount.regular)} regular`} /></Col>
      <Col flex='1 1 180px'><StatTile tone={TONES.people} icon={<UserOutlined />} label='Female / Male' value={`${fmt(headcount.female)} / ${fmt(headcount.male)}`} /></Col>
      <Col flex='1 1 160px'><StatTile tone={TONES.people} icon={<CalendarOutlined />} label='Average Age' value={headcount.avg_age ?? '—'} sub={headcount.unknown_age ? `${headcount.unknown_age} without a valid birth date` : 'years'} /></Col>
      <Col flex='1 1 160px'><StatTile tone={TONES.people} icon={<FieldTimeOutlined />} label='Average Length of Service' value={headcount.avg_tenure_years ?? '—'} sub='years' /></Col>
    </Row>
  );
}
