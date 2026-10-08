import { useMemo } from 'react';
import { Row, Col, Card, Typography, Table, Tag, Alert } from 'antd';
import { FolderOpenOutlined, HourglassOutlined, WarningOutlined } from '@ant-design/icons';
import ChartBox from './ChartBox';
import StatTile from '../../workforce/components/StatTile';
import { BAR, endLabelsPlugin, baseScales, soften } from '../../chartTheme';
import { computeVacancyAging } from '../vacancyAging';
import { tablePagination } from '../../../../utils/tablePagination';

const { Text } = Typography;

const fmtDate = (d) => d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const daysText = (v) => (v == null ? '—' : `${v} day${v === 1 ? '' : 's'}`);
// Older buckets read warmer.
const BUCKET_COLORS = ['#52c41a', '#a0d911', '#fadb14', '#faad14', '#fa8c16', '#f5222d'];

const columns = [
  { title: 'MRF No.', dataIndex: 'mrf' },
  { title: 'Branch', dataIndex: 'branch' },
  { title: 'Position', dataIndex: 'position' },
  { title: 'Rank', dataIndex: 'rank', render: (v) => v || <Text type='secondary'>No rank</Text> },
  { title: 'Date Approved', dataIndex: 'approved', render: fmtDate },
  { title: 'Days Open', dataIndex: 'days', align: 'right', sorter: (a, b) => a.days - b.days, defaultSortOrder: 'descend' },
  {
    title: 'vs. Standard', key: 'standard',
    render: (_, r) => (r.standard == null
      ? <Tag>No standard</Tag>
      : <Tag color={r.overStandard ? 'error' : 'success'}>{r.overStandard ? `Over ${r.standard}-day standard` : `Within ${r.standard} days`}</Tag>),
  },
];

// Manpower Request — Aging of Vacancies (Recruitment KPI 6): days each
// approved MRF position has been open since its Date Approved, as of the end
// of the dashboard's date range (vacancyAging.js). Branch / Position filters
// apply; the range's start doesn't (a snapshot).
export default function VacancyAging({ mrfList, dateRange, filters = {} }) {
  const a = useMemo(() => computeVacancyAging(mrfList, dateRange, filters), [mrfList, dateRange, filters]);

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}>
          <StatTile tone={soften('#fa8c16')} icon={<FolderOpenOutlined />} label='Open Vacancies' value={a.count.toLocaleString()}
            sub={`as of ${fmtDate(a.asOf)}`} />
        </Col>
        <Col xs={24} sm={8}>
          <StatTile tone={soften('#1677ff')} icon={<HourglassOutlined />} label='Average Aging' value={daysText(a.average)}
            sub={a.oldest ? `oldest: ${a.oldest.days} days (${a.oldest.mrf})` : 'no open vacancies'} />
        </Col>
        <Col xs={24} sm={8}>
          <StatTile tone={soften('#f5222d')} icon={<WarningOutlined />} label='Past Time-to-Fill Standard' value={a.overStandard.toLocaleString()}
            sub='open longer than RF 25 / SUP 45 / MGR 60 days' />
        </Col>
      </Row>

      {(a.skipped > 0 || a.noRank > 0) && (
        <Alert
          type='warning' showIcon style={{ marginTop: 12 }}
          title={[
            a.skipped > 0 && `${a.skipped} hire${a.skipped === 1 ? ' is' : 's are'} dated before the MRF approval and ignored, so ${a.skipped === 1 ? 'its position counts' : 'their positions count'} as open.`,
            a.noRank > 0 && `${a.noRank} open position${a.noRank === 1 ? ' has' : 's have'} no rank, so no standard applies.`,
          ].filter(Boolean).join(' ')}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={9}>
          <Card size='small' title='Open Vacancies by Aging' style={{ borderRadius: 8, height: '100%' }}>
            <ChartBox
              type='bar'
              height={240}
              options={{ indexAxis: 'y', layout: { padding: { right: 36 } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} vacanc${c.raw === 1 ? 'y' : 'ies'}` } } }, scales: baseScales(true) }}
              data={{ labels: a.buckets.map((b) => b.label), datasets: [{ label: 'Open vacancies', data: a.buckets.map((b) => b.count), backgroundColor: BUCKET_COLORS.map((c) => soften(c)), ...BAR, maxBarThickness: 18 }] }}
              plugins={[endLabelsPlugin]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          <Card size='small' title='Open Vacancies' style={{ borderRadius: 8, height: '100%' }}
            extra={<Text type='secondary' style={{ fontSize: 11 }}>Days since Date Approved</Text>}>
            <Table rowKey='key' size='small' columns={columns} dataSource={a.open} pagination={tablePagination(8)} scroll={{ x: 'max-content' }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
