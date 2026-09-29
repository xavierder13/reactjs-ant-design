import { useCallback, useEffect, useMemo, useState } from 'react';
import { Row, Col, Button, Space, Alert, Typography, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import workforceDashboardApi from '../../../services/dashboard/workforceDashboardApi';
import handleApiError from '../../../utils/handleApiError';
import SectionLabel from './components/SectionLabel';
import WorkforceSkeleton from './components/WorkforceSkeleton';
import WorkforceOverviewCards from './components/WorkforceOverviewCards';
import WorkforceFilters from './components/WorkforceFilters';
import HeadcountSummary from './components/HeadcountSummary';
import WorkforceMix from './components/WorkforceMix';
import HeadcountBreakdown from './components/HeadcountBreakdown';
import AgeAndTenure from './components/AgeAndTenure';
import MovementSummary from './components/MovementSummary';
import MovementCharts from './components/MovementCharts';
import DataNotes from './components/DataNotes';

const { Text } = Typography;
const NO_FILTERS = { branch_id: undefined, department_id: undefined };

// Workforce Dashboard — HR analytics over Employee Master Data (Phase 1:
// overview cards, headcount & composition, hires vs. separations). Loads
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
    const load = async () => { await fetchSummary(filters); };
    load();
  }, [fetchSummary, filters, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // The current month is month-to-date — say so wherever it's shown.
  const months = useMemo(() => (dashboard?.movement.months || []).map((m, i, all) => (
    i === all.length - 1 ? { ...m, label: `${m.label} (to date)` } : m
  )), [dashboard]);

  if (!dashboard) {
    return loadFailed
      ? <Alert type='error' showIcon title="The Workforce Dashboard couldn't be loaded." action={<Button onClick={refresh}>Retry</Button>} />
      : <WorkforceSkeleton />;
  }

  const { headcount, composition, movement, filters: options } = dashboard;
  const unfiltered = !filters.branch_id && !filters.department_id;
  const lastMonth = movement.months[movement.months.length - 1];
  const staleActive = unfiltered ? headcount.active - lastMonth.headcount_end : 0;

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Text type='secondary'>As of {dayjs(dashboard.as_of).format('MM/DD/YYYY')}</Text>
        <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>Refresh</Button>
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

        <SectionLabel extra={<Text type='secondary' style={{ fontSize: 12 }}>Last 12 months</Text>}>Hires vs. Separations</SectionLabel>
        <MovementSummary totals={movement.totals} />
        <div style={{ marginTop: 16 }}><MovementCharts months={months} /></div>
        <DataNotes staleActive={staleActive} />
      </div>
    </div>
  );
};

export default WorkforceDashboardPage;
