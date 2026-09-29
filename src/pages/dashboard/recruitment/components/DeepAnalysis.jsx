import { Row, Col, Card, Table, Tag, Typography } from 'antd';
import { getRankColor } from '../chartSetup';
import { pct } from '../recruitmentMetrics';

const { Text } = Typography;

const rankCol = { title: '#', dataIndex: 'rank', width: 40, render: (v) => <span style={{ fontWeight: 900, color: getRankColor(v) }}>{v}</span> };
const rateCol = { title: 'Rate', key: 'rate', align: 'right', render: (_, r) => <Tag color='success'>{pct(r.hiredCount, r.appliedCount)}%</Tag> };
const positionColumns = [
  rankCol,
  { title: 'Position', dataIndex: 'positionName', render: (v) => <span style={{ color: '#1677ff' }}>{v}</span> },
  { title: 'Applied', dataIndex: 'appliedCount', align: 'right' },
  { title: 'Hired', dataIndex: 'hiredCount', align: 'right' },
  rateCol,
];
const branchColumns = [
  rankCol,
  { title: 'Branch', dataIndex: 'branchName', render: (v) => <span style={{ color: '#1677ff' }}>{v}</span> },
  { title: 'Applied', dataIndex: 'appliedCount', align: 'right' },
  { title: 'Hired', dataIndex: 'hiredCount', align: 'right' },
  rateCol,
];

function HeatmapTable({ sourceLabels, stageLabels, dataGrid, maxValue }) {
  const cellStyle = (source, stage) => {
    const intensity = (dataGrid[source + '||' + stage] || 0) / (maxValue || 1);
    return {
      background: `rgba(56,158,13,${(0.12 + intensity * 0.75).toFixed(2)})`,
      color: intensity > 0.5 ? '#fff' : '#555',
      fontWeight: intensity > 0.3 ? 700 : 400,
      padding: 6, textAlign: 'center', borderRadius: 4, minWidth: 36, cursor: 'default',
    };
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 3, fontSize: 11, width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 8px' }} />
            {stageLabels.map((s) => (
              <th key={s} style={{ padding: '4px 6px', color: '#888', fontWeight: 700, fontSize: 10, writingMode: 'vertical-rl', minWidth: 38, whiteSpace: 'nowrap' }}>
                {s.length > 12 ? s.slice(0, 11) + '…' : s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sourceLabels.map((src) => (
            <tr key={src}>
              <td style={{ padding: '4px 10px', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>{src}</td>
              {stageLabels.map((stage) => (
                <td key={stage} style={cellStyle(src, stage)} title={`${src} × ${stage}: ${dataGrid[src + '||' + stage] || 0}`}>
                  {dataGrid[src + '||' + stage] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// vueportal DeepAnalysis.vue — Top Positions | Branch Breakdown | Source × Stage heatmap.
// Branch Breakdown is paged (10 rows by default) — every branch is listed, so
// it can run to dozens of rows; vueportal shows only the first 10 there.
export default function DeepAnalysis({ topPositionEntries, branchBreakdownEntries, heatmapSourceLabels, heatmapStageLabels, heatmapDataGrid, heatmapMaxValue }) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={12}>
        <Card size='small' title='Top Positions Applied' style={{ borderRadius: 8, height: '100%' }}>
          <Table size='small' rowKey='rank' dataSource={topPositionEntries} columns={positionColumns} pagination={false} />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size='small' title='Branch Breakdown' style={{ borderRadius: 8, height: '100%' }}>
          <Table
            size='small'
            rowKey='rank'
            dataSource={branchBreakdownEntries}
            columns={branchColumns}
            pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `${total} branches` }}
          />
        </Card>
      </Col>
      <Col xs={24}>
        <Card size='small' title='Source × Stage Heatmap' style={{ borderRadius: 8 }}
          extra={<Text type='secondary' style={{ fontSize: 11 }}>Applicant volume intensity matrix</Text>}>
          <HeatmapTable sourceLabels={heatmapSourceLabels} stageLabels={heatmapStageLabels} dataGrid={heatmapDataGrid} maxValue={heatmapMaxValue} />
        </Card>
      </Col>
    </Row>
  );
}
