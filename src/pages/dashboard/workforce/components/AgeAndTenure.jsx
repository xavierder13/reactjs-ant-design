import { Row, Col } from 'antd';
import ChartCard from './ChartCard';
import { CountBarChart } from './workforceCharts';

// Age groups and length-of-service bands (band order from the backend).
export default function AgeAndTenure({ composition }) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}><ChartCard title='Age Groups'><CountBarChart rows={composition.age} horizontal={false} /></ChartCard></Col>
      <Col xs={24} lg={12}><ChartCard title='Length of Service'><CountBarChart rows={composition.tenure} horizontal={false} /></ChartCard></Col>
    </Row>
  );
}
