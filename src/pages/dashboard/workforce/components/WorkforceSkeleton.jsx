import { Row, Col, Card, Skeleton } from 'antd';

// First-load placeholder in the page's shape (refetches keep the data visible instead).
export default function WorkforceSkeleton() {
  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: 5 }, (_, i) => (
        <Col key={`k${i}`} flex='1 1 180px'><Card size='small'><Skeleton active title={false} paragraph={{ rows: 2 }} /></Card></Col>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Col key={`c${i}`} xs={24} lg={12}><Card size='small'><Skeleton active paragraph={{ rows: 7 }} /></Card></Col>
      ))}
    </Row>
  );
}
