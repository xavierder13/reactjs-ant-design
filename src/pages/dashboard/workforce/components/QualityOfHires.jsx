import { Row, Col, Table } from 'antd';
import { SafetyCertificateOutlined, UserAddOutlined, PercentageOutlined } from '@ant-design/icons';
import StatTile from './StatTile';
import ChartCard from './ChartCard';
import { TrendLineChart } from './workforceCharts';
import { TONES } from './workforceTones';
import { tablePagination } from '../../../../utils/tablePagination';

const fmt = (n) => (n ?? 0).toLocaleString();
const fmtRate = (v) => (v == null ? '—' : `${v}%`);

const columns = [
  { title: 'Month', dataIndex: 'label' },
  { title: 'Regularized', dataIndex: 'regularized', align: 'right', render: fmt },
  { title: 'Hired', dataIndex: 'hired', align: 'right', render: (v, m) => `${fmt(v)} (${m.hired_label})` },
  { title: 'Quality of Hires', dataIndex: 'rate', align: 'right', render: fmtRate },
];

// Quality of Hires (Recruitment KPI 2): employees regularized in a month ÷
// employees hired lag_months (6) earlier. `months` carries the "(to date)"
// label on the current month.
export default function QualityOfHires({ quality: q, months }) {
  const latest = months[months.length - 1];
  return (
    <>
      <Row gutter={[12, 12]}>
        <Col flex='1 1 200px'>
          <StatTile tone={TONES.people} icon={<PercentageOutlined />} label='Quality of Hires (12 months)' value={fmtRate(q.totals.rate)} sub={`${fmt(q.totals.regularized)} regularized ÷ ${fmt(q.totals.hired)} hired ${q.lag_months} months earlier`} />
        </Col>
        <Col flex='1 1 200px'>
          <StatTile tone={TONES.people} icon={<SafetyCertificateOutlined />} label={`Regularized in ${latest.label}`} value={fmt(latest.regularized)} sub={`Quality of Hires ${fmtRate(latest.rate)}`} />
        </Col>
        <Col flex='1 1 200px'>
          <StatTile tone={TONES.people} icon={<UserAddOutlined />} label={`Hired in ${latest.hired_label}`} value={fmt(latest.hired)} sub={`the ${latest.label.replace(' (to date)', '')} comparison base`} />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}><ChartCard title='Quality of Hires per Month'><TrendLineChart months={months} field='rate' label='Quality of Hires' suffix='%' /></ChartCard></Col>
        <Col xs={24} lg={12}>
          <ChartCard title={`Regularized vs. Hired ${q.lag_months} Months Earlier`}>
            <Table rowKey='month' size='small' columns={columns} dataSource={[...months].reverse()} pagination={tablePagination(6)} />
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
