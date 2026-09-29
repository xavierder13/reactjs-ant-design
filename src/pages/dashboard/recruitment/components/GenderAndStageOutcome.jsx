import { Row, Col, Card, Progress, Typography } from 'antd';
import ChartBox from './ChartBox';
import { CHART_OPTS_STACKED, CHART_COLORS } from '../chartSetup';
import { pct } from '../recruitmentMetrics';

const { Text } = Typography;

// vueportal GenderAndStageOutcome.vue. "% of total" is against totalApplicants
// (the date-filtered applicant count), as vueportal passes it.
export default function GenderAndStageOutcome({ genderBreakdownStats, stageOutcomeData, totalApplicants }) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={12}>
        <Card size='small' title='Gender Breakdown' style={{ borderRadius: 8, height: '100%' }}>
          <Row gutter={[12, 12]}>
            {genderBreakdownStats.map((g, i) => (
              <Col key={g.gender} span={12}>
                <Card size='small' style={{ borderRadius: 8, textAlign: 'center' }} styles={{ body: { padding: 12 } }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: CHART_COLORS[i] }}>{g.totalCount}</div>
                  <Text type='secondary' style={{ fontSize: 11 }}>{g.gender} Applicants</Text>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#52c41a', marginTop: 6 }}>
                    {g.hiredCount} hired ({pct(g.hiredCount, g.totalCount)}%)
                  </div>
                  <Progress percent={pct(g.totalCount, totalApplicants)} size='small' showInfo={false} strokeColor={CHART_COLORS[i]} style={{ marginTop: 6 }} />
                  <Text type='secondary' style={{ fontSize: 10 }}>{pct(g.totalCount, totalApplicants)}% of total</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size='small' title='Stage Outcome Distribution (real data)' style={{ borderRadius: 8, height: '100%' }}>
          <ChartBox
            type='bar'
            options={CHART_OPTS_STACKED}
            data={{
              labels: stageOutcomeData.labels,
              datasets: [
                { label: 'On Process', data: stageOutcomeData.onProcess, backgroundColor: '#1677ffcc' },
                { label: 'Failed', data: stageOutcomeData.failed, backgroundColor: '#f5222dcc' },
                { label: 'Non-Compliant', data: stageOutcomeData.nonCompliant, backgroundColor: '#faad14cc' },
              ],
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
