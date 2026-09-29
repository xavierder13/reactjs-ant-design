import { useState } from 'react';
import { Row, Col, Table, Segmented, Typography } from 'antd';
import { FileTextOutlined, TeamOutlined, RetweetOutlined, PercentageOutlined, WarningOutlined } from '@ant-design/icons';
import StatTile from './StatTile';
import ChartCard from './ChartCard';
import { CountBarChart, MonthlyCountChart } from './workforceCharts';
import { TONES } from './workforceTones';

const { Text } = Typography;
const fmt = (n) => (n ?? 0).toLocaleString();

const branchColumns = [
  { title: 'Branch', dataIndex: 'label', sorter: (a, b) => a.label.localeCompare(b.label) },
  { title: 'Headcount', dataIndex: 'headcount', align: 'right', render: fmt, sorter: (a, b) => a.headcount - b.headcount },
  { title: 'NTEs', dataIndex: 'ntes', align: 'right', defaultSortOrder: 'descend', sorter: (a, b) => a.ntes - b.ntes },
  { title: 'NTEs per 100', dataIndex: 'ntes_per_100', align: 'right', render: (v) => (v == null ? '—' : v), sorter: (a, b) => (a.ntes_per_100 ?? -1) - (b.ntes_per_100 ?? -1) },
  { title: 'Disciplinary', dataIndex: 'disciplinary', align: 'right', sorter: (a, b) => a.disciplinary - b.disciplinary },
];

const DISCIPLINARY_VIEWS = [
  { label: 'By offense', value: 'by_offense' },
  { label: 'By action', value: 'by_action' },
];

// NTEs and disciplinary cases issued over the last 12 months.
export default function EmployeeRelations({ relations, months }) {
  const [view, setView] = useState('by_offense');
  const t = relations.totals;
  return (
    <>
      <Row gutter={[12, 12]}>
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
        <Col xs={24}>
          <ChartCard title='NTEs and Disciplinary Cases by Branch'>
            <Table rowKey='label' size='small' columns={branchColumns} dataSource={relations.by_branch} pagination={{ pageSize: 10, showSizeChanger: true }} scroll={{ x: 'max-content' }} />
            <Text type='secondary' style={{ fontSize: 12 }}>
              By each employee&apos;s current branch; per 100 = NTEs ÷ current headcount (hired, not yet resigned). NTE violations are free text, so they aren&apos;t broken down.
            </Text>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
}
