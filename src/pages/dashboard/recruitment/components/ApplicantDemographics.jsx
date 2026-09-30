import { Row, Col, Card } from 'antd';
import ChartBox from './ChartBox';
import { ShareBar } from '../../workforce/components/workforceCharts';
import { CHART_COLORS, PRIMARY_GREEN } from '../chartSetup';
import { BAR, LEGEND, INK_SECONDARY, baseScales, BLUE, soften } from '../../chartTheme';

// vueportal ApplicantDemographics.vue — Education Attainment vs Hire Rate | Civil Status
export default function ApplicantDemographics({ educAttainStats, civilStatusStats }) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={12}>
        <Card size='small' title='Education Attainment vs Hire Rate' style={{ borderRadius: 8 }}>
          <ChartBox
            type='bar'
            height={260}
            data={{
              labels: educAttainStats.map((e) => e.educ),
              datasets: [
                { type: 'bar', label: 'Applied', data: educAttainStats.map((e) => e.count), backgroundColor: BLUE, ...BAR, maxBarThickness: 16, yAxisID: 'y' },
                { type: 'bar', label: 'Hired', data: educAttainStats.map((e) => e.hired), backgroundColor: soften(PRIMARY_GREEN), ...BAR, maxBarThickness: 16, yAxisID: 'y' },
                { type: 'line', label: 'Hire Rate %', data: educAttainStats.map((e) => e.hireRate), borderColor: '#722ed1', backgroundColor: '#722ed1', pointRadius: 3, pointHoverRadius: 5, borderWidth: 2, yAxisID: 'y1' },
              ],
            }}
            options={{
              interaction: { mode: 'index', intersect: false },
              plugins: { legend: LEGEND },
              scales: {
                ...baseScales(false),
                y: { ...baseScales(false).y, position: 'left' },
                y1: { position: 'right', beginAtZero: true, border: { display: false }, ticks: { color: INK_SECONDARY, font: { size: 11 }, callback: (v) => v + '%' }, grid: { display: false } },
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size='small' title='Civil Status Breakdown' style={{ borderRadius: 8 }}>
          <ShareBar rows={civilStatusStats.map((c) => ({ label: c.status, count: c.count }))} order={civilStatusStats.map((c) => c.status)} colors={CHART_COLORS.map((c) => soften(c))} />
        </Card>
      </Col>
    </Row>
  );
}
