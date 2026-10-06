import { useCallback, useEffect, useMemo, useState } from 'react';
import { Row, Col, Button, Space, Alert, Typography, App } from 'antd';
import { ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import workforceDashboardApi from '../../../services/dashboard/workforceDashboardApi';
import handleApiError from '../../../utils/handleApiError';
import { downloadWorkforceReport } from '../../../utils/workforceReport';
import SectionLabel from './components/SectionLabel';
import WorkforceSkeleton from './components/WorkforceSkeleton';
import WorkforceOverviewCards from './components/WorkforceOverviewCards';
import WorkforceFilters from './components/WorkforceFilters';
import { NO_FILTERS, toQuery, DATE_FIELD_OPTIONS } from './components/workforceFilterQuery';
import HeadcountSummary from './components/HeadcountSummary';
import WorkforceMix from './components/WorkforceMix';
import HeadcountBreakdown from './components/HeadcountBreakdown';
import AgeAndTenure from './components/AgeAndTenure';
import MovementSummary from './components/MovementSummary';
import MovementCharts from './components/MovementCharts';
import DataNotes from './components/DataNotes';
import AttritionSummary from './components/AttritionSummary';
import AttritionCharts from './components/AttritionCharts';
import TurnoverTable from './components/TurnoverTable';
import RegularizationStatus from './components/RegularizationStatus';
import EmployeeRelations from './components/EmployeeRelations';
import StaffingVsPlan from './components/StaffingVsPlan';
import PeopleMoments from './components/PeopleMoments';

const { Text } = Typography;

// Workforce Dashboard — HR analytics over Employee Master Data. Current
// state first (overview cards, headcount & composition, regularization,
// staffing vs. plan, people moments), then the last 12 months (hires vs.
// separations, attrition, employee relations). Export Report writes every
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

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Text type='secondary'>As of {dayjs(dashboard.as_of).format('MM/DD/YYYY')}</Text>
        <Space>
          <Button type='primary' icon={<FileExcelOutlined />} onClick={exportReport} disabled={loading}>Export Report</Button>
          <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>Refresh</Button>
        </Space>
      </Space>

      <SectionLabel extra={<Text type='secondary' style={{ fontSize: 12 }}>Company-wide</Text>}>Workforce Overview</SectionLabel>
      <WorkforceOverviewCards refreshKey={refreshKey} />

      <WorkforceFilters filters={filters} options={options} onChange={setFilters} />

      {/* Refetches dim the current numbers instead of flashing a skeleton. */}
      <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s' }}>
        <SectionLabel>Headcount &amp; Composition</SectionLabel>
        <HeadcountSummary headcount={headcount} />
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}><WorkforceMix composition={composition} /></Col>
          <Col xs={24}><HeadcountBreakdown composition={composition} /></Col>
          <Col xs={24}><AgeAndTenure composition={composition} /></Col>
        </Row>

        <SectionLabel extra={<Text type='secondary' style={{ fontSize: 12 }}>{regularization.probation_months}-month probation</Text>}>Regularization</SectionLabel>
        <RegularizationStatus regularization={regularization} />

        <SectionLabel extra={<Text type='secondary' style={{ fontSize: 12 }}>Required plantilla vs. active employees</Text>}>Staffing vs. Plan</SectionLabel>
        <StaffingVsPlan staffing={staffing} unappliedFilters={unappliedFilters} />

        <SectionLabel extra={<Text type='secondary' style={{ fontSize: 12 }}>Next {moments.days} days</Text>}>People Moments</SectionLabel>
        <PeopleMoments moments={moments} />

        <SectionLabel extra={<Text type='secondary' style={{ fontSize: 12 }}>Last 12 months</Text>}>Hires vs. Separations</SectionLabel>
        <MovementSummary totals={movement.totals} />
        <div style={{ marginTop: 16 }}><MovementCharts months={months} /></div>
        <DataNotes staleActive={staleActive} />

        <SectionLabel extra={<Text type='secondary' style={{ fontSize: 12 }}>Last 12 months · by latest offboarding reason</Text>}>Attrition</SectionLabel>
        <AttritionSummary attrition={attrition} />
        <div style={{ marginTop: 16 }}><AttritionCharts attrition={attrition} /></div>
        <div style={{ marginTop: 16 }}><TurnoverTable turnoverBy={attrition.turnover_by} /></div>

        <SectionLabel extra={<Text type='secondary' style={{ fontSize: 12 }}>Last 12 months · by date issued</Text>}>Employee Relations</SectionLabel>
        <EmployeeRelations relations={relations} months={relationMonths} />
      </div>
    </div>
  );
};

export default WorkforceDashboardPage;
