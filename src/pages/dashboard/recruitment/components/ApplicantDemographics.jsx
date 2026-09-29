import { Row, Col, Card } from 'antd';
import ChartBox from './ChartBox';
import { CHART_OPTS_LEGEND, CHART_COLORS, DOUGHNUT_OPTS } from '../chartSetup';

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
                { type: 'bar', label: 'Applied', data: educAttainStats.map((e) => e.count), backgroundColor: 'rgba(22,119,255,0.65)', yAxisID: 'y' },
                { type: 'bar', label: 'Hired', data: educAttainStats.map((e) => e.hired), backgroundColor: 'rgba(56,158,13,0.75)', yAxisID: 'y' },
                { type: 'line', label: 'Hire Rate %', data: educAttainStats.map((e) => e.hireRate), borderColor: '#722ed1', backgroundColor: 'transparent', pointRadius: 5, borderWidth: 2, yAxisID: 'y1' },
              ],
            }}
            options={{
              ...CHART_OPTS_LEGEND,
              scales: {
                x: { grid: { display: false }, ticks: { color: '#888', font: { size: 9 } } },
                y: { position: 'left', ticks: { color: '#888', font: { size: 10 } } },
                y1: { position: 'right', ticks: { color: '#888', font: { size: 10 }, callback: (v) => v + '%' }, grid: { display: false } },
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size='small' title='Civil Status Breakdown' style={{ borderRadius: 8 }}>
          <ChartBox
            type='doughnut'
            height={260}
            options={DOUGHNUT_OPTS('55%')}
            data={{ labels: civilStatusStats.map((c) => c.status), datasets: [{ data: civilStatusStats.map((c) => c.count), backgroundColor: CHART_COLORS.slice(0, civilStatusStats.length), borderWidth: 2, borderColor: '#fff' }] }}
          />
        </Card>
      </Col>
    </Row>
  );
}
