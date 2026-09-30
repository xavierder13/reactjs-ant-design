import { Row, Col, Card, Progress, Typography } from 'antd';
import ChartBox from './ChartBox';
import { STACKED_BAR, LEGEND, baseScales, segmentLabelsPlugin, BLUE, ORANGE, NEUTRAL, soften } from '../../chartTheme';
import { pct } from '../recruitmentMetrics';

const { Text } = Typography;

// Fixed per gender, as the Workforce Dashboard's Gender share bar: the count
// in the full-strength hue, the bar in the lightened one. Hired stays green.
const GENDER_COLORS = {
  Male: { text: '#1677ff', bar: BLUE },
  Female: { text: '#eb6834', bar: ORANGE },
};
const OTHER_GENDER = { text: '#8c8c8c', bar: NEUTRAL };

// vueportal GenderAndStageOutcome.vue. "% of total" is against totalApplicants
// (the date-filtered applicant count), as vueportal passes it.
export default function GenderAndStageOutcome({ genderBreakdownStats, stageOutcomeData, totalApplicants }) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={12}>
        <Card size='small' title='Gender Breakdown' style={{ borderRadius: 8, height: '100%' }}>
          <Row gutter={[12, 12]}>
            {genderBreakdownStats.map((g) => {
              const tone = GENDER_COLORS[g.gender] || OTHER_GENDER;
              return (
              <Col key={g.gender} span={12}>
                <Card size='small' style={{ borderRadius: 8, textAlign: 'center' }} styles={{ body: { padding: 12 } }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: tone.text }}>{g.totalCount}</div>
                  <Text type='secondary' style={{ fontSize: 11 }}>{g.gender} Applicants</Text>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#52c41a', marginTop: 6 }}>
                    {g.hiredCount} hired ({pct(g.hiredCount, g.totalCount)}%)
                  </div>
                  <Progress percent={pct(g.totalCount, totalApplicants)} size='small' showInfo={false} strokeColor={tone.bar} style={{ marginTop: 6 }} />
                  <Text type='secondary' style={{ fontSize: 10 }}>{pct(g.totalCount, totalApplicants)}% of total</Text>
                </Card>
              </Col>
              );
            })}
          </Row>
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size='small' title='Stage Outcome Distribution (real data)' style={{ borderRadius: 8, height: '100%' }}>
          <ChartBox
            type='bar'
            plugins={[segmentLabelsPlugin]}
            options={{ interaction: { mode: 'index', intersect: false }, plugins: { legend: LEGEND }, scales: baseScales(false, true) }}
            data={{
              labels: stageOutcomeData.labels,
              datasets: [
                { label: 'On Process', data: stageOutcomeData.onProcess, backgroundColor: BLUE, ...STACKED_BAR, maxBarThickness: 36 },
                { label: 'Failed', data: stageOutcomeData.failed, backgroundColor: soften('#f5222d'), ...STACKED_BAR, maxBarThickness: 36 },
                { label: 'Non-Compliant', data: stageOutcomeData.nonCompliant, backgroundColor: soften('#faad14'), ...STACKED_BAR, maxBarThickness: 36 },
              ],
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
