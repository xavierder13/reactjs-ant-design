import { useMemo } from 'react';
import { Row, Col, Card, Typography, Table, Tag, Alert } from 'antd';
import { FieldTimeOutlined, CheckCircleOutlined, UserAddOutlined } from '@ant-design/icons';
import ChartBox from './ChartBox';
import StatTile from '../../workforce/components/StatTile';
import { STAGE_COLORS, PRIMARY_GREEN } from '../chartSetup';
import { BAR, LINE, endLabelsPlugin, baseScales, lineScales, soften } from '../../chartTheme';
import { computeTimeToFill, TIME_TO_FILL_STANDARDS } from '../timeToFill';
import { tablePagination } from '../../../../utils/tablePagination';

const { Text } = Typography;

const monthLabel = (mk) => { const [y, m] = mk.split('-'); return new Date(+y, +m - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' }); };
const fmtDate = (d) => d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const daysText = (v) => (v == null ? '—' : `${v} day${v === 1 ? '' : 's'}`);
const STANDARD_TEXT = TIME_TO_FILL_STANDARDS.filter((s) => s.short !== 'TOP').map((s) => `${s.short} ${s.days}`).join(' / ');

const standardTag = (average, standard) => {
  if (standard == null || average == null) return <Tag>No standard</Tag>;
  return average <= standard ? <Tag color='success'>On target</Tag> : <Tag color='error'>Over by {Math.round((average - standard) * 10) / 10}</Tag>;
};

const rankColumns = [
  { title: 'Rank', dataIndex: 'rank' },
  { title: 'Standard', dataIndex: 'standard', align: 'right', render: daysText },
  { title: 'Positions Filled', dataIndex: 'filled', align: 'right' },
  { title: 'Total Days Vacant', dataIndex: 'totalDays', align: 'right' },
  { title: 'Time to Fill', dataIndex: 'average', align: 'right', render: daysText },
  { title: 'Within Standard', key: 'within', align: 'right', render: (_, r) => (r.withinPct == null ? '—' : `${r.within} of ${r.filled} (${r.withinPct}%)`) },
  { title: 'Status', key: 'status', render: (_, r) => (r.filled ? standardTag(r.average, r.standard) : <Text type='secondary'>No fills</Text>) },
];

const filledColumns = [
  { title: 'MRF No.', dataIndex: 'mrf' },
  { title: 'Branch', dataIndex: 'branch' },
  { title: 'Position', dataIndex: 'position' },
  { title: 'Rank', dataIndex: 'rank' },
  { title: 'Date Approved', dataIndex: 'approved', render: fmtDate },
  { title: 'Date Hired', dataIndex: 'hired', render: fmtDate, sorter: (a, b) => a.hired - b.hired, defaultSortOrder: 'descend' },
  { title: 'Days Vacant', dataIndex: 'days', align: 'right', sorter: (a, b) => a.days - b.days },
  { title: 'Standard', key: 'standard', render: (_, r) => (r.standard == null ? <Tag>No standard</Tag> : <Tag color={r.withinStandard ? 'success' : 'error'}>{r.standard} days</Tag>) },
];

// Manpower Request — Time to Fill (Recruitment KPI 4): Σ days each position
// stayed vacant (MRF Date Approved → Date Hired) ÷ No. of positions filled,
// for positions filled within the dashboard's date range, against the
// Standard Time To Fill by position rank (RF 25 / SUP 45 / MGR 60 days; Top
// Management uses MGR). Distinct from Avg Time to Hire (applicant → Hired
// stage). The MRF list is scoped server-side to what the viewer can see; it
// follows the dashboard's date range, Branch and Position filters (Source,
// Stage and Gender describe applicants, so they can't apply — said so when set).
export default function TimeToFill({ mrfList, dateRange, filters = {} }) {
  const t = useMemo(() => computeTimeToFill(mrfList, dateRange, filters), [mrfList, dateRange, filters]);
  const unapplied = [filters.source && 'Source', filters.stage && 'Stage', filters.gender && 'Gender'].filter(Boolean);
  const period = dateRange?.from || dateRange?.to ? `${dateRange.from || 'start'} to ${dateRange.to || 'today'}` : 'all dates';
  const byPosition = t.byPosition.slice(0, 8);
  const noRank = t.byRank.find((r) => r.rank === 'No rank');

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}>
          <StatTile tone={soften(PRIMARY_GREEN)} icon={<FieldTimeOutlined />} label='Time to Fill' value={daysText(t.average)}
            sub={t.filled ? `${t.totalDays.toLocaleString()} days ÷ ${t.filled} position${t.filled === 1 ? '' : 's'} filled` : `no positions filled, ${period}`} />
        </Col>
        <Col xs={24} sm={8}>
          <StatTile tone={soften('#13c2c2')} icon={<CheckCircleOutlined />} label='Within Standard' value={t.withinPct == null ? '—' : `${t.withinPct}%`}
            sub={`${t.within} of ${t.withStandard} filled within ${STANDARD_TEXT} days`} />
        </Col>
        <Col xs={24} sm={8}>
          <StatTile tone={soften('#722ed1')} icon={<UserAddOutlined />} label='Positions Filled' value={t.filled.toLocaleString()} sub={`hired ${period}`} />
        </Col>
      </Row>

      {unapplied.length > 0 && (
        <Alert
          type='info' showIcon style={{ marginTop: 12 }}
          title={`The ${unapplied.join(', ')} filter${unapplied.length > 1 ? 's describe' : ' describes'} applicants, so ${unapplied.length > 1 ? 'they don’t' : 'it doesn’t'} apply to Manpower Requests. Date range, Branch and Position do.`}
        />
      )}

      {(t.skipped > 0 || noRank?.filled > 0) && (
        <Alert
          type='warning' showIcon style={{ marginTop: 12 }}
          title={[
            t.skipped > 0 && `${t.skipped} hire${t.skipped === 1 ? ' is' : 's are'} dated before the MRF approval and left out.`,
            noRank?.filled > 0 && `${noRank.filled} filled position${noRank.filled === 1 ? ' has' : 's have'} no rank, so no standard applies — set the position's rank.`,
          ].filter(Boolean).join(' ')}
        />
      )}

      <Card size='small' title='Time to Fill by Rank' style={{ borderRadius: 8, marginTop: 16 }}
        extra={<Text type='secondary' style={{ fontSize: 11 }}>Standard: {STANDARD_TEXT} days</Text>}>
        <Table rowKey='rank' size='small' columns={rankColumns} dataSource={t.byRank} pagination={false} scroll={{ x: 'max-content' }} />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card size='small' title='Time to Fill by Position' style={{ borderRadius: 8, height: '100%' }}>
            <ChartBox
              type='bar'
              height={220}
              options={{ indexAxis: 'y', layout: { padding: { right: 44 } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} days (standard ${byPosition[c.dataIndex]?.standard ?? '—'})` } } }, scales: baseScales(true) }}
              data={{ labels: byPosition.map((p) => p.position), datasets: [{ label: 'Time to Fill', data: byPosition.map((p) => p.average), backgroundColor: STAGE_COLORS.slice(0, byPosition.length).map((c) => soften(c)), ...BAR, maxBarThickness: 18 }] }}
              plugins={[endLabelsPlugin]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size='small' title='Time to Fill Trend (by Hire Month)' style={{ borderRadius: 8, height: '100%' }}>
            <ChartBox
              type='line'
              height={220}
              options={{ interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} days` } } }, scales: lineScales('', true) }}
              data={{
                labels: t.byMonth.map((m) => monthLabel(m.key)),
                datasets: [{ label: 'Time to Fill', data: t.byMonth.map((m) => m.average), borderColor: '#722ed1', backgroundColor: 'rgba(114,46,209,0.1)', fill: true, ...LINE }],
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card size='small' title='Positions Filled' style={{ borderRadius: 8, marginTop: 16 }}
        extra={<Text type='secondary' style={{ fontSize: 11 }}>Date Approved → Date Hired</Text>}>
        <Table rowKey='key' size='small' columns={filledColumns} dataSource={t.rows} pagination={tablePagination(10)} scroll={{ x: 'max-content' }} />
      </Card>
    </div>
  );
}
