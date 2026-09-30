import { Row, Col, Card, Table, Tag, Tooltip, Typography } from 'antd';
import { PRIMARY_GREEN } from '../chartSetup';
import { pct } from '../recruitmentMetrics';
import { soften } from '../../chartTheme';

const { Text } = Typography;

const PASSED_BAR = soften(PRIMARY_GREEN);
const FAILED_BAR = soften('#ff4d4f');

const interviewsPerHireColor = (v) => (v >= 5 ? 'error' : v >= 3 ? 'warning' : 'success');

const columns = [
  { title: 'Position', dataIndex: 'position', sorter: (a, b) => a.position.localeCompare(b.position) },
  { title: 'Total Interviewed', dataIndex: 'total', align: 'right', sorter: (a, b) => a.total - b.total },
  { title: 'Passed Interview', dataIndex: 'passed', align: 'right', sorter: (a, b) => a.passed - b.passed },
  { title: 'Failed Interview', dataIndex: 'failed', align: 'right', sorter: (a, b) => a.failed - b.failed },
  { title: 'Interviews / Hire', dataIndex: 'interviewsPerHire', align: 'right', sorter: (a, b) => a.interviewsPerHire - b.interviewsPerHire,
    render: (v) => <Tag color={interviewsPerHireColor(v)} style={{ margin: 0 }}>{v}x</Tag> },
  { title: 'Rejects / Hire', dataIndex: 'rejectsPerHire', align: 'right', sorter: (a, b) => a.rejectsPerHire - b.rejectsPerHire },
  { title: 'Pass Rate', dataIndex: 'passRate', align: 'right', sorter: (a, b) => a.passRate - b.passRate,
    render: (v) => <span style={{ color: v < 20 ? '#f5222d' : v < 40 ? '#faad14' : '#389e0d' }}>{v}%</span> },
];

// vueportal QualifiedCandidatesPerVacancy.vue (compact "Interviews Needed Per Hire" list)
export default function QualifiedCandidatesPerVacancy({ rows }) {
  const avgOf = (key) => (rows.length ? (rows.reduce((s, r) => s + r[key], 0) / rows.length).toFixed(1) : '—');
  const summary = [
    { label: 'Avg Interviews Per Hire', value: rows.length ? `${avgOf('interviewsPerHire')}x` : '—', color: PRIMARY_GREEN },
    { label: 'Avg Rejects Before 1 Hire', value: avgOf('rejectsPerHire'), color: '#f5222d' },
    { label: 'Positions Analyzed', value: rows.length, color: '#1677ff' },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {summary.map((s) => (
          <Col key={s.label} xs={24} sm={8}>
            <Card size='small' style={{ borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
              <Text type='secondary' style={{ fontSize: 11 }}>{s.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Card size='small' title='Interviews Needed Per Hire — by Position' style={{ borderRadius: 8, marginBottom: 16 }}>
        <Text type='secondary' style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
          How many final-interview candidates were seen before 1 successful hire. Lower = more selective pipeline.{' '}
          <span style={{ color: PASSED_BAR }}>■ passed</span> <span style={{ color: FAILED_BAR }}>■ failed</span>
        </Text>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {rows.map((row) => (
            <Tooltip key={row.position} title={`${row.position}: ${row.passed} passed (${row.passRate}%), ${row.failed} failed, ${row.rejectsPerHire} rejects/hire`}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 200px) 1fr auto 56px', alignItems: 'center', columnGap: 8, padding: '2px 0', borderBottom: '1px solid #f5f5f5' }}>
                <Text style={{ fontSize: 12, fontWeight: 500 }} ellipsis>{row.position}</Text>
                <div style={{ height: 10, borderRadius: 4, background: '#f0f0f0', overflow: 'hidden', display: 'flex', gap: 2 }}>
                  <div style={{ width: `${pct(row.passed, row.total)}%`, borderRadius: 4, background: PASSED_BAR }} />
                  <div style={{ width: `${pct(row.failed, row.total)}%`, borderRadius: 4, background: FAILED_BAR }} />
                </div>
                <Tag color={interviewsPerHireColor(row.interviewsPerHire)} style={{ margin: 0, fontSize: 10 }}>{row.interviewsPerHire}x</Tag>
                <Text type='secondary' style={{ fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{row.passed}/{row.total}</Text>
              </div>
            </Tooltip>
          ))}
        </div>
      </Card>

      <Card size='small' style={{ borderRadius: 8 }}>
        <Table size='small' rowKey='position' dataSource={rows} columns={columns} pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: [8, 15, 50] }} />
      </Card>
    </div>
  );
}
