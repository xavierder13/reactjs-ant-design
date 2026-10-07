import { useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Typography } from 'antd';

const { Text } = Typography;

const columns = [
  { title: 'Applicant', dataIndex: 'applicantName' },
  { title: 'Stage', dataIndex: 'recruitmentStage' },
  { title: 'Branch', dataIndex: 'appliedBranch' },
  { title: 'Position', dataIndex: 'appliedPosition' },
  { title: 'Date Applied', dataIndex: 'dateAppliedStr' },
  {
    title: 'Days Waiting', dataIndex: 'daysWaiting', align: 'right',
    render: (d) => <Tag color={d > 30 ? 'error' : d > 14 ? 'warning' : 'success'} style={{ fontSize: 10 }}>{d}d</Tag>,
  },
];

// vueportal ReservedApplicantAging.vue
export default function ReservedApplicantAging({ reservedAgingRows, reservedAgingBuckets }) {
  // Rows carry no applicant id; key them by list position (AntD deprecated
  // the `index` argument of a rowKey function).
  const rows = useMemo(() => reservedAgingRows.map((r, i) => ({ ...r, rowId: i })), [reservedAgingRows]);
  return (
    <Card size='small' style={{ borderRadius: 8, marginBottom: 24 }}
      title='Reserved Applicants — Days Waiting'
      extra={<Tag color='error'>{reservedAgingRows.filter((r) => r.daysWaiting > 30).length} critical (&gt;30d)</Tag>}>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {reservedAgingBuckets.map((b) => (
          <Col key={b.label} xs={12} sm={6}>
            <div style={{ textAlign: 'center', padding: 8, borderLeft: `3px solid ${b.color}`, background: b.bg, borderRadius: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: b.color }}>{b.count}</div>
              <Text style={{ fontSize: 11 }}>{b.label}</Text>
            </div>
          </Col>
        ))}
      </Row>
      <Table size='small' rowKey='rowId' dataSource={rows} columns={columns} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />
    </Card>
  );
}
