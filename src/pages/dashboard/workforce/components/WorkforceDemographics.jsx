import { Row, Col, Table, Typography } from 'antd';
import ChartCard from './ChartCard';
import { BLUE, NEUTRAL, GRID, fmt } from '../../chartTheme';

const { Text } = Typography;

// Share of the total as a slim bar beside the %, one colour for every table
// (grey for Unknown / Not specified rows) — six tenure bands would outrun
// the 4-colour palette, so colour never carries the category here.
const ShareCell = ({ row }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 90 }}>
    <div style={{ flex: 1, height: 8, borderRadius: 4, background: GRID, overflow: 'hidden' }}>
      <div style={{ width: `${row.pct}%`, height: '100%', background: row.unknown ? NEUTRAL : BLUE }} />
    </div>
    <Text style={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.pct}%</Text>
  </div>
);

const countColumns = [
  { title: 'Employees', dataIndex: 'count', key: 'count', align: 'right', render: (v) => fmt(v) },
  { title: '% of Total', key: 'pct', width: '32%', render: (_, row) => <ShareCell row={row} /> },
];

function DemographicTable({ title, labelTitle, rows, total, extraColumns = [] }) {
  const columns = [
    {
      title: labelTitle,
      dataIndex: 'label',
      key: 'label',
      render: (v, row) => (row.unknown ? <Text type='secondary'>{v}</Text> : v),
    },
    ...extraColumns,
    ...countColumns,
  ];
  return (
    <ChartCard title={title}>
      <Table
        rowKey='label'
        size='small'
        pagination={false}
        columns={columns}
        dataSource={rows}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={1 + extraColumns.length}><Text strong>Total</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align='right'><Text strong>{fmt(total)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={2}><Text strong>{total ? '100%' : '—'}</Text></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </ChartCard>
  );
}

// Workforce Demographics — active employees (filters applied) by generation
// (birth year), length of service, gender and employment status; each table
// sums to the same total.
export default function WorkforceDemographics({ demographics }) {
  const { total } = demographics;
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <DemographicTable
          title='Age (Generation)'
          labelTitle='Category'
          rows={demographics.generation}
          total={total}
          extraColumns={[
            { title: 'Born Between', dataIndex: 'born_between', key: 'born_between', render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span> },
            { title: 'Age Group', dataIndex: 'age_group', key: 'age_group', render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span> },
          ]}
        />
      </Col>
      <Col xs={24} lg={8}>
        <DemographicTable title='Tenure (Length of Service)' labelTitle='Length of Service' rows={demographics.tenure} total={total} />
      </Col>
      <Col xs={24} lg={8}>
        <DemographicTable title='Gender' labelTitle='Gender' rows={demographics.gender} total={total} />
      </Col>
      <Col xs={24} lg={8}>
        <DemographicTable title='Employment Status' labelTitle='Employment Status' rows={demographics.employment_status} total={total} />
      </Col>
    </Row>
  );
}
