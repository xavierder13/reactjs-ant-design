// src/utils/recruitmentReport.js
//
// Dashboard "Export Report": one .xlsx with a sheet per dashboard section.
// Same sheets, columns and filename as vueportal's
// resources/js/utils/ReportGenerator.js — keep the two in step.
// `xlsx` is SheetJS 0.20.3 installed from cdn.sheetjs.com (the npm registry
// copy stops at 0.18.5, which has known advisories).

import * as XLSX from 'xlsx';

const autoWidth = (ws, data) => {
  const cols = Object.keys(data[0] || {});
  ws['!cols'] = cols.map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String(r[key] ?? '').length)) + 2,
  }));
};

// Empty sections are skipped rather than written as blank sheets.
const addSheet = (wb, sheetName, data) => {
  if (!data || !data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  autoWidth(ws, data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
};

export const recruitmentReportFilename = (dateRange) =>
  `Recruitment_Report_${dateRange.from || 'start'}_to_${dateRange.to || 'today'}.xlsx`;

export const buildRecruitmentReportWorkbook = (data) => {
  const wb = XLSX.utils.book_new();

  addSheet(wb, 'Summary KPIs', data.kpiCards.map((k) => ({
    'Metric':   k.label,
    'Value':    k.value,
    'Sub-Info': k.sub,
  })));

  addSheet(wb, 'Applicant Pipeline', data.recruitmentStageCards.map((s) => ({
    'Stage':      s.stageName,
    'On Process': s.countStageItems,
    'Failed':     s.failedCount ?? 0,
    'Reserved':   s.reservedCount ?? 0,
  })));

  addSheet(wb, 'Recruitment Funnel', data.recruitmentFunnelRows.map((r) => ({
    'Stage': r.label,
    'Count': r.count,
  })));

  addSheet(wb, 'Sourcing Efficiency', data.sourcingChannelEfficiency.map((r) => ({
    'Source':      r.source,
    'Hired Count': r.hiredCount,
    'Percentage':  r.percentage + '%',
  })));

  addSheet(wb, 'Interview-to-Hire Ratio', data.qualifiedCandidatesPerVacancy.map((r) => ({
    'Position':            r.position,
    'Total Interviewed':   r.total,
    'Passed':              r.passed,
    'Failed':              r.failed,
    'Interviews Per Hire': r.interviewsPerHire,
    'Rejects Per Hire':    r.rejectsPerHire,
    'Pass Rate':           r.passRate + '%',
  })));

  addSheet(wb, 'Hiring Officer Performance', data.hiringOfficerStats.map((r) => ({
    'Rank':        r.rank,
    'Officer':     r.officerName,
    'Position':    r.officerPosition,
    'Hired Count': r.hiredCount,
    'Avg Days':    r.avgDays ?? 'N/A',
    'Hire Rate':   r.hireRate + '%',
  })));

  addSheet(wb, 'Reserved Aging', data.reservedAgingRows.map((r) => ({
    'Applicant':    r.applicantName,
    'Stage':        r.recruitmentStage,
    'Branch':       r.appliedBranch,
    'Position':     r.appliedPosition,
    'Date Applied': r.dateAppliedStr,
    'Days Waiting': r.daysWaiting,
  })));

  addSheet(wb, 'Education Demographics', data.educAttainStats.map((r) => ({
    'Education': r.educ,
    'Count':     r.count,
    'Hired':     r.hired,
    'Hire Rate': r.hireRate + '%',
  })));

  addSheet(wb, 'Civil Status Demographics', data.civilStatusStats.map((r) => ({
    'Civil Status': r.status,
    'Count':        r.count,
  })));

  addSheet(wb, 'Top Positions', data.topPositionEntries.map((r) => ({
    'Rank':     r.rank,
    'Position': r.positionName,
    'Applied':  r.appliedCount,
    'Hired':    r.hiredCount,
  })));

  addSheet(wb, 'Branch Breakdown', data.branchBreakdownEntries.map((r) => ({
    'Rank':    r.rank,
    'Branch':  r.branchName,
    'Applied': r.appliedCount,
    'Hired':   r.hiredCount,
  })));

  return wb;
};

// Triggers the browser download. Throws if every section is empty (a
// workbook with no sheets can't be written) — callers should show a message.
export const downloadRecruitmentReport = (data, dateRange) => {
  const wb = buildRecruitmentReportWorkbook(data);
  if (!wb.SheetNames.length) throw new Error('There is no dashboard data to export for the selected filters.');
  XLSX.writeFile(wb, recruitmentReportFilename(dateRange));
};
