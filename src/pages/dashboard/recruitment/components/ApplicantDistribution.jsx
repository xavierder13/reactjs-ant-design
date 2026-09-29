import { Row, Col, Card } from 'antd';
import ChartBox from './ChartBox';
import { CHART_OPTS_LEGEND, PRIMARY_GREEN } from '../chartSetup';
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
            options={CHART_OPTS_LEGEND}
            data={{
              labels: trend.labels,
              datasets: [
                { label: 'Applications', data: trend.applications, borderColor: '#1677ff', backgroundColor: 'rgba(22,119,255,0.1)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
                { label: 'Hired', data: trend.hired, borderColor: PRIMARY_GREEN, backgroundColor: 'rgba(56,158,13,0.1)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
              ],
            }}
          />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size='small' title='Age Group Distribution' style={{ borderRadius: 8 }}>
          <ChartBox
            type='bar'
            options={CHART_OPTS_LEGEND}
            data={{
              labels: age.labels,
              datasets: [
                { label: 'Applied', data: age.applied, backgroundColor: 'rgba(22,119,255,0.65)' },
                { label: 'Hired', data: age.hired, backgroundColor: 'rgba(56,158,13,0.75)' },
              ],
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
