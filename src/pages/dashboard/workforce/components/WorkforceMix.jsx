import { Row, Col, Typography } from 'antd';
import ChartCard from './ChartCard';
import { ShareBar } from './workforceCharts';

const { Text } = Typography;

// Fixed entity order → fixed colors (never re-colored by rank or filter).
const RANK_ORDER = ['Rank & File', 'Supervisory', 'Managerial', 'Top Management'];
const EMPLOYMENT_ORDER = ['Regular', 'Probationary', 'Agency', 'Contractual'];
const GENDER_ORDER = ['Male', 'Female'];

// Rank, employment type and gender as 100% share bars.
export default function WorkforceMix({ composition }) {
  return (
    <ChartCard title='Workforce Mix'>
      <Row gutter={[32, 20]}>
        <Col xs={24} lg={10}><Text strong>Rank</Text><div style={{ marginTop: 8 }}><ShareBar rows={composition.rank} order={RANK_ORDER} /></div></Col>
        <Col xs={24} md={12} lg={7}><Text strong>Employment Type</Text><div style={{ marginTop: 8 }}><ShareBar rows={composition.employment_type} order={EMPLOYMENT_ORDER} /></div></Col>
        <Col xs={24} md={12} lg={7}><Text strong>Gender</Text><div style={{ marginTop: 8 }}><ShareBar rows={composition.gender} order={GENDER_ORDER} /></div></Col>
      </Row>
    </ChartCard>
  );
}
