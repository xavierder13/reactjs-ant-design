import { Row, Col, Card, Progress, Tag, Typography } from 'antd';
import ChartBox from './ChartBox';
import { STAGE_COLORS, conversionColor } from '../chartSetup';
import { BAR, INK_SECONDARY, endLabelsPlugin, baseScales, soften, textOn } from '../../chartTheme';
import { pct, funnelChartRows } from '../recruitmentMetrics';

const { Text } = Typography;

// SVG geometry — vueportal RecruitmentFunnel.vue data()
const SVG_W = 480;
const ROW_H = 52;
const MAX_W = 220;
const MIN_W = 100;
const LABEL_W = 130;

const convFill = (current, previous) => {
  const rate = pct(current, previous);
  return rate >= 70 ? '#389e0d' : rate >= 40 ? '#faad14' : '#f5222d';
};

// Pass-through funnel (recruitmentFunnelRows) drawn as trapezoids, as in
// vueportal: top width from the previous stage, bottom from this one.
function FunnelChart({ rows }) {
  const embudo = funnelChartRows(rows);
  if (!embudo.length) return null;
  const total = embudo[0].count || 1;
  const centerX = SVG_W / 2;
  const topW = (i) => (i === 0 ? MAX_W : MIN_W + (MAX_W - MIN_W) * (embudo[i - 1].count / total));
  const botW = (i) => MIN_W + (MAX_W - MIN_W) * (embudo[i].count / total);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${SVG_W} ${embudo.length * ROW_H + 20}`} width='100%' style={{ maxWidth: SVG_W, fontFamily: 'inherit', display: 'block', margin: '0 auto' }}>
        {embudo.map((row, i) => {
          const y = i * ROW_H + 10;
          const tw = topW(i);
          const bw = botW(i);
          const topX = centerX - tw / 2;
          const botX = centerX - bw / 2;
          const fill = soften(STAGE_COLORS[i % STAGE_COLORS.length]);
          const ink = textOn(fill);
          return (
            <g key={row.label}>
              <polygon points={`${topX},${y} ${topX + tw},${y} ${botX + bw},${y + ROW_H - 4} ${botX},${y + ROW_H - 4}`} fill={fill} />
              <foreignObject x={0} y={y + ROW_H / 2 - 14} width={LABEL_W} height={28}>
                <div xmlns='http://www.w3.org/1999/xhtml' style={{ fontSize: 10, fontWeight: 700, color: '#444', textAlign: 'right', paddingRight: 8, lineHeight: '14px', wordBreak: 'break-word', width: '100%' }}>
                  {row.label}
                </div>
              </foreignObject>
              <text x={centerX} y={y + ROW_H / 2 - 5} textAnchor='middle' dominantBaseline='middle' fontSize={13} fill={ink} fontWeight={800}>{row.count}</text>
              <text x={centerX} y={y + ROW_H / 2 + 9} textAnchor='middle' dominantBaseline='middle' fontSize={9} fill={ink === '#fff' ? 'rgba(255,255,255,0.85)' : INK_SECONDARY} fontWeight={500}>{row.pctOfTotal}% of total</text>
              {i > 0 && embudo[i - 1].count > 0 && (
                <text x={centerX + bw / 2 + 10} y={y + ROW_H / 2} textAnchor='start' dominantBaseline='middle' fontSize={10} fill={convFill(row.count, embudo[i - 1].count)} fontWeight={700}>
                  ↓{pct(row.count, embudo[i - 1].count)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// vueportal RecruitmentFunnel.vue — Stage Analysis | Funnel | Avg. Days per Stage
export default function RecruitmentFunnel({ recruitmentStageAnalysisRows, recruitmentFunnelRows, avgDaysPerStage }) {
  const base = recruitmentStageAnalysisRows[0]?.count || 1;
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={8}>
        <Card size='small' title='Recruitment Stage Analysis' style={{ borderRadius: 8, height: '100%' }}
          extra={<Text type='secondary' style={{ fontSize: 11 }}>Drop-off &amp; conversion per stage</Text>}>
          {recruitmentStageAnalysisRows.map((row, i) => (
            <div key={row.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#666' }}>{row.label}</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Text strong style={{ fontSize: 12 }}>{row.count}</Text>
                  <Text type='secondary' style={{ fontSize: 11 }}>{pct(row.count, base)}% of total</Text>
                  {i > 0 && recruitmentStageAnalysisRows[i - 1].count > 0 && (
                    <Tag color={conversionColor(row.count, recruitmentStageAnalysisRows[i - 1].count, pct)} style={{ fontSize: 10, margin: 0 }}>
                      {pct(row.count, recruitmentStageAnalysisRows[i - 1].count)}% pass
                    </Tag>
                  )}
                </div>
              </div>
              <Progress percent={pct(row.count, base)} strokeColor={soften(STAGE_COLORS[i % STAGE_COLORS.length])} showInfo={false} size='small' />
            </div>
          ))}
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card size='small' title='Recruitment Funnel' style={{ borderRadius: 8, height: '100%' }}
          extra={<Text type='secondary' style={{ fontSize: 11 }}>Pass-through per stage</Text>}>
          <FunnelChart rows={recruitmentFunnelRows} />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card size='small' title='Avg. Days per Stage (real data)' style={{ borderRadius: 8, height: '100%' }}>
          <ChartBox
            type='bar'
            height={220}
            options={{ layout: { padding: { top: 18 } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} days` } } }, scales: baseScales(false) }}
            data={{ labels: avgDaysPerStage.labels, datasets: [{ label: 'Avg Days', data: avgDaysPerStage.data, backgroundColor: STAGE_COLORS.slice(1, 7).map((c) => soften(c)), ...BAR, maxBarThickness: 18 }] }}
            plugins={[endLabelsPlugin]}
          />
        </Card>
      </Col>
    </Row>
  );
}
