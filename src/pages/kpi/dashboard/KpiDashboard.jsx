import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, Row, Col, DatePicker, Select, Segmented, Button, Table, Tag, Progress, Typography, Empty, Space, Drawer, Grid, App,
} from 'antd';
import {
  ReloadOutlined, FileExcelOutlined, TeamOutlined, AuditOutlined, TrophyOutlined, FallOutlined, CheckCircleOutlined, DashboardOutlined, ShopOutlined, ApartmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import kpiReportApi from '../../../services/kpi/kpiReportApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { downloadKpiDashboardReport } from '../../../utils/kpiDashboardReport';
import StatTile from '../../dashboard/workforce/components/StatTile';
import ChartBox from '../../dashboard/recruitment/components/ChartBox';
import DashboardTabLayout from '../../dashboard/components/DashboardTabLayout';
import { BAR, baseScales, endLabelsPlugin, soften } from '../../dashboard/chartTheme';
import { RATING_BANDS, bandOf, filterRows, summarize, rankPosition, averageBy } from './kpiDashboard';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const TYPE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'Self', value: 'self' },
];
const MEDALS = { 1: '#d4b106', 2: '#8c8c8c', 3: '#ad6800' };

// Tabs, each a list of sections (rendered by renderSection).
const TABS = [
  { key: 'overview', label: 'Overview', icon: <DashboardOutlined />, description: 'The headline numbers for the period and how final grades spread across the rating scale.', sections: [
    { id: 'headline', title: 'Headline Numbers' },
    { id: 'distribution', title: 'Rating Distribution' },
  ] },
  { key: 'ranking', label: 'Ranking per Position', icon: <TrophyOutlined />, description: 'Employees of one position ranked by their average final grade in the period.', sections: [
    { id: 'ranking', title: 'KPI Ranking per Position' },
  ] },
  { key: 'branches', label: 'By Branch', icon: <ShopOutlined />, description: 'The average final grade per branch — each employee counts once.', sections: [
    { id: 'branch-chart', title: 'Average Final Grade per Branch' },
    { id: 'branch-table', title: 'Branch Details' },
  ] },
  { key: 'positions', label: 'By Position', icon: <ApartmentOutlined />, description: 'The average final grade per position — each employee counts once.', sections: [
    { id: 'position-table', title: 'Average Final Grade per Position' },
  ] },
];

const grade = (v) => (v == null ? '—' : v.toFixed(2));
const BandTag = ({ value }) => {
  const band = bandOf(value);
  return band ? <Tag color={band.color} style={{ marginInlineEnd: 0 }}>{band.label}</Tag> : null;
};
const GradeBar = ({ value }) => {
  const band = bandOf(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
      <Progress percent={Math.max(0, Math.min(100, value ?? 0))} showInfo={false} size='small' strokeColor={band?.color} style={{ flex: 1, margin: 0 }} />
      <Text strong style={{ width: 48, textAlign: 'right' }}>{grade(value)}</Text>
    </div>
  );
};

const rankingColumns = [
  {
    title: 'Rank', dataIndex: 'rank', width: 70, align: 'center',
    render: (rank) => (MEDALS[rank]
      ? <TrophyOutlined style={{ color: MEDALS[rank], fontSize: 18 }} aria-label={`Rank ${rank}`} />
      : <Text strong>{rank}</Text>),
  },
  {
    title: 'Employee', key: 'employee',
    render: (_, r) => (<div><Text strong>{r.employee_name}</Text><div><Text type='secondary' style={{ fontSize: 12 }}>{r.employee_code}</Text></div></div>),
  },
  { title: 'Branch', dataIndex: 'branch' },
  { title: 'Evaluations', dataIndex: 'evaluations', align: 'right' },
  { title: 'Job', dataIndex: 'job', align: 'right', render: grade },
  { title: 'Behavior', dataIndex: 'behavior', align: 'right', render: grade },
  { title: 'Demerit', dataIndex: 'demerit', align: 'right', render: (v) => (v ? `−${grade(v)}` : '—') },
  { title: 'Final Grade', dataIndex: 'final', render: (v) => <GradeBar value={v} />, sorter: (a, b) => a.final - b.final },
  { title: 'Rating', dataIndex: 'final', key: 'band', render: (v) => <BandTag value={v} /> },
];

