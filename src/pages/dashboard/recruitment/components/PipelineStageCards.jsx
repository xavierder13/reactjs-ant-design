import { Row, Col, Card, Tag, Tooltip, Typography } from 'antd';
import { STAGE_COLOR_MAP } from '../chartSetup';

const { Text } = Typography;

const circle = (size, background, fontSize, fontWeight) => ({
  width: size, height: size, borderRadius: '50%', background,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontWeight, fontSize, flexShrink: 0,
});

// vueportal PipelineStageCards.vue — click opens the stage's list page.
export default function PipelineStageCards({ recruitmentStageCards, onNavigate }) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
      {recruitmentStageCards.map((stageCard) => {
        const color = STAGE_COLOR_MAP[stageCard.stageName] || '#888';
        return (
          <Col key={stageCard.stageName} flex='1 1 150px'>
            <Card hoverable onClick={() => onNavigate(stageCard.routePath)} size='small' style={{ borderRadius: 8, cursor: 'pointer', height: '100%' }} styles={{ body: { padding: 0 } }}>
              <div style={{ height: 5, background: color, borderRadius: '8px 8px 0 0' }} />
              <div style={{ padding: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.4 }}>{stageCard.stageName}</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <Tooltip title={stageCard.stageName === 'Hired' ? 'Hired' : 'On Process'}>
                    <div style={circle(52, color, 18, 900)}>{stageCard.countStageItems}</div>
                  </Tooltip>
                  {stageCard.failedCount != null && (
                    <Tooltip title='Failed / Not Qualified'><div style={circle(38, '#f5222d', 13, 700)}>{stageCard.failedCount}</div></Tooltip>
                  )}
                  {stageCard.reservedCount != null && (
                    <Tooltip title='Reserved'><div style={circle(38, '#1A237E', 13, 700)}>{stageCard.reservedCount}</div></Tooltip>
                  )}
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Tag variant='solid' color={color} style={{ fontSize: 10, margin: 0 }}>{stageCard.stageName !== 'Hired' ? 'on process' : 'hired'}</Tag>
                  {stageCard.failedCount != null && <Tag variant='solid' color='#f5222d' style={{ fontSize: 10, margin: 0 }}>failed / non-compliant</Tag>}
                  {stageCard.reservedCount != null && <Tag variant='solid' color='#1A237E' style={{ fontSize: 10, margin: 0 }}>reserved</Tag>}
                </div>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
