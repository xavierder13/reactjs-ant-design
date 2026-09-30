import { Row, Col, Card, Tooltip, Typography } from 'antd';
import { STAGE_COLOR_MAP } from '../chartSetup';
import { GRID, soften } from '../../chartTheme';

const { Text } = Typography;

// Status colors (lightened like the Workforce cards): on process/hired takes
// the stage's own color, failed = red, reserved = navy — as in vueportal.
const FAILED = soften('#f5222d');
const RESERVED = soften('#1A237E');

const Dot = ({ color }) => (
  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color, marginRight: 6 }} />
);

// vueportal PipelineStageCards.vue, drawn as a Workforce stat tile: stage
// color on the top bar, the stage's main count in ink, then a split bar +
// legend for on process / failed / reserved. Click opens the stage's list page.
export default function PipelineStageCards({ recruitmentStageCards, onNavigate }) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
      {recruitmentStageCards.map((stageCard) => {
        const color = soften(STAGE_COLOR_MAP[stageCard.stageName] || '#888888');
        const parts = [
          { label: stageCard.stageName === 'Hired' ? 'hired' : 'on process', count: stageCard.countStageItems, color },
          stageCard.failedCount != null && { label: 'failed / non-compliant', count: stageCard.failedCount, color: FAILED },
          stageCard.reservedCount != null && { label: 'reserved', count: stageCard.reservedCount, color: RESERVED },
        ].filter(Boolean);
        const total = parts.reduce((s, p) => s + p.count, 0);

        return (
          <Col key={stageCard.stageName} flex='1 1 170px'>
            <Card
              hoverable
              onClick={() => onNavigate(stageCard.routePath)}
              size='small'
              style={{ height: '100%', borderRadius: 10, overflow: 'hidden', borderTop: `3px solid ${color}`, cursor: 'pointer' }}
              styles={{ body: { padding: '12px 14px' } }}
            >
              <Text type='secondary' style={{ fontSize: 12 }}>{stageCard.stageName}</Text>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginTop: 6, color: '#1f1f1d' }}>{stageCard.countStageItems.toLocaleString()}</div>

              <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', background: GRID, marginTop: 10 }}>
                {total > 0 && parts.filter((p) => p.count).map((p) => (
                  <Tooltip key={p.label} title={`${p.count.toLocaleString()} ${p.label}`}>
                    <div style={{ width: `${(p.count / total) * 100}%`, minWidth: 3, background: p.color }} />
                  </Tooltip>
                ))}
              </div>

              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {parts.map((p) => (
                  <span key={p.label} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <Dot color={p.color} />
                    <Text strong style={{ fontSize: 12 }}>{p.count.toLocaleString()}</Text>{' '}
                    <Text type='secondary' style={{ fontSize: 12 }}>{p.label}</Text>
                  </span>
                ))}
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
