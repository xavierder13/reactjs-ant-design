// KPI Dashboard "Export Report": one .xlsx built from what the page shows
// (same period and filters) — Summary, Rating Distribution, the ranking of
// every position, and the averages per branch / per position. Same SheetJS
// setup as workforceReport.js.

import * as XLSX from 'xlsx';
import { bandOf, rankPosition, averageBy } from '../pages/kpi/dashboard/kpiDashboard';

const autoWidth = (ws, data) => {
  const cols = Object.keys(data[0] || {});
  ws['!cols'] = cols.map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String(r[key] ?? '').length)) + 2,
  }));
};

const addSheet = (wb, sheetName, data) => {
  if (!data || !data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  autoWidth(ws, data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
};

const num = (v) => (v == null ? '' : Number(v.toFixed(2)));
const band = (v) => bandOf(v)?.label || '';

// summary: kpiDashboard.summarize() output; periodLabel / filterLabel: text.
export const buildKpiDashboardWorkbook = (summary, periodLabel, filterLabel) => {
  const wb = XLSX.utils.book_new();

  addSheet(wb, 'Summary', [
    { Metric: 'Period', Value: periodLabel },
    { Metric: 'Filters', Value: filterLabel },
    { Metric: 'Approved evaluations', Value: summary.evaluations },
    { Metric: 'Employees evaluated', Value: summary.employees },
    { Metric: 'Average final grade', Value: num(summary.average) },
    { Metric: 'Rating', Value: band(summary.average) },
    { Metric: 'Passing (75+)', Value: `${summary.passing} of ${summary.employees}` },
    { Metric: 'Top employee', Value: summary.top ? `${summary.top.employee_name} (${summary.top.position}) — ${num(summary.top.final)}` : '' },
    { Metric: 'Lowest', Value: summary.bottom ? `${summary.bottom.employee_name} (${summary.bottom.position}) — ${num(summary.bottom.final)}` : '' },
  ]);

  addSheet(wb, 'Rating Distribution', summary.distribution.map((b) => ({
    Rating: b.label, Range: b.min === -Infinity ? 'below 75' : `${b.min}+`, Employees: b.count,
  })));

  const positionIds = [...new Set(summary.scores.map((s) => s.position_id))];
  const ranking = positionIds.flatMap((id) => rankPosition(summary.scores, id))
    .sort((a, b) => a.position.localeCompare(b.position) || a.rank - b.rank);
  addSheet(wb, 'Ranking per Position', ranking.map((r) => ({
    Position: r.position, Rank: r.rank, 'Employee Code': r.employee_code, Employee: r.employee_name, Branch: r.branch,
    Evaluations: r.evaluations, Job: num(r.job), Behavior: num(r.behavior), Demerit: num(r.demerit), 'Final Grade': num(r.final), Rating: band(r.final),
  })));

  const group = (label) => (r) => ({
    [label]: r.label, Employees: r.employees, Evaluations: r.evaluations,
    'Average Final Grade': num(r.average), Highest: num(r.highest), Lowest: num(r.lowest), Rating: band(r.average),
  });
  addSheet(wb, 'By Branch', averageBy(summary.scores, 'branch').map(group('Branch')));
  addSheet(wb, 'By Position', averageBy(summary.scores, 'position').map(group('Position')));

  return wb;
};

export const downloadKpiDashboardReport = (summary, periodLabel, filterLabel, fileDate) => {
  const wb = buildKpiDashboardWorkbook(summary, periodLabel, filterLabel);
  XLSX.writeFile(wb, `KPI_Dashboard_${fileDate}.xlsx`);
};
