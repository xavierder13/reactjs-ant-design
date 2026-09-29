// src/pages/dashboard/DashboardPage.jsx
//
// Recruitment Dashboard — same sections, order and numbers as vueportal's
// resources/js/views/dashboard/Dashboard.vue. All metrics come from
// recruitment/recruitmentMetrics.js (a line-for-line port of Dashboard.vue's
// computed block, parity-checked against vueportal's own code); each section
// is a component under recruitment/components/, one per vueportal component.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Card, Divider, Typography, Button, Tag, Space, App } from 'antd';
import { CheckCircleOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import axiosInstance from '../../api/axiosInstance';
import manpowerRequestApi from '../../services/manpower_request/manpowerRequestApi';
import { downloadRecruitmentReport } from '../../utils/recruitmentReport';
import {
  loadApplicantRows, computeRecruitmentMetrics, defaultDateRange, emptyFilters,
} from './recruitment/recruitmentMetrics';
import { PRIMARY_GREEN } from './recruitment/chartSetup';
import SectionLabel from './recruitment/components/SectionLabel';
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

const { Text, Title } = Typography;

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

      <SectionLabel>Key Performance Indicators</SectionLabel>
      <KpiCards kpiCards={metrics.kpiCards} />

      <SectionLabel>Applicant Pipeline</SectionLabel>
      <PipelineStageCards recruitmentStageCards={metrics.recruitmentStageCards} onNavigate={navigate} />

      <SectionLabel>Recruitment Funnel</SectionLabel>
      <RecruitmentFunnel
        recruitmentStageAnalysisRows={metrics.recruitmentStageAnalysisRows}
        recruitmentFunnelRows={metrics.recruitmentFunnelRows}
        avgDaysPerStage={metrics.avgDaysPerStage}
      />

      <SectionLabel>Sourcing Metrics</SectionLabel>
      <SourcingMetrics
        dateFilteredApplicants={metrics.dateFilteredApplicants}
        hiredApplicants={metrics.hiredApplicants}
        sourcingChannelEfficiency={metrics.sourcingChannelEfficiency}
      />

      <SectionLabel>Applicant Distribution</SectionLabel>
      <ApplicantDistribution dateFilteredApplicants={metrics.dateFilteredApplicants} hiredApplicants={metrics.hiredApplicants} />

      <GenderAndStageOutcome
        genderBreakdownStats={metrics.genderBreakdownStats}
        stageOutcomeData={metrics.stageOutcomeData}
        totalApplicants={metrics.dateFilteredApplicants.length}
      />

      <SectionLabel>Compliance &amp; Onboarding Metrics</SectionLabel>
      <ComplianceMetrics nonCompliantByMonth={metrics.nonCompliantByMonth} />

      <SectionLabel>Reserved Applicant Aging</SectionLabel>
      <ReservedApplicantAging reservedAgingRows={metrics.reservedAgingRows} reservedAgingBuckets={metrics.reservedAgingBuckets} />

      <SectionLabel>Applicant Demographics</SectionLabel>
      <ApplicantDemographics educAttainStats={metrics.educAttainStats} civilStatusStats={metrics.civilStatusStats} />

      <SectionLabel>Hiring Officer Performance</SectionLabel>
      <HiringOfficerPerformance hiringOfficerStats={metrics.hiringOfficerStats} />

      <SectionLabel>Placement Match Analysis</SectionLabel>
      <PlacementMatchAnalysis placementMatchStats={metrics.placementMatchStats} iqPassRateByPosition={metrics.iqPassRateByPosition} />

      <SectionLabel>Qualified Candidates Per Vacancy</SectionLabel>
      <QualifiedCandidatesPerVacancy rows={metrics.qualifiedCandidatesPerVacancy} />

      <SectionLabel>Deep Analysis</SectionLabel>
      <DeepAnalysis
        topPositionEntries={metrics.topPositionEntries}
        branchBreakdownEntries={metrics.branchBreakdownEntries}
        heatmapSourceLabels={metrics.heatmapSourceLabels}
        heatmapStageLabels={metrics.heatmapStageLabels}
        heatmapDataGrid={metrics.heatmapDataGrid}
        heatmapMaxValue={metrics.heatmapMaxValue}
      />

      <SectionLabel>Manpower Request — Time to Fill</SectionLabel>
      <TimeToFill mrfList={mrfList} />

      <SectionLabel>Recruitment Insights</SectionLabel>
      <RecruitmentInsights recruitmentInsights={metrics.recruitmentInsights} />
    </div>
  );
};

export default DashboardPage;
