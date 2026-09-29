import { Row, Col, Card, Progress, Tag, Divider, Typography } from 'antd';
import ChartBox from './ChartBox';
import { CHART_OPTS_STACKED, PRIMARY_GREEN } from '../chartSetup';

const { Text } = Typography;

// vueportal PlacementMatchAnalysis.vue — preference match rates | IQ pass rate by position
export default function PlacementMatchAnalysis({ placementMatchStats: stats, iqPassRateByPosition }) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={12}>
        <Card size='small' title='Position Preference Match Rate' style={{ borderRadius: 8, height: '100%' }}
          extra={<Tag color={stats.positionMatchPct >= 70 ? 'success' : 'warning'}>{stats.positionMatchPct}% matched</Tag>}>
          <Progress percent={stats.positionMatchPct} strokeColor={PRIMARY_GREEN} showInfo={false} style={{ marginBottom: 8 }} />
          <Text type='secondary' style={{ fontSize: 11 }}>
            {stats.positionMatched} of {stats.posCompared} hired applicants were placed in their preferred position.
          </Text>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ flex: 1 }}>Branch Preference Match</Text>
            <Tag color={stats.branchMatchPct >= 70 ? 'blue' : 'warning'}>{stats.branchMatchPct}% matched</Tag>
          </div>
          <Progress percent={stats.branchMatchPct} strokeColor='#1677ff' showInfo={false} style={{ marginBottom: 8 }} />
          <Text type='secondary' style={{ fontSize: 11 }}>{stats.branchMatched} of {stats.branchCompared} matched their preferred branch.</Text>
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size='small' title='IQ Exam Pass Rate by Position' style={{ borderRadius: 8, height: '100%' }}>
          <ChartBox
            type='bar'
            height={260}
            options={{ ...CHART_OPTS_STACKED, indexAxis: 'y' }}
            data={{
              labels: iqPassRateByPosition.map((d) => d.pos),
              datasets: [
                { label: 'Passed', data: iqPassRateByPosition.map((d) => d.passed), backgroundColor: 'rgba(56,158,13,0.75)' },
                { label: 'Failed', data: iqPassRateByPosition.map((d) => d.failed), backgroundColor: 'rgba(245,34,45,0.65)' },
              ],
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
