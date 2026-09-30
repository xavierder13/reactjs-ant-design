import { Row, Col, Card, Tag, Divider, Typography } from 'antd';
import ChartBox from './ChartBox';
import { PRIMARY_GREEN, conversionColor } from '../chartSetup';
import { GRID, STACKED_BAR, LEGEND, baseScales, segmentLabelsPlugin, soften } from '../../chartTheme';

const { Text } = Typography;

// Match rate status, same thresholds as the funnel's pass rate
// (conversionColor: ≥ 70 good, ≥ 40 watch, else poor): the tag and the
// (lightened) bar share the color.
const BAR_BY_STATUS = { success: soften('#52c41a'), warning: soften('#faad14'), error: soften('#ff4d4f') };
const matchStatus = (rate) => conversionColor(rate, 100, (r) => r);

// Rate bar with the IQ chart's 4px corner radius (not AntD Progress's pill).
const MatchBar = ({ rate }) => (
  <div style={{ height: 10, borderRadius: 4, background: GRID, overflow: 'hidden', marginBottom: 8 }}>
    <div style={{ width: `${Math.min(rate, 100)}%`, height: '100%', borderRadius: 4, background: BAR_BY_STATUS[matchStatus(rate)] }} />
  </div>
);

// vueportal PlacementMatchAnalysis.vue — preference match rates | IQ pass rate by position
export default function PlacementMatchAnalysis({ placementMatchStats: stats, iqPassRateByPosition }) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={12}>
        <Card size='small' title='Position Preference Match Rate' style={{ borderRadius: 8, height: '100%' }}
          extra={<Tag color={matchStatus(stats.positionMatchPct)}>{stats.positionMatchPct}% matched</Tag>}>
          <MatchBar rate={stats.positionMatchPct} />
          <Text type='secondary' style={{ fontSize: 11 }}>
            {stats.positionMatched} of {stats.posCompared} hired applicants were placed in their preferred position.
          </Text>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ flex: 1 }}>Branch Preference Match</Text>
            <Tag color={matchStatus(stats.branchMatchPct)}>{stats.branchMatchPct}% matched</Tag>
          </div>
          <MatchBar rate={stats.branchMatchPct} />
          <Text type='secondary' style={{ fontSize: 11 }}>{stats.branchMatched} of {stats.branchCompared} matched their preferred branch.</Text>
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size='small' title='IQ Exam Pass Rate by Position' style={{ borderRadius: 8, height: '100%' }}>
          <ChartBox
            type='bar'
            height={Math.max(160, iqPassRateByPosition.length * 30 + 60)}
            plugins={[segmentLabelsPlugin]}
            options={{ indexAxis: 'y', interaction: { mode: 'index', intersect: false }, plugins: { legend: LEGEND }, scales: baseScales(true, true) }}
            data={{
              labels: iqPassRateByPosition.map((d) => d.pos),
              datasets: [
                { label: 'Passed', data: iqPassRateByPosition.map((d) => d.passed), backgroundColor: soften(PRIMARY_GREEN), ...STACKED_BAR, maxBarThickness: 20 },
                { label: 'Failed', data: iqPassRateByPosition.map((d) => d.failed), backgroundColor: soften('#f5222d'), ...STACKED_BAR, maxBarThickness: 20 },
              ],
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
