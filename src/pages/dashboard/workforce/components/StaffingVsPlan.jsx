import { useState } from 'react';
import { Row, Col, Table, Segmented, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { AimOutlined, TeamOutlined, UserAddOutlined, PieChartOutlined, UsergroupDeleteOutlined } from '@ant-design/icons';
import StatTile from './StatTile';
import ChartCard from './ChartCard';
import { TONES } from './workforceTones';
import useAuth from '../../../../hooks/useAuth';

const { Text } = Typography;
const fmt = (n) => (n ?? 0).toLocaleString();

const GROUPS = [
  { label: 'Branch', value: 'by_branch' },
  { label: 'Position', value: 'by_position' },
];

const columnsFor = (groupLabel) => [
  { title: groupLabel, dataIndex: 'label', sorter: (a, b) => a.label.localeCompare(b.label) },
  { title: 'Required', dataIndex: 'required', align: 'right', render: fmt, sorter: (a, b) => a.required - b.required },
  { title: 'Current', dataIndex: 'current', align: 'right', render: fmt, sorter: (a, b) => a.current - b.current },
  { title: 'Short', dataIndex: 'short', align: 'right', render: fmt, defaultSortOrder: 'descend', sorter: (a, b) => a.short - b.short },
  { title: 'Excess', dataIndex: 'excess', align: 'right', sorter: (a, b) => a.excess - b.excess },
  { title: 'Filled', dataIndex: 'fill_rate', align: 'right', render: (v) => (v == null ? '—' : `${v}%`), sorter: (a, b) => (a.fill_rate ?? -1) - (b.fill_rate ?? -1) },
];

// Required plantilla vs. active employees (the Vacancies page's comparison).
export default function StaffingVsPlan({ staffing, unappliedFilters = [] }) {
  const [group, setGroup] = useState('by_branch');
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const canOpenVacancies = hasRole('Administrator') || hasPermission('vacancy-list');
  const t = staffing.totals;
  const groupLabel = GROUPS.find((g) => g.value === group).label;
  return (
    <>
      <Row gutter={[12, 12]}>
        <Col flex='1 1 160px'><StatTile tone={TONES.people} icon={<AimOutlined />} label='Required (Plan)' value={fmt(t.required)} /></Col>
        <Col flex='1 1 160px'><StatTile tone={TONES.people} icon={<TeamOutlined />} label='Current (in Plan)' value={fmt(t.current)} sub={t.unplanned ? `+${fmt(t.unplanned)} in positions not in the plan` : undefined} /></Col>
        <Col flex='1 1 160px'><StatTile tone={TONES.critical} icon={<UserAddOutlined />} label='Short' value={fmt(t.short)} sub='open headcount = Total Vacancies' /></Col>
        <Col flex='1 1 160px'><StatTile tone={TONES.warning} icon={<UsergroupDeleteOutlined />} label='Excess' value={fmt(t.excess)} sub='above the required count' /></Col>
        <Col flex='1 1 160px'><StatTile tone={TONES.people} icon={<PieChartOutlined />} label='Fill Rate' value={t.fill_rate == null ? '—' : `${t.fill_rate}%`} sub='required positions filled' /></Col>
      </Row>
      <div style={{ marginTop: 16 }}>
        <ChartCard
          title='Staffing by Group'
          extra={(
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              {canOpenVacancies && <Button size='small' onClick={() => navigate('/vacancies')}>Open Vacancies</Button>}
              <Segmented size='small' options={GROUPS} value={group} onChange={setGroup} />
            </span>
          )}
        >
          <Table key={group} rowKey='label' size='small' columns={columnsFor(groupLabel)} dataSource={staffing[group]} pagination={{ pageSize: 10, showSizeChanger: true }} scroll={{ x: 'max-content' }} />
          <Text type='secondary' style={{ fontSize: 12 }}>
            Plan = required employees per branch and position; current = active employees in the same branch and position.
            {unappliedFilters.length > 0 && ` The plan is only by branch and position, so the ${unappliedFilters.join(', ')} filter${unappliedFilters.length > 1 ? 's don’t' : ' doesn’t'} apply here.`}
          </Text>
        </ChartCard>
      </div>
    </>
  );
}
