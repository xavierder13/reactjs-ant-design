import { useMemo } from 'react';
import { Row, Col, Card, Typography, Table, Alert } from 'antd';
import { PercentageOutlined, CheckSquareOutlined, FolderOpenOutlined } from '@ant-design/icons';
import ChartBox from './ChartBox';
import StatTile from '../../workforce/components/StatTile';
import { PRIMARY_GREEN } from '../chartSetup';
import { BAR, lineScales, soften } from '../../chartTheme';
import { computeHiringEfficiency } from '../hiringEfficiency';
import { tablePagination } from '../../../../utils/tablePagination';

const { Text } = Typography;

const monthLabel = (mk) => { const [y, m] = mk.split('-'); return new Date(+y, +m - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' }); };
const fmtRate = (v) => (v == null ? '—' : `${v}%`);

const monthColumns = [
  { title: 'Month', dataIndex: 'key', render: (k, r) => `${monthLabel(k)}${r.toDate ? ' (to date)' : ''}` },
  { title: 'Open at Start', dataIndex: 'atStart', align: 'right' },
  { title: 'Newly Opened', dataIndex: 'opened', align: 'right' },
  { title: 'Open Positions', dataIndex: 'open', align: 'right' },
  { title: 'Closed', dataIndex: 'closed', align: 'right' },
  { title: 'Hiring Efficiency', dataIndex: 'rate', align: 'right', render: fmtRate },
];

// Manpower Request — Hiring Efficiency (Recruitment KPI 5): vacancies closed
// within the month ÷ open positions within the month (hiringEfficiency.js).
// Follows the dashboard's date range, Branch and Position; Source, Stage and
// Gender are applicant-only (TimeToFill says so).
export default function HiringEfficiency({ mrfList, dateRange, filters = {} }) {
  const h = useMemo(() => computeHiringEfficiency(mrfList, dateRange, filters), [mrfList, dateRange, filters]);
  const months = [...h.months].reverse();

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}>
          <StatTile tone={soften(PRIMARY_GREEN)} icon={<PercentageOutlined />} label='Hiring Efficiency' value={fmtRate(h.rate)}
            sub={`${h.closed} closed ÷ ${h.open} open position${h.open === 1 ? '' : 's'} in the period`} />
        </Col>
        <Col xs={24} sm={8}>
          <StatTile tone={soften('#13c2c2')} icon={<CheckSquareOutlined />} label='Vacancies Closed' value={h.closed.toLocaleString()} sub='hired within the period' />
        </Col>
        <Col xs={24} sm={8}>
          <StatTile tone={soften('#fa8c16')} icon={<FolderOpenOutlined />} label='Still Open' value={h.stillOpen.toLocaleString()} sub='approved positions not yet filled (see Aging of Vacancies)' />
        </Col>
      </Row>

      {h.skipped > 0 && (
        <Alert type='warning' showIcon style={{ marginTop: 12 }}
          title={`${h.skipped} hire${h.skipped === 1 ? ' is' : 's are'} dated before the MRF approval and left out, so ${h.skipped === 1 ? 'its position stays' : 'their positions stay'} open.`} />
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}>
          <Card size='small' title='Hiring Efficiency per Month' style={{ borderRadius: 8, height: '100%' }}>
            <ChartBox
              type='bar'
              height={240}
              options={{ plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw ?? '—'}% (${h.months[c.dataIndex].closed} of ${h.months[c.dataIndex].open})` } } }, scales: lineScales('%', true) }}
              data={{ labels: h.months.map((m) => monthLabel(m.key)), datasets: [{ label: 'Hiring Efficiency', data: h.months.map((m) => m.rate), backgroundColor: soften(PRIMARY_GREEN), ...BAR, maxBarThickness: 28 }] }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card size='small' title='Closed vs. Open Positions' style={{ borderRadius: 8, height: '100%' }}
            extra={<Text type='secondary' style={{ fontSize: 11 }}>Open = open at start + newly approved</Text>}>
            <Table rowKey='key' size='small' columns={monthColumns} dataSource={months} pagination={tablePagination(6)} scroll={{ x: 'max-content' }} />
          </Card>
        </Col>
      </Row>

    </div>
  );
}
