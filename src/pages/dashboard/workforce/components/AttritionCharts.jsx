import { useState } from 'react';
import { Row, Col, Button, Table, Typography } from 'antd';
import ChartCard from './ChartCard';
import { CountBarChart, ShareBar } from './workforceCharts';
import { TONES, SEPARATION_TYPE_ORDER } from './workforceTones';

const { Text } = Typography;
const TOP_REASONS = 12;
const TYPE_COLORS = { Voluntary: TONES.voluntary, Involuntary: TONES.involuntary };

const typeColumns = [
  { title: 'Type', dataIndex: 'label' },
  { title: 'Separations', dataIndex: 'count', align: 'right' },
  { title: 'Share', dataIndex: 'pct', align: 'right', render: (v) => `${v}%` },
  { title: `Left < 6 months`, dataIndex: 'early', align: 'right' },
];

const Swatch = ({ color, label }) => (
  <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color, marginRight: 6 }} />
    <Text type='secondary'>{label}</Text>
  </span>
);

// Separations by type (share bar + table) and by reason (bars colored by type).
export default function AttritionCharts({ attrition }) {
  const [showAll, setShowAll] = useState(false);
  const reasons = showAll ? attrition.by_reason : attrition.by_reason.slice(0, TOP_REASONS);
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={10}>
        <ChartCard title='Separations by Type'>
          <ShareBar rows={attrition.by_type} order={SEPARATION_TYPE_ORDER} />
          <Table
            rowKey='label' size='small' pagination={false} style={{ marginTop: 16 }}
            columns={typeColumns} dataSource={attrition.by_type.filter((t) => t.count)}
          />
        </ChartCard>
      </Col>
      <Col xs={24} lg={14}>
        <ChartCard
          title='Separations by Reason'
          extra={attrition.by_reason.length > TOP_REASONS && (
            <Button type='link' size='small' onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Top ${TOP_REASONS}` : `Show all ${attrition.by_reason.length}`}
            </Button>
          )}
        >
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <Swatch color={TONES.voluntary} label='Voluntary' />
            <Swatch color={TONES.involuntary} label='Involuntary' />
            <Swatch color={TONES.neutral} label='Other / not specified' />
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <CountBarChart rows={reasons} label='Separations' colorOf={(r) => TYPE_COLORS[r.type] || TONES.neutral} />
          </div>
        </ChartCard>
      </Col>
    </Row>
  );
}
