import { useState } from 'react';
import { Row, Col, Table, Segmented, Typography, Tag } from 'antd';
import { FileTextOutlined, TeamOutlined, RetweetOutlined, PercentageOutlined, WarningOutlined, CheckCircleOutlined, FieldTimeOutlined } from '@ant-design/icons';
import StatTile from './StatTile';
import ChartCard from './ChartCard';
import { CountBarChart, MonthlyCountChart, TrendLineChart } from './workforceCharts';
import { TONES } from './workforceTones';
import { tablePagination } from '../../../../utils/tablePagination';

const { Text } = Typography;
const fmt = (n) => (n ?? 0).toLocaleString();

const branchColumns = [
  { title: 'Branch', dataIndex: 'label', sorter: (a, b) => a.label.localeCompare(b.label) },
  { title: 'Headcount', dataIndex: 'headcount', align: 'right', render: fmt, sorter: (a, b) => a.headcount - b.headcount },
  { title: 'NTEs', dataIndex: 'ntes', align: 'right', defaultSortOrder: 'descend', sorter: (a, b) => a.ntes - b.ntes },
  { title: 'NTEs per 100', dataIndex: 'ntes_per_100', align: 'right', render: (v) => (v == null ? '—' : v), sorter: (a, b) => (a.ntes_per_100 ?? -1) - (b.ntes_per_100 ?? -1) },
  { title: 'Disciplinary', dataIndex: 'disciplinary', align: 'right', sorter: (a, b) => a.disciplinary - b.disciplinary },
  { title: 'Cases', dataIndex: 'cases', align: 'right', sorter: (a, b) => a.cases - b.cases },
  { title: 'Resolved', dataIndex: 'cases_resolved', align: 'right', sorter: (a, b) => a.cases_resolved - b.cases_resolved },
  { title: 'Resolution Rate', dataIndex: 'resolution_rate', align: 'right', render: (v) => (v == null ? '—' : `${v}%`), sorter: (a, b) => (a.resolution_rate ?? -1) - (b.resolution_rate ?? -1) },
];

const days = (v) => (v == null ? '—' : `${v} day${v === 1 ? '' : 's'}`);
const penaltyColumns = [
  { title: 'Penalty', dataIndex: 'label' },
  { title: 'Target', dataIndex: 'target', align: 'right', render: days },
  { title: 'Cases Resolved', dataIndex: 'resolved', align: 'right' },
  { title: 'Total Days', dataIndex: 'total_days', align: 'right' },
  { title: 'Avg. Resolution Time', dataIndex: 'average', align: 'right', render: days },
  { title: 'Within Target', key: 'within', align: 'right', render: (_, r) => (r.resolved ? `${r.within} of ${r.resolved} (${r.within_rate}%)` : '—') },
  {
    title: 'Status', key: 'status',
    render: (_, r) => (r.resolved
      ? <Tag color={r.average <= r.target ? 'success' : 'error'}>{r.average <= r.target ? 'On target' : `Over by ${Math.round((r.average - r.target) * 10) / 10}`}</Tag>
      : <Text type='secondary'>No cases</Text>),
  },
];

const DISCIPLINARY_VIEWS = [
  { label: 'By offense', value: 'by_offense' },
  { label: 'By action', value: 'by_action' },
];

