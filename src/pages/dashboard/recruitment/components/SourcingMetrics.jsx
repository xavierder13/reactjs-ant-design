import { Row, Col, Card, Typography } from 'antd';
import ChartBox from './ChartBox';
import { BLUE, BAR, baseScales } from '../../chartTheme';
import { countBySource } from '../recruitmentMetrics';

const { Text } = Typography;

// Bar length scales with the number of sources, like vueportal's canvas.height.
const heightFor = (n) => Math.max(260, n * 15);

// "n (x.x%)" beside each horizontal bar — vueportal draws the same in onComplete.
const valueLabels = (total) => ({
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#555';
    ctx.textBaseline = 'middle';
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      const value = chart.data.datasets[0].data[i];
      ctx.fillText(`${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`, bar.x + 6, bar.y);
    });
    ctx.restore();
  },
});

function HorizontalCountChart({ labels, data, total, label }) {
  return (
    <ChartBox
      type='bar'
      height={heightFor(labels.length)}
      data={{ labels, datasets: [{ label, data, backgroundColor: BLUE, ...BAR, maxBarThickness: 18 }] }}
      options={{ indexAxis: 'y', layout: { padding: { right: 60 } }, plugins: { legend: { display: false } }, scales: baseScales(true) }}
      plugins={[valueLabels(total)]}
    />
  );
}

// vueportal SourcingMetrics.vue — Source of Application | Sourcing Channel Efficiency | Hired by Source
export default function SourcingMetrics({ dateFilteredApplicants, hiredApplicants, sourcingChannelEfficiency }) {
  const srcApp = countBySource(dateFilteredApplicants);
  const srcHire = countBySource(hiredApplicants);
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={8}>
        <Card size='small' title='Source of Application' style={{ borderRadius: 8, height: '100%' }}>
          <HorizontalCountChart labels={srcApp.labels} data={srcApp.data} total={srcApp.total} label='Applicants' />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card size='small' title='Sourcing Channel Efficiency' style={{ borderRadius: 8, height: '100%' }}
          extra={<Text type='secondary' style={{ fontSize: 11 }}>Share of hires</Text>}>
          <HorizontalCountChart
            labels={sourcingChannelEfficiency.map((e) => e.source)}
            data={sourcingChannelEfficiency.map((e) => e.hiredCount)}
            total={hiredApplicants.length}
            label='Hired'
          />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card size='small' title='Hired by Source' style={{ borderRadius: 8, height: '100%' }}>
          <HorizontalCountChart labels={srcHire.labels} data={srcHire.data} total={srcHire.total} label='Hired' />
        </Card>
      </Col>
    </Row>
  );
}
