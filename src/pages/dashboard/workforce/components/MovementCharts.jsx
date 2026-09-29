import { Row, Col } from 'antd';
import ChartCard from './ChartCard';
import MonthlyFiguresTable from './MonthlyFiguresTable';
import { MovementBarChart, TrendLineChart } from './workforceCharts';

// Hires vs separations, monthly turnover, headcount trend + the table view.
// Separate charts, one axis each (no dual axis).
export default function MovementCharts({ months }) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}><ChartCard title='Hires and Separations per Month'><MovementBarChart months={months} /></ChartCard></Col>
      <Col xs={24} lg={10}><ChartCard title='Monthly Turnover Rate'><TrendLineChart months={months} field='turnover_rate' label='Turnover' suffix='%' /></ChartCard></Col>
      <Col xs={24} lg={10}><ChartCard title='Headcount Trend (end of month)'><TrendLineChart months={months} field='headcount_end' label='Headcount' /></ChartCard></Col>
      <Col xs={24} lg={14}><ChartCard title='Monthly Figures'><MonthlyFiguresTable months={months} /></ChartCard></Col>
    </Row>
  );
}
