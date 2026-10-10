import { useCallback, useEffect, useMemo, useState } from 'react';
import { Row, Col, Button, Space, Alert, Typography, Drawer, Grid, Tag, App } from 'antd';
import {
  ReloadOutlined, FileExcelOutlined, CheckCircleOutlined, DashboardOutlined, TeamOutlined, SwapOutlined, SafetyCertificateOutlined, AlertOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import workforceDashboardApi from '../../../services/dashboard/workforceDashboardApi';
import handleApiError from '../../../utils/handleApiError';
import { downloadWorkforceReport } from '../../../utils/workforceReport';
import SectionLabel from './components/SectionLabel';
import WorkforceSkeleton from './components/WorkforceSkeleton';
import WorkforceOverviewCards from './components/WorkforceOverviewCards';
import WorkforceFilters from './components/WorkforceFilters';
import { NO_FILTERS, toQuery, DATE_FIELD_OPTIONS } from './components/workforceFilterQuery';
import DashboardTabLayout from '../components/DashboardTabLayout';
import HeadcountSummary from './components/HeadcountSummary';
import WorkforceMix from './components/WorkforceMix';
import HeadcountBreakdown from './components/HeadcountBreakdown';
import AgeAndTenure from './components/AgeAndTenure';
import WorkforceDemographics from './components/WorkforceDemographics';
import MovementSummary from './components/MovementSummary';
import MovementCharts from './components/MovementCharts';
import DataNotes from './components/DataNotes';
import AttritionSummary from './components/AttritionSummary';
import AttritionCharts from './components/AttritionCharts';
import TurnoverTable from './components/TurnoverTable';
import ExitInterviews from './components/ExitInterviews';
import RegularizationStatus from './components/RegularizationStatus';
import QualityOfHires from './components/QualityOfHires';
import EmployeeRelations from './components/EmployeeRelations';
import StaffingVsPlan from './components/StaffingVsPlan';
import PeopleMoments from './components/PeopleMoments';

const { Text } = Typography;

// Tabs, each a list of sections (rendered by renderSection). Export Report
// still covers every section.
const TABS = [
  { key: 'overview', label: 'Overview', icon: <DashboardOutlined />, description: 'Company-wide headline numbers and the people moments coming up.', sections: [
    { id: 'overview-cards', title: 'Workforce Overview' },
    { id: 'moments', title: 'People Moments' },
  ] },
  { key: 'headcount', label: 'Headcount', icon: <TeamOutlined />, description: 'Who works here now — headcount, composition and demographics.', sections: [
    { id: 'composition', title: 'Headcount & Composition' },
    { id: 'demographics', title: 'Workforce Demographics' },
  ] },
  { key: 'movement', label: 'Movement & Attrition', icon: <SwapOutlined />, description: 'Hires, separations and turnover over the last 12 months, why people left, and exit interviews.', sections: [
    { id: 'movement', title: 'Hires vs. Separations' },
    { id: 'attrition', title: 'Attrition' },
    { id: 'exit-interviews', title: 'Exit Interview Analysis' },
  ] },
  { key: 'regularization', label: 'Regularization & Staffing', icon: <SafetyCertificateOutlined />, description: 'Regularization due dates, quality of hires and staffing against the plantilla.', sections: [
    { id: 'regularization', title: 'Regularization' },
    { id: 'quality', title: 'Quality of Hires' },
    { id: 'staffing', title: 'Staffing vs. Plan' },
  ] },
  { key: 'relations', label: 'Employee Relations', icon: <AlertOutlined />, description: 'NTEs and disciplinary cases over the last 12 months.', sections: [
    { id: 'relations', title: 'Employee Relations' },
  ] },
];

// Workforce Dashboard — HR analytics over Employee Master Data, grouped into
// tabs (TABS: Overview, Headcount, Movement & Attrition, Regularization &
// Staffing, Employee Relations) under the shared sticky bar
// (../components/DashboardTabLayout). Export Report writes every
// section (except people moments) to Excel. Loads
// /employee_dashboard/summary, holds the filter state, and renders one
// component per section (components/). The recruitment pipeline lives on
// its own page (/dashboard).
const WorkforceDashboardPage = () => {
  const { message } = App.useApp();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  // Refetch only when the request actually changes (e.g. not when a date
  // field is picked before its range).
  const queryKey = JSON.stringify(toQuery(filters));

  const fetchSummary = useCallback(async (activeFilters) => {
    setLoading(true);
    try {
      const { data } = await workforceDashboardApi.getSummary(activeFilters);
      setDashboard(data.dashboard);
      setLoadFailed(false);
    } catch (error) {
      setLoadFailed(true);
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const load = async () => { await fetchSummary(JSON.parse(queryKey)); };
    load();
  }, [fetchSummary, queryKey, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // The current month is month-to-date — say so wherever it's shown.
  const toDate = (list) => list.map((m, i, all) => (i === all.length - 1 ? { ...m, label: `${m.label} (to date)` } : m));
  const months = useMemo(() => toDate(dashboard?.movement.months || []), [dashboard]);
  const relationMonths = useMemo(() => toDate(dashboard?.relations.months || []), [dashboard]);
  const qualityMonths = useMemo(() => toDate(dashboard?.quality_of_hires.months || []), [dashboard]);
  const exitMonths = useMemo(() => toDate(dashboard?.attrition.exit_interviews?.months || []), [dashboard]);

  const exportReport = () => {
    const query = JSON.parse(queryKey);
    const branch = dashboard.filters.branches.find((b) => b.id === query.branch_id)?.name;
    const department = dashboard.filters.departments.find((d) => d.id === query.department_id)?.name;
    const position = dashboard.filters.positions?.find((p) => p.id === query.position_id)?.name;
    const dates = query.date_field
      ? `${DATE_FIELD_OPTIONS.find((o) => o.value === query.date_field)?.label} ${dayjs(query.date_from).format('MM/DD/YYYY')}–${dayjs(query.date_to).format('MM/DD/YYYY')}`
      : null;
    try {
      downloadWorkforceReport(dashboard, [branch, department, position, query.employment_type, dates].filter(Boolean).join(' / ') || 'Company-wide');
    } catch (error) {
      console.error('[WorkforceDashboard] export error:', error);
      message.error('Failed to export the report.');
    }
  };

  if (!dashboard) {
    return loadFailed
      ? <Alert type='error' showIcon title="The Workforce Dashboard couldn't be loaded." action={<Button onClick={refresh}>Retry</Button>} />
      : <WorkforceSkeleton />;
  }

  const { headcount, composition, movement, attrition, regularization, relations, staffing, moments, filters: options } = dashboard;
  const unfiltered = queryKey === '{}';
  // The staffing plan is branch × position only.
  const unappliedFilters = [
    filters.department_id && 'department',
    filters.employment_type && 'employment type',
    JSON.parse(queryKey).date_field && 'date',
  ].filter(Boolean);
  const lastMonth = movement.months[movement.months.length - 1];
  const staleActive = unfiltered ? headcount.active - lastMonth.headcount_end : 0;

  const note = (text) => <Text type='secondary' style={{ fontSize: 12 }}>{text}</Text>;
  const extras = {
    'overview-cards': note('Company-wide'),
    demographics: note('Active employees'),
    regularization: note(`Regularized ${regularization.regularization_days} days after Direct Hire Since`),
    quality: note(`Last 12 months · regularized ÷ hired ${dashboard.quality_of_hires.lag_months} months earlier`),
    staffing: note('Required plantilla vs. active employees'),
    moments: note(`Next ${moments.days} days`),
    movement: note('Last 12 months'),
    attrition: note('Last 12 months · by latest offboarding reason'),
    'exit-interviews': note('Last 12 months · interviews ÷ employees who left'),
    relations: note('Last 12 months · by date issued'),
  };
  const tabs = TABS.map((t) => ({
    ...t,
    badge: t.key === 'headcount' ? headcount.active : undefined,
    sections: t.sections.map((sec) => ({ ...sec, extra: extras[sec.id] })),
  }));

  // Each section, by id — grouped into tabs by TABS.
  const renderSection = (id) => {
    switch (id) {
      case 'overview-cards': return <WorkforceOverviewCards refreshKey={refreshKey} />;
      case 'moments': return <PeopleMoments moments={moments} />;
      case 'composition': return (
        <>
          <HeadcountSummary headcount={headcount} />
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}><WorkforceMix composition={composition} /></Col>
            <Col xs={24}><HeadcountBreakdown composition={composition} /></Col>
            <Col xs={24}><AgeAndTenure composition={composition} /></Col>
          </Row>
        </>
      );
      case 'demographics': return <WorkforceDemographics demographics={dashboard.demographics} />;
      case 'regularization': return <RegularizationStatus regularization={regularization} />;
      case 'quality': return <QualityOfHires quality={dashboard.quality_of_hires} months={qualityMonths} />;
      case 'staffing': return <StaffingVsPlan staffing={staffing} unappliedFilters={unappliedFilters} />;
      case 'movement': return (
        <>
          <MovementSummary totals={movement.totals} />
          <div style={{ marginTop: 16 }}><MovementCharts months={months} /></div>
          <DataNotes staleActive={staleActive} />
        </>
      );
      case 'attrition': return (
        <>
          <AttritionSummary attrition={attrition} />
          <div style={{ marginTop: 16 }}><AttritionCharts attrition={attrition} /></div>
          <div style={{ marginTop: 16 }}><TurnoverTable turnoverBy={attrition.turnover_by} /></div>
        </>
      );
      case 'exit-interviews': return <ExitInterviews data={attrition.exit_interviews} months={exitMonths} />;
      case 'relations': return <EmployeeRelations relations={relations} months={relationMonths} />;
      default: return null;
    }
  };

  // The filters in effect, as removable tags in the sticky bar.
  const query = JSON.parse(queryKey);
  const nameOf = (list, id) => (list || []).find((x) => x.id === id)?.name;
  const chips = [
    filters.branch_id && { key: 'branch_id', label: 'Branch', value: nameOf(options.branches, filters.branch_id) },
    filters.department_id && { key: 'department_id', label: 'Department', value: nameOf(options.departments, filters.department_id) },
    filters.position_id && { key: 'position_id', label: 'Position', value: nameOf(options.positions, filters.position_id) },
    filters.employment_type && { key: 'employment_type', label: 'Employment Type', value: filters.employment_type },
    query.date_field && {
      key: 'date_range',
      label: DATE_FIELD_OPTIONS.find((o) => o.value === query.date_field)?.label,
      value: `${dayjs(query.date_from).format('MMM D, YYYY')} – ${dayjs(query.date_to).format('MMM D, YYYY')}`,
    },
  ].filter(Boolean);
  const clearFilter = (key) => setFilters((f) => ({ ...f, [key]: key === 'date_range' ? null : undefined }));

  return (
    <div>
      {/* Same placement as the Recruitment Dashboard: status tag left, Refresh then Export right. */}
      <Row justify='space-between' align='middle' gutter={[8, 8]} style={{ marginBottom: 20 }}>
        <Col>
          <Tag color='success' icon={<CheckCircleOutlined />}>As of {dayjs(dashboard.as_of).format('MM/DD/YYYY')} · {headcount.active.toLocaleString()} active employees</Tag>
        </Col>
        <Col>
          <Space>
            <Button size='small' icon={<ReloadOutlined />} onClick={refresh} loading={loading}>Refresh</Button>
            <Button size='small' type='primary' icon={<FileExcelOutlined />} onClick={exportReport} disabled={loading}>Export Report</Button>
          </Space>
        </Col>
      </Row>

      <WorkforceFilters filters={filters} options={options} onChange={setFilters} />

      <Drawer

        keyboard={false}
        title='Filters'
        placement='right'
        size={screens.sm ? 400 : '100%'}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        extra={<Text type='secondary' style={{ fontSize: 12 }}>{chips.length ? `${chips.length} active` : 'None active'}</Text>}
        footer={(
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button icon={<ReloadOutlined />} onClick={() => setFilters(NO_FILTERS)}>Reset all</Button>
            <Button type='primary' onClick={() => setFiltersOpen(false)}>Done</Button>
          </div>
        )}
      >
        <WorkforceFilters vertical filters={filters} options={options} onChange={setFilters} />
        <Text type='secondary' style={{ fontSize: 12, display: 'block', marginTop: 16 }}>
          Filters apply to every section except the company-wide Workforce Overview cards. Staffing vs. Plan uses Branch and Position only.
        </Text>
      </Drawer>

      <div style={{ height: 16 }} />

      {/* Refetches dim the current numbers instead of flashing a skeleton. */}
      <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s' }}>
        {/* Tabs (?tab=), sticky bar, jump links — shared with the Recruitment Dashboard. */}
        <DashboardTabLayout
          tabs={tabs}
          renderSection={renderSection}
          SectionLabel={SectionLabel}
          nav={{
            chips,
            period: `As of ${dayjs(dashboard.as_of).format('MMM D, YYYY')}`,
            emptyText: 'Company-wide — all branches, departments, positions and employment types',
            onClearFilter: clearFilter,
            onShowFilters: () => setFiltersOpen(true),
            jumpMin: 2,
          }}
        />
      </div>
    </div>
  );
};

export default WorkforceDashboardPage;