// NTEs and disciplinary cases issued over the last 12 months, and the Admin
// Case Resolution Rate (Employee Relations KPI 1: resolved ÷ raised).
export default function EmployeeRelations({ relations, months }) {
  const [view, setView] = useState('by_offense');
  const t = relations.totals;
  const rt = relations.resolution_time;
  return (
    <>
      <Row gutter={[12, 12]}>
        <Col flex='1 1 200px'>
          <StatTile
            tone={TONES.people} icon={<CheckCircleOutlined />} label='Admin Case Resolution Rate'
            value={t.resolution_rate == null ? '—' : `${t.resolution_rate}%`}
            sub={`${fmt(t.cases_resolved)} of ${fmt(t.cases)} cases resolved · ${fmt(t.cases_open)} open`}
          />
        </Col>
        <Col flex='1 1 160px'><StatTile tone={TONES.warning} icon={<FileTextOutlined />} label='NTEs Issued' value={fmt(t.ntes)} /></Col>
        <Col flex='1 1 160px'><StatTile tone={TONES.warning} icon={<PercentageOutlined />} label='NTEs per 100 Employees' value={t.ntes_per_100} sub='vs. current headcount' /></Col>
        <Col flex='1 1 160px'><StatTile tone={TONES.warning} icon={<TeamOutlined />} label='Employees with an NTE' value={fmt(t.employees_with_nte)} /></Col>
        <Col flex='1 1 170px'><StatTile tone={TONES.serious} icon={<RetweetOutlined />} label='Repeat Cases' value={fmt(t.repeat_employees)} sub={`employees with ${t.repeat_min}+ NTEs`} /></Col>
        <Col flex='1 1 160px'><StatTile tone={TONES.critical} icon={<WarningOutlined />} label='Disciplinary Cases' value={fmt(t.disciplinary)} /></Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <ChartCard title='NTEs and Disciplinary Cases per Month'>
            <MonthlyCountChart months={months} series={[{ field: 'ntes', label: 'NTEs' }, { field: 'disciplinary', label: 'Disciplinary' }]} />
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard title='Disciplinary Cases' extra={<Segmented size='small' options={DISCIPLINARY_VIEWS} value={view} onChange={setView} />}>
            {relations[view].length
              ? <CountBarChart rows={relations[view]} label='Cases' />
              : <Text type='secondary'>No disciplinary cases in the last 12 months.</Text>}
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard title='Admin Case Resolution Rate per Month'>
            <TrendLineChart months={months} field='resolution_rate' label='Resolved' suffix='%' />
          </ChartCard>
        </Col>
        <Col xs={24} lg={14}>
          <ChartCard title='Admin Cases per Month'>
            <MonthlyCountChart months={months} series={[{ field: 'cases', label: 'Raised' }, { field: 'cases_resolved', label: 'Resolved' }]} />
          </ChartCard>
        </Col>
        <Col xs={24}>
          <ChartCard
            title='Case Resolution Time'
            extra={<Text type='secondary' style={{ fontSize: 12 }}>NTE Date Received by HR → disciplinary Return Date</Text>}
          >
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              <Col flex='1 1 200px'>
                <StatTile tone={TONES.people} icon={<FieldTimeOutlined />} label='Avg. Case Resolution Time' value={days(rt.average)}
                  sub={rt.resolved ? `${fmt(rt.total_days)} days ÷ ${fmt(rt.resolved)} cases resolved` : 'no cases resolved with both dates'} />
              </Col>
              <Col flex='1 1 200px'>
                <StatTile tone={TONES.people} icon={<CheckCircleOutlined />} label='Within Target' value={rt.within_rate == null ? '—' : `${rt.within_rate}%`}
                  sub={`${fmt(rt.within)} of ${fmt(rt.resolved)} cases · targets 5 / 15 / 20 days`} />
              </Col>
            </Row>
            <Table rowKey='label' size='small' columns={penaltyColumns} dataSource={rt.by_penalty} pagination={false} scroll={{ x: 'max-content' }} />
            <Text type='secondary' style={{ fontSize: 12 }}>
              Cases resolved in the last 12 months (by Return Date). Targets: Written / Verbal / Last &amp; Final Warning 5 days, Suspension 15, Dismissal/Termination 20.
              {rt.missing_dates > 0 && ` ${fmt(rt.missing_dates)} resolved case${rt.missing_dates === 1 ? ' is' : 's are'} left out — the NTE has no Date Received by HR (or it is after the Return Date).`}
            </Text>
          </ChartCard>
        </Col>
        <Col xs={24}>
          <ChartCard title='NTEs and Disciplinary Cases by Branch'>
            <Table rowKey='label' size='small' columns={branchColumns} dataSource={relations.by_branch} pagination={tablePagination(10)} scroll={{ x: 'max-content' }} />
            <Text type='secondary' style={{ fontSize: 12 }}>
              By each employee&apos;s current branch; per 100 = NTEs ÷ current headcount (hired, not yet resigned). NTE violations are free text, so they aren&apos;t broken down.
              {' '}Admin case = an NTE (with its disciplinary record, matched by NTE code) or a disciplinary record without an NTE; resolved = status Close/Closed. There is no resolution date, so a case counts in the month it was issued.
            </Text>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
