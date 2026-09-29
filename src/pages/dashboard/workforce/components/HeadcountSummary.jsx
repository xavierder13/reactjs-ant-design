import { Row, Col } from 'antd';
import StatTile from './StatTile';

const fmt = (n) => (n ?? 0).toLocaleString();

// Active headcount + probationary share, gender, average age and tenure.
export default function HeadcountSummary({ headcount }) {
  return (
    <Row gutter={[12, 12]}>
      <Col flex='1 1 200px'><StatTile hero label='Active Headcount' value={fmt(headcount.active)} /></Col>
      <Col flex='1 1 180px'><StatTile label='Probationary' value={`${headcount.probationary_pct}%`} sub={`${fmt(headcount.probationary)} probationary · ${fmt(headcount.regular)} regular`} /></Col>
      <Col flex='1 1 180px'><StatTile label='Female / Male' value={`${fmt(headcount.female)} / ${fmt(headcount.male)}`} /></Col>
      <Col flex='1 1 160px'><StatTile label='Average Age' value={headcount.avg_age ?? '—'} sub={headcount.unknown_age ? `${headcount.unknown_age} without a valid birth date` : 'years'} /></Col>
      <Col flex='1 1 160px'><StatTile label='Average Length of Service' value={headcount.avg_tenure_years ?? '—'} sub='years' /></Col>
    </Row>
  );
}
