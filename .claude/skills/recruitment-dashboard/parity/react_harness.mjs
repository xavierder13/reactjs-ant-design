import fs from 'fs';
import { loadApplicantRows, computeRecruitmentMetrics, monthlyApplicationTrend, ageGroupDistribution, countBySource, funnelChartRows }
  from '/app/src/pages/dashboard/recruitment/recruitmentMetrics.js';
const fixture = JSON.parse(fs.readFileSync('fixture.json', 'utf8'));
const vue = JSON.parse(fs.readFileSync('vue_out.json', 'utf8'));
const scenarios = JSON.parse(fs.readFileSync('scenarios.json', 'utf8'));
const out = scenarios.map((sc, i) => {
  const rows = loadApplicantRows(fixture.job_applicants);
  const dateRange = vue[i].dateRange;   // identical inputs, incl. the default range Vue computed
  const m = computeRecruitmentMetrics({ allApplicantRows: rows, filters: sc.filters, dateRange, positions: fixture.positions, branches: fixture.branches });
  const trend = monthlyApplicationTrend(m.dateFilteredApplicants);
  const age = ageGroupDistribution(m.dateFilteredApplicants, m.hiredApplicants);
  const srcApp = countBySource(m.dateFilteredApplicants);
  const srcHire = countBySource(m.hiredApplicants);
  const charts = {
    'ApplicantDistribution.renderMonthlyTrendChart': [{ labels: trend.labels, datasets: [{ data: trend.applications }, { data: trend.hired }] }],
    'ApplicantDistribution.renderAgeGroupChart': [{ labels: age.labels, datasets: [{ data: age.applied }, { data: age.hired }] }],
    'SourcingMetrics.renderSrcAppChart': [{ labels: srcApp.labels, datasets: [{ data: srcApp.data }] }],
    'SourcingMetrics.renderSrcHireChart': [{ labels: srcHire.labels, datasets: [{ data: srcHire.data }] }],
    'SourcingMetrics.renderSrcEfficiencyChart': [{ labels: m.sourcingChannelEfficiency.map((e) => e.source), datasets: [{ data: m.sourcingChannelEfficiency.map((e) => e.hiredCount) }] }],
    'RecruitmentFunnel.embudoRows': funnelChartRows(m.recruitmentFunnelRows),
  };
  return { name: sc.name, result: m, charts };
});
fs.writeFileSync('react_out.json', JSON.stringify(out));
console.log('react harness ok:', out.map((o) => `${o.name}: ${o.result.dateFilteredApplicants.length}`).join(' | '));