const groupColumns = (label) => [
  { title: label, dataIndex: 'label' },
  { title: 'Employees', dataIndex: 'employees', align: 'right', sorter: (a, b) => a.employees - b.employees },
  { title: 'Evaluations', dataIndex: 'evaluations', align: 'right' },
  { title: 'Average Final Grade', dataIndex: 'average', render: (v) => <GradeBar value={v} />, sorter: (a, b) => a.average - b.average, defaultSortOrder: 'descend' },
  { title: 'Highest', dataIndex: 'highest', align: 'right', render: grade },
  { title: 'Lowest', dataIndex: 'lowest', align: 'right', render: grade },
  { title: 'Rating', dataIndex: 'average', key: 'band', render: (v) => <BandTag value={v} /> },
];

// KPI Dashboard — approved evaluations' final grades, in tabs (TABS:
// Overview, Ranking per Position, By Branch, By Position) under the shared
// sticky bar (../../dashboard/components/DashboardTabLayout). Data: the Consolidated Report endpoint (same
// permission, kpi-report-view); the period is sent to the server, the other
// filters apply in the browser. An employee with several evaluations in the
// period counts once, with the average of their final grades.
export default function KpiDashboard() {
  const { message: messageApi } = App.useApp();
  const [period, setPeriod] = useState([dayjs().startOf('year'), dayjs().endOf('year')]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [positionIds, setPositionIds] = useState([]);
  const [branch, setBranch] = useState(null);
  const [type, setType] = useState('all');
  const [rankPositionId, setRankPositionId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const screens = Grid.useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await kpiReportApi.getConsolidated({
        period_from: period?.[0] ? period[0].format('YYYY-MM-DD') : undefined,
        period_to: period?.[1] ? period[1].format('YYYY-MM-DD') : undefined,
      });
      setRows(data.rows || []);
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  }, [period, messageApi]);

  useEffect(() => {
    const refresh = async () => { await load(); };
    refresh();
  }, [load]);

  // Filter options come from the data (a KPI-only user may lack the
  // positions / branches modules' permissions).
  const positionOptions = useMemo(() => [...new Map(rows.map((r) => [r.position_id, r.position || 'Unknown'])).entries()]
    .map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)), [rows]);
  const branchOptions = useMemo(() => [...new Set(rows.map((r) => r.branch).filter(Boolean))].sort()
    .map((b) => ({ value: b, label: b })), [rows]);

  const filtered = useMemo(() => filterRows(rows, { positionIds, branch, type }), [rows, positionIds, branch, type]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const byBranch = useMemo(() => averageBy(summary.scores, 'branch'), [summary]);
  const byPosition = useMemo(() => averageBy(summary.scores, 'position'), [summary]);

  // Ranking: the chosen position, else the one with the most employees.
  const rankable = useMemo(() => [...new Map(summary.scores.map((s) => [s.position_id, s.position])).entries()]
    .map(([value, label]) => ({ value, label, count: summary.scores.filter((s) => s.position_id === value).length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)), [summary]);
  const activeRankId = rankable.some((p) => p.value === rankPositionId) ? rankPositionId : rankable[0]?.value;
  const ranking = useMemo(() => (activeRankId == null ? [] : rankPosition(summary.scores, activeRankId)), [summary, activeRankId]);

  const reset = () => { setPositionIds([]); setBranch(null); setType('all'); };
  const avgBand = bandOf(summary.average);

  // The filter controls — inline at the top, stacked in the Filters drawer.
  const filterFields = (vertical) => {
    const col = (props) => (vertical ? { xs: 24 } : props);
    return (
      <Row gutter={[12, vertical ? 16 : 12]} align='bottom'>
        <Col {...col({ xs: 24, md: 8 })}>
          <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Evaluation period</Text>
          <RangePicker style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} value={period} onChange={setPeriod} allowClear />
        </Col>
        <Col {...col({ xs: 24, sm: 12, md: 6 })}>
          <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Positions</Text>
          <Select mode='multiple' allowClear maxTagCount='responsive' placeholder='All positions' style={{ width: '100%' }}
            options={positionOptions} value={positionIds} onChange={setPositionIds} showSearch={{ optionFilterProp: 'label' }} />
        </Col>
        <Col {...col({ xs: 24, sm: 12, md: 5 })}>
          <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Branch</Text>
          <Select allowClear placeholder='All branches' style={{ width: '100%' }} options={branchOptions} value={branch} onChange={(v) => setBranch(v ?? null)}
            showSearch={{ optionFilterProp: 'label' }} />
        </Col>
        <Col {...col({ xs: 24, md: 5 })}>
          <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Evaluation type</Text>
          <Space wrap>
            <Segmented size='small' options={TYPE_OPTIONS} value={type} onChange={setType} />
            {!vertical && <Button size='small' onClick={reset}>Reset</Button>}
          </Space>
        </Col>
      </Row>
    );
  };

  // The filters in effect, as removable tags in the sticky bar.
  const chips = [
    positionIds.length > 0 && { key: 'positions', label: positionIds.length > 1 ? 'Positions' : 'Position', value: positionIds.map((id) => positionOptions.find((o) => o.value === id)?.label).filter(Boolean).join(', ') },
    branch && { key: 'branch', label: 'Branch', value: branch },
    type !== 'all' && { key: 'type', label: 'Type', value: TYPE_OPTIONS.find((o) => o.value === type)?.label },
  ].filter(Boolean);
  const clearFilter = (key) => {
    if (key === 'positions') setPositionIds([]);
    if (key === 'branch') setBranch(null);
    if (key === 'type') setType('all');
  };
  const periodText = period?.[0] && period?.[1]
    ? `${period[0].format('MMM D, YYYY')} – ${period[1].format('MMM D, YYYY')}`
    : 'All periods';

  const exportReport = () => {
    try {
      downloadKpiDashboardReport(summary, periodText, chips.map((c) => `${c.label}: ${c.value}`).join(' / ') || 'None', dayjs().format('YYYYMMDD'));
    } catch (error) {
      console.error('[KpiDashboard] export error:', error);
      messageApi.error('Failed to export the report.');
    }
  };

  const tabs = TABS.map((t) => ({
    ...t,
    badge: { ranking: summary.employees, branches: byBranch.length, positions: byPosition.length }[t.key],
  }));

  // Each section, by id — grouped into tabs by TABS.
  const renderSection = (id) => {
    switch (id) {
      case 'headline': return (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6} xl={5}>
            <StatTile tone={soften('#389e0d')} icon={<AuditOutlined />} label='Average Final Grade' value={grade(summary.average)} sub={avgBand ? avgBand.label : '—'} />
          </Col>
          <Col xs={12} md={6} xl={5}>
            <StatTile tone={soften('#1677ff')} icon={<TeamOutlined />} label='Employees Evaluated' value={summary.employees.toLocaleString()}
              sub={`${summary.evaluations} approved evaluation${summary.evaluations === 1 ? '' : 's'}`} />
          </Col>
          <Col xs={12} md={6} xl={5}>
            <StatTile tone={soften('#13c2c2')} icon={<CheckCircleOutlined />} label='Passing (75+)'
              value={summary.employees ? `${Math.round((summary.passing / summary.employees) * 1000) / 10}%` : '—'}
              sub={`${summary.passing} of ${summary.employees} employees`} />
          </Col>
          <Col xs={12} md={6} xl={5}>
            <StatTile tone={soften('#d4b106')} icon={<TrophyOutlined />} label='Top Employee' value={grade(summary.top?.final)}
              sub={summary.top ? `${summary.top.employee_name} · ${summary.top.position}` : '—'} />
          </Col>
          <Col xs={24} md={6} xl={4}>
            <StatTile tone={soften('#f5222d')} icon={<FallOutlined />} label='Lowest' value={grade(summary.bottom?.final)}
              sub={summary.bottom ? `${summary.bottom.employee_name} · ${summary.bottom.position}` : '—'} />
          </Col>
        </Row>
      );
      case 'distribution': return (
        <Card size='small' style={{ borderRadius: 8, marginBottom: 24 }} extra={<Text type='secondary' style={{ fontSize: 11 }}>Employees per rating</Text>} title='Rating Distribution'>
          <ChartBox
            type='bar'
            height={260}
            options={{ indexAxis: 'y', layout: { padding: { right: 36 } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} employee${c.raw === 1 ? '' : 's'}` } } }, scales: baseScales(true) }}
            data={{
              labels: summary.distribution.map((b) => `${b.label} (${b.min === -Infinity ? 'below 75' : `${b.min}+`})`),
              datasets: [{ label: 'Employees', data: summary.distribution.map((b) => b.count), backgroundColor: RATING_BANDS.map((b) => soften(b.color)), ...BAR, maxBarThickness: 18 }],
            }}
            plugins={[endLabelsPlugin]}
          />
          <Text type='secondary' style={{ fontSize: 12 }}>
            Ratings: {RATING_BANDS.map((b) => `${b.label} ${b.min === -Infinity ? 'below 75' : `${b.min}+`}`).join(' · ')}.
          </Text>
        </Card>
      );
      case 'ranking': return (
        <Card
          size='small'
          style={{ borderRadius: 8, marginBottom: 24 }}
          title={(
            <Space wrap>
              <span>Ranking for</span>
              <Select size='small' style={{ minWidth: 240 }} value={activeRankId} onChange={setRankPositionId}
                options={rankable.map((p) => ({ value: p.value, label: `${p.label} (${p.count})` }))} showSearch={{ optionFilterProp: 'label' }} />
            </Space>
          )}
          extra={<Text type='secondary' style={{ fontSize: 11 }}>By average final grade in the period</Text>}
        >
          <Table rowKey='key' size='small' columns={rankingColumns} dataSource={ranking} pagination={{ pageSize: 10, showSizeChanger: true }} scroll={{ x: 'max-content' }} />
        </Card>
      );
      case 'branch-chart': return (
        <Card size='small' style={{ borderRadius: 8, marginBottom: 24 }} extra={<Text type='secondary' style={{ fontSize: 11 }}>Each employee counts once</Text>}>
          <ChartBox
            type='bar'
            height={Math.max(260, byBranch.slice(0, 15).length * 26 + 40)}
            options={{ indexAxis: 'y', layout: { padding: { right: 44 } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} (${byBranch[c.dataIndex].employees} employees)` } } }, scales: { ...baseScales(true), x: { ...baseScales(true).x, min: 0, max: 100 } } }}
            data={{
              labels: byBranch.slice(0, 15).map((b) => b.label),
              datasets: [{ label: 'Average final grade', data: byBranch.slice(0, 15).map((b) => b.average), backgroundColor: byBranch.slice(0, 15).map((b) => soften(bandOf(b.average)?.color || '#8c8c8c')), ...BAR, maxBarThickness: 18 }],
            }}
            plugins={[endLabelsPlugin]}
          />
          {byBranch.length > 15 && <Text type='secondary' style={{ fontSize: 12 }}>Top 15 of {byBranch.length} branches — all are in the table below.</Text>}
        </Card>
      );
      case 'branch-table': return (
        <Card size='small' style={{ borderRadius: 8, marginBottom: 24 }}>
          <Table rowKey='label' size='small' columns={groupColumns('Branch')} dataSource={byBranch} pagination={{ pageSize: 10, showSizeChanger: true }} scroll={{ x: 'max-content' }} />
        </Card>
      );
      case 'position-table': return (
        <Card size='small' style={{ borderRadius: 8, marginBottom: 24 }}>
          <Table rowKey='label' size='small' columns={groupColumns('Position')} dataSource={byPosition} pagination={{ pageSize: 10, showSizeChanger: true }} scroll={{ x: 'max-content' }} />
        </Card>
      );
      default: return null;
    }
  };

  return (
    <>
      {/* Same top row as the Recruitment / Workforce Dashboards. */}
      <Row justify='space-between' align='middle' gutter={[8, 8]} style={{ marginBottom: 20 }}>
        <Col>
          <Tag color='success' icon={<CheckCircleOutlined />}>
            {summary.evaluations.toLocaleString()} approved evaluation{summary.evaluations === 1 ? '' : 's'} · {summary.employees.toLocaleString()} employee{summary.employees === 1 ? '' : 's'}
          </Tag>
        </Col>
        <Col>
          <Space>
            <Button size='small' icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
            <Button size='small' type='primary' icon={<FileExcelOutlined />} onClick={exportReport} disabled={loading || summary.employees === 0}>Export Report</Button>
          </Space>
        </Col>
      </Row>

      <Card size='small' style={{ borderRadius: 8, marginBottom: 16 }}>{filterFields(false)}</Card>

      <Drawer
        title='Filters'
        placement='right'
        size={screens.sm ? 380 : '100%'}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        extra={<Text type='secondary' style={{ fontSize: 12 }}>{chips.length ? `${chips.length} active` : 'None active'}</Text>}
        footer={(
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button icon={<ReloadOutlined />} onClick={reset}>Reset all</Button>
            <Button type='primary' onClick={() => setFiltersOpen(false)}>Done</Button>
          </div>
        )}
      >
        {filterFields(true)}
        <Text type='secondary' style={{ fontSize: 12, display: 'block', marginTop: 16 }}>
          The period reloads the data; positions, branch and type apply immediately to every tab.
        </Text>
      </Drawer>

      <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s' }}>
        {/* Tabs (?tab=), sticky bar, jump links — shared with the other dashboards. */}
        <DashboardTabLayout
          tabs={tabs}
          renderSection={(id) => (!loading && summary.employees === 0
            ? (id === TABS.find((t) => t.sections.some((sec) => sec.id === id)).sections[0].id
              ? <Card style={{ borderRadius: 8 }}><Empty description='No approved KPI evaluations match these filters. Only approved evaluations have a final grade.' /></Card>
              : null)
            : renderSection(id))}
          nav={{
            chips,
            period: periodText,
            emptyText: 'All positions, branches and evaluation types',
            onClearFilter: clearFilter,
            onShowFilters: () => setFiltersOpen(true),
            jumpMin: 2,
          }}
        />
      </div>
    </>
  );
}
