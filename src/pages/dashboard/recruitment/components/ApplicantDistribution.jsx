import { Row, Col, Card } from 'antd';
import ChartBox from './ChartBox';
import { PRIMARY_GREEN } from '../chartSetup';
import { BAR, LINE, LEGEND, baseScales, lineScales, BLUE, soften } from '../../chartTheme';
import { monthlyApplicationTrend, ageGroupDistribution } from '../recruitmentMetrics';

// vueportal ApplicantDistribution.vue — Applications & Hires by Month | Age Group Distribution
export default function ApplicantDistribution({ dateFilteredApplicants, hiredApplicants }) {
  const trend = monthlyApplicationTrend(dateFilteredApplicants);
  const age = ageGroupDistribution(dateFilteredApplicants, hiredApplicants);
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={12}>
        <Card size='small' title='Applications & Hires by Month' style={{ borderRadius: 8 }}>
          <ChartBox
            type='line'
            options={{ interaction: { mode: 'index', intersect: false }, plugins: { legend: LEGEND }, scales: lineScales('', true) }}
            data={{
              labels: trend.labels,
              datasets: [
                { label: 'Applications', data: trend.applications, borderColor: '#1677ff', backgroundColor: 'rgba(22,119,255,0.1)', fill: true, ...LINE },
                { label: 'Hired', data: trend.hired, borderColor: PRIMARY_GREEN, backgroundColor: 'rgba(56,158,13,0.1)', fill: true, ...LINE },
              ],
            }}
          />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size='small' title='Age Group Distribution' style={{ borderRadius: 8 }}>
          <ChartBox
            type='bar'
            options={{ interaction: { mode: 'index', intersect: false }, plugins: { legend: LEGEND }, scales: baseScales(false) }}
            data={{
              labels: age.labels,
              datasets: [
                { label: 'Applied', data: age.applied, backgroundColor: BLUE, ...BAR, maxBarThickness: 16 },
                { label: 'Hired', data: age.hired, backgroundColor: soften(PRIMARY_GREEN), ...BAR, maxBarThickness: 16 },
              ],
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
