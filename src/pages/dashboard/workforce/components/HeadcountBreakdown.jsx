import { useState } from 'react';
import { Row, Col, Button } from 'antd';
import ChartCard from './ChartCard';
import { CountBarChart } from './workforceCharts';

const TOP_BRANCHES = 15;

// Active headcount by branch (top 15, expandable) and by department.
export default function HeadcountBreakdown({ composition }) {
  const [showAll, setShowAll] = useState(false);
  const branches = showAll ? composition.branch : composition.branch.slice(0, TOP_BRANCHES);
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <ChartCard
          title='Headcount by Branch'
          extra={composition.branch.length > TOP_BRANCHES && (
            <Button type='link' size='small' onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Top ${TOP_BRANCHES}` : `Show all ${composition.branch.length}`}
            </Button>
          )}
        >
          <div style={{ maxHeight: 520, overflowY: 'auto' }}><CountBarChart rows={branches} /></div>
        </ChartCard>
      </Col>
      <Col xs={24} lg={12}>
        <ChartCard title='Headcount by Department'>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}><CountBarChart rows={composition.department} /></div>
        </ChartCard>
      </Col>
    </Row>
  );
}
