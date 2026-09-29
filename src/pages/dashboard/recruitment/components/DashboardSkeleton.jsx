import { Row, Col, Card, Skeleton } from 'antd';

// Loading skeleton that mirrors the top of the page layout.
export default function DashboardSkeleton() {
  const block = (key, rows, colProps) => (
    <Col key={key} {...colProps}>
      <Card size='small' style={{ borderRadius: 8, height: '100%' }}>
        <Skeleton active title={false} paragraph={{ rows }} />
      </Card>
    </Col>
  );
  return (
    <div>
      <Row justify='space-between' align='middle' style={{ marginBottom: 20 }}>
        <Skeleton.Button active size='small' style={{ width: 140 }} />
        <Skeleton.Button active size='small' style={{ width: 90 }} />
      </Row>
      <Card size='small' style={{ marginBottom: 20, borderRadius: 8 }}>
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      </Card>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {Array.from({ length: 6 }, (_, i) => block(`kpi-${i}`, 2, { xs: 12, sm: 8, md: 4 }))}
      </Row>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {Array.from({ length: 7 }, (_, i) => block(`stage-${i}`, 3, { xs: 24, sm: 12, md: 8, lg: 6, xl: 3, style: { flex: 1, minWidth: 150 } }))}
      </Row>
      <Row gutter={[16, 16]}>
        {Array.from({ length: 3 }, (_, i) => block(`chart-${i}`, 8, { xs: 24, md: 8 }))}
      </Row>
    </div>
  );
}
