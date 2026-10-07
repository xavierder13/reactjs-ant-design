// src/pages/dashboard/DashboardPage.jsx
//
// Recruitment Dashboard — same sections and numbers as vueportal's
// resources/js/views/dashboard/Dashboard.vue (plus this app's Manpower
// Request KPIs), grouped into tabs (TABS) under a sticky bar. All metrics come from
// recruitment/recruitmentMetrics.js (a line-for-line port of Dashboard.vue's
// computed block, parity-checked against vueportal's own code); each section
// is a component under recruitment/components/, one per vueportal component.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Card, Divider, Typography, Button, Tag, Space, App } from 'antd';
import { CheckCircleOutlined, ReloadOutlined, FileExcelOutlined, DashboardOutlined, FunnelPlotOutlined, TeamOutlined, SolutionOutlined, FileDoneOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';
import manpowerRequestApi from '../../services/manpower_request/manpowerRequestApi';
import { downloadRecruitmentReport } from '../../utils/recruitmentReport';
import {
  loadApplicantRows, computeRecruitmentMetrics, defaultDateRange, emptyFilters,
} from './recruitment/recruitmentMetrics';
import { PRIMARY_GREEN } from './recruitment/chartSetup';
import DashboardSkeleton from './recruitment/components/DashboardSkeleton';
import DashboardFilters from './recruitment/components/DashboardFilters';
import KpiCards from './recruitment/components/KpiCards';
import PipelineStageCards from './recruitment/components/PipelineStageCards';
import RecruitmentFunnel from './recruitment/components/RecruitmentFunnel';
import SourcingMetrics from './recruitment/components/SourcingMetrics';
import ApplicantDistribution from './recruitment/components/ApplicantDistribution';
import GenderAndStageOutcome from './recruitment/components/GenderAndStageOutcome';
import ComplianceMetrics from './recruitment/components/ComplianceMetrics';
import ReservedApplicantAging from './recruitment/components/ReservedApplicantAging';
import ApplicantDemographics from './recruitment/components/ApplicantDemographics';
import HiringOfficerPerformance from './recruitment/components/HiringOfficerPerformance';
import PlacementMatchAnalysis from './recruitment/components/PlacementMatchAnalysis';
import QualifiedCandidatesPerVacancy from './recruitment/components/QualifiedCandidatesPerVacancy';
import DeepAnalysis from './recruitment/components/DeepAnalysis';
import RecruitmentInsights from './recruitment/components/RecruitmentInsights';
import TimeToFill from './recruitment/components/TimeToFill';
import HiringEfficiency from './recruitment/components/HiringEfficiency';
import VacancyAging from './recruitment/components/VacancyAging';
import RecruitmentScorecard from './recruitment/components/RecruitmentScorecard';
import DashboardFilterDrawer from './recruitment/components/DashboardFilterDrawer';
import DashboardTabLayout from './components/DashboardTabLayout';
import { computeVacancyAging } from './recruitment/vacancyAging';

const { Text, Title } = Typography;

const FILTER_LABELS = { branch: 'Branch', position: 'Position', source: 'Source', stage: 'Stage', gender: 'Gender' };

// Tabs, each a list of sections (rendered by renderSection). Export Report
// still covers every section.
const TABS = [
  { key: 'overview', label: 'Overview', icon: <DashboardOutlined />, description: 'The headline numbers for the period and what needs attention.', sections: [
    { id: 'kpis', title: 'Key Performance Indicators' },
    { id: 'scorecard', title: 'Recruitment KPI Scorecard' },
    { id: 'insights', title: 'Recruitment Insights' },
  ] },
  { key: 'pipeline', label: 'Pipeline', icon: <FunnelPlotOutlined />, description: 'Where applicants are in the hiring process, and where they drop off or wait.', sections: [
    { id: 'pipeline', title: 'Applicant Pipeline' },
    { id: 'funnel', title: 'Recruitment Funnel' },
    { id: 'compliance', title: 'Compliance & Onboarding Metrics' },
    { id: 'reserved', title: 'Reserved Applicant Aging' },
    { id: 'qualified', title: 'Qualified Candidates Per Vacancy' },
  ] },
  { key: 'sourcing', label: 'Sourcing & Applicants', icon: <TeamOutlined />, description: 'Where applicants come from and who they are.', sections: [
    { id: 'sourcing', title: 'Sourcing Metrics' },
    { id: 'distribution', title: 'Applicant Distribution' },
    { id: 'demographics', title: 'Applicant Demographics' },
    { id: 'deep', title: 'Deep Analysis' },
  ] },
  { key: 'team', label: 'Hiring Team', icon: <SolutionOutlined />, description: 'How hiring officers perform and how well placements match preferences.', sections: [
    { id: 'officers', title: 'Hiring Officer Performance' },
    { id: 'placement', title: 'Placement Match Analysis' },
  ] },
  { key: 'manpower', label: 'Manpower Requests', icon: <FileDoneOutlined />, description: 'How fast approved MRF positions get filled, against RF 25 / SUP 45 / MGR 60 days.', sections: [
    { id: 'time-to-fill', title: 'Time to Fill' },
    { id: 'hiring-efficiency', title: 'Hiring Efficiency' },
    { id: 'vacancy-aging', title: 'Aging of Vacancies' },
  ] },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
  const [allApplicantRows, setAllApplicantRows] = useState([]);
  const [positions, setPositions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [mrfList, setMrfList] = useState([]);
  const [applicantFilters, setApplicantFilters] = useState(emptyFilters);
  const [analyticsDateRange, setAnalyticsDateRange] = useState(defaultDateRange);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchApplicants = useCallback(async () => {
    setIsLoadingApplicants(true);
    try {
      // vueportal's RecruitmentController proxies recruitment_gateway/applicant_list:
      // { job_applicants, branches, positions, branch_companies }
      const { data = {} } = await axiosInstance.get('/recruitment/applicant_list');
      setPositions(data.positions || []);
      setBranches(data.branches || []);
      setAllApplicantRows(loadApplicantRows(data.job_applicants));
    } catch (error) {
      console.error('[DashboardPage] fetch error:', error);
      if (error?.response?.status === 401) navigate('/login');
    } finally {
      setIsLoadingApplicants(false);
    }
  }, [navigate]);

  // MRF list for Time to Fill only. No /login redirect on failure: a 401 here
  // usually means "no manpower-request permission" (Maintenance middleware
  // aborts 401 for that too), and the rest of the page should still render.
  const fetchMrfList = useCallback(async () => {
    try {
      const response = await manpowerRequestApi.getAll();
      setMrfList(response.data?.manpower_requests || []);
    } catch (error) {
      console.error('[DashboardPage] MRF fetch error:', error);
      setMrfList([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => { await fetchApplicants(); };
    load();
  }, [fetchApplicants]);

  useEffect(() => {
    const load = async () => { await fetchMrfList(); };
    load();
  }, [fetchMrfList]);

  const metrics = useMemo(() => computeRecruitmentMetrics({
    allApplicantRows, filters: applicantFilters, dateRange: analyticsDateRange, positions, branches,
  }), [allApplicantRows, applicantFilters, analyticsDateRange, positions, branches]);

  // Live counts on two tabs: applicants in the period, open vacancies.
  const aging = useMemo(() => computeVacancyAging(mrfList, analyticsDateRange, applicantFilters), [mrfList, analyticsDateRange, applicantFilters]);
  const tabs = TABS.map((t) => {
    if (t.key === 'pipeline') return { ...t, badge: metrics.dateFilteredApplicants.length };
    if (t.key === 'manpower') return { ...t, badge: aging.count };
    return t;
  });

  const resetAllFilters = () => { setApplicantFilters(emptyFilters()); setAnalyticsDateRange(defaultDateRange()); };

  const exportReport = () => {
    try {
      downloadRecruitmentReport(metrics, analyticsDateRange);
    } catch (error) {
      console.error('[DashboardPage] export error:', error);
      message.error(error.message || 'Failed to export the report.');
    }
  };

  if (isLoadingApplicants) return <DashboardSkeleton />;

  if (!allApplicantRows.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Card style={{ maxWidth: 420, borderRadius: 16, borderTop: `4px solid ${PRIMARY_GREEN}`, textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <Title level={4} style={{ marginBottom: 4 }}>Recruitment Dashboard</Title>
          <Text type='secondary' style={{ fontSize: 12 }}>Human Resource Division · Recruitment &amp; Hiring Department</Text>
          <Divider />
          <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>No applicant data found or failed to load.</Text>
          <Button type='primary' icon={<ReloadOutlined />} onClick={fetchApplicants}>Retry</Button>
        </Card>
      </div>
    );
  }

  const clearFilter = (key) => setApplicantFilters((f) => ({ ...f, [key]: '' }));
  const showFilters = () => setFiltersOpen(true);

  // Each section, by id — grouped into tabs by TABS.
  const renderSection = (id, { changeTab }) => {
    switch (id) {
      case 'kpis': return <KpiCards kpiCards={metrics.kpiCards} />;
      case 'scorecard': return <RecruitmentScorecard mrfList={mrfList} dateRange={analyticsDateRange} filters={applicantFilters} onOpen={(sectionId) => changeTab('manpower', sectionId)} />;
      case 'insights': return <RecruitmentInsights recruitmentInsights={metrics.recruitmentInsights} />;
      case 'pipeline': return <PipelineStageCards recruitmentStageCards={metrics.recruitmentStageCards} onNavigate={navigate} />;
      case 'funnel': return (
        <RecruitmentFunnel
          recruitmentStageAnalysisRows={metrics.recruitmentStageAnalysisRows}
          recruitmentFunnelRows={metrics.recruitmentFunnelRows}
          avgDaysPerStage={metrics.avgDaysPerStage}
        />
      );
      case 'compliance': return <ComplianceMetrics nonCompliantByMonth={metrics.nonCompliantByMonth} />;
      case 'reserved': return <ReservedApplicantAging reservedAgingRows={metrics.reservedAgingRows} reservedAgingBuckets={metrics.reservedAgingBuckets} />;
      case 'qualified': return <QualifiedCandidatesPerVacancy rows={metrics.qualifiedCandidatesPerVacancy} />;
      case 'sourcing': return (
        <SourcingMetrics
          dateFilteredApplicants={metrics.dateFilteredApplicants}
          hiredApplicants={metrics.hiredApplicants}
          sourcingChannelEfficiency={metrics.sourcingChannelEfficiency}
        />
      );
      case 'distribution': return (
        <>
          <ApplicantDistribution dateFilteredApplicants={metrics.dateFilteredApplicants} hiredApplicants={metrics.hiredApplicants} />
          <GenderAndStageOutcome
            genderBreakdownStats={metrics.genderBreakdownStats}
            stageOutcomeData={metrics.stageOutcomeData}
            totalApplicants={metrics.dateFilteredApplicants.length}
          />
        </>
      );
      case 'demographics': return <ApplicantDemographics educAttainStats={metrics.educAttainStats} civilStatusStats={metrics.civilStatusStats} />;
      case 'deep': return (
        <DeepAnalysis
          topPositionEntries={metrics.topPositionEntries}
          branchBreakdownEntries={metrics.branchBreakdownEntries}
          heatmapSourceLabels={metrics.heatmapSourceLabels}
          heatmapStageLabels={metrics.heatmapStageLabels}
          heatmapDataGrid={metrics.heatmapDataGrid}
          heatmapMaxValue={metrics.heatmapMaxValue}
        />
      );
      case 'officers': return <HiringOfficerPerformance hiringOfficerStats={metrics.hiringOfficerStats} />;
      case 'placement': return <PlacementMatchAnalysis placementMatchStats={metrics.placementMatchStats} iqPassRateByPosition={metrics.iqPassRateByPosition} />;
      case 'time-to-fill': return <TimeToFill mrfList={mrfList} dateRange={analyticsDateRange} filters={applicantFilters} />;
      case 'hiring-efficiency': return <HiringEfficiency mrfList={mrfList} dateRange={analyticsDateRange} filters={applicantFilters} />;
      case 'vacancy-aging': return <VacancyAging mrfList={mrfList} dateRange={analyticsDateRange} filters={applicantFilters} />;
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      <Row justify='space-between' align='middle' style={{ marginBottom: 20 }}>
        <Tag color='success' icon={<CheckCircleOutlined />}>{metrics.dateFilteredApplicants.length} records loaded</Tag>
        <Space>
          <Button size='small' icon={<ReloadOutlined />} onClick={fetchApplicants}>Refresh</Button>
          <Button size='small' type='primary' icon={<FileExcelOutlined />} onClick={exportReport}>Export Report</Button>
        </Space>
      </Row>

      <DashboardFilters
        filters={applicantFilters}
        filterOptions={metrics.allFilterOptions}
        dateRange={analyticsDateRange}
        onFiltersChange={setApplicantFilters}
        onDateRangeChange={setAnalyticsDateRange}
        onReset={resetAllFilters}
        onResetDate={() => setAnalyticsDateRange(defaultDateRange())}
      />

      <DashboardFilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={applicantFilters}
        filterOptions={metrics.allFilterOptions}
        dateRange={analyticsDateRange}
        onFiltersChange={setApplicantFilters}
        onDateRangeChange={setAnalyticsDateRange}
        onReset={resetAllFilters}
        onResetDate={() => setAnalyticsDateRange(defaultDateRange())}
      />

      {/* Tabs (?tab=), sticky bar, jump links — shared with the Workforce Dashboard. */}
      <DashboardTabLayout
        tabs={tabs}
        renderSection={renderSection}
        nav={{
          chips: Object.entries(FILTER_LABELS).filter(([key]) => applicantFilters[key])
            .map(([key, label]) => ({ key, label, value: applicantFilters[key] })),
          period: `${analyticsDateRange.from ? dayjs(analyticsDateRange.from).format('MMM D, YYYY') : 'All time'} – ${analyticsDateRange.to ? dayjs(analyticsDateRange.to).format('MMM D, YYYY') : 'Today'}`,
          emptyText: 'All branches, positions, sources, stages and genders',
          onClearFilter: clearFilter,
          onShowFilters: showFilters,
        }}
      />
    </div>
  );
};

export default DashboardPage;
