// KPI Consolidated Report "Export to Excel": the same layout the page shows
// (kpiReportLayout.js) — a Report Info sheet, then either a Summary sheet
// (+ component / demerit average sheets when broken down) or one sheet per
// position (Detailed, with an Average row). Same SheetJS setup as
// workforceReport.js.

import * as XLSX from 'xlsx';
import { SECTIONS } from '../pages/kpi/reports/kpiReportLayout';

const autoWidth = (ws, data) => {
  const cols = Object.keys(data[0] || {});
  ws['!cols'] = cols.map((key) => ({
    wch: Math.min(60, Math.max(key.length, ...data.map((r) => String(r[key] ?? '').length)) + 2),
  }));
};

const addSheet = (wb, sheetName, data, usedNames) => {
  if (!data || !data.length) return;
  // Excel sheet names: ≤ 31 chars, no []:*?/\, unique
  let name = sheetName.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31).trim() || 'Sheet';
  for (let i = 2; usedNames.has(name); i += 1) name = `${name.slice(0, 27)} (${i})`;
  usedNames.add(name);

  const ws = XLSX.utils.json_to_sheet(data);
  autoWidth(ws, data);
  XLSX.utils.book_append_sheet(wb, ws, name);
};

// Numbers stay numbers in Excel (2 dp); text columns as-is.
const cell = (col, value) => {
  if (value === null || value === undefined) return '';
  return col.numeric ? Number(Number(value).toFixed(col.format === 'rating' ? 1 : 2)) : value;
};

const toSheetRows = (columns, rows) =>
  rows.map((r) => Object.fromEntries(columns.map((col) => [col.title, cell(col, col.value(r))])));

// groups: [{ branch, summary, detailed }] — one group (branch null) unless
// the report is grouped by branch.
export const downloadKpiConsolidatedReport = ({ info, mode, sections, groups, summaryCols }) => {
  const wb      = XLSX.utils.book_new();
  const used    = new Set();
  const byBranch = groups.some((g) => g.branch);
  const withBranch = (g, row) => (byBranch ? { Branch: g.branch, ...row } : row);

  addSheet(wb, 'Report Info', [
    { Item: 'Report', Value: 'KPI Consolidated Report — approved evaluations' },
    { Item: 'Period', Value: info.period },
    { Item: 'Positions', Value: info.positions },
    { Item: 'Branch', Value: info.branch },
    { Item: 'Grouped by branch', Value: byBranch ? 'Yes' : 'No' },
    { Item: 'Layout', Value: mode === 'summary' ? 'Summary' : 'Detailed' },
    ...SECTIONS.map((s) => ({ Item: s.label, Value: { hide: 'Hidden', total: 'Total', breakdown: 'Breakdown' }[sections[s.key]] })),
    { Item: 'Generated', Value: info.generatedAt },
  ], used);

  if (mode === 'summary') {
    addSheet(wb, 'Summary', groups.flatMap((g) =>
      toSheetRows(summaryCols, g.summary).map((row) => withBranch(g, row))), used);

    if (sections.job === 'breakdown') {
      addSheet(wb, 'Job Component Averages', groups.flatMap((g) => g.summary.flatMap((s) => s.componentAverages.map((c) => withBranch(g, {
        Position: s.position.name, Code: c.code, Component: c.name, 'Avg Grade': c.grade === null ? '' : Number(c.grade.toFixed(2)),
      })))), used);
    }
    if (sections.demerit === 'breakdown') {
      addSheet(wb, 'Demerit Averages', groups.flatMap((g) => g.summary.flatMap((s) => s.demeritAverages.map((d) => withBranch(g, {
        Position: s.position.name, Code: d.code, Demerit: d.name, 'Avg Deduction': d.deduction === null ? '' : Number(d.deduction.toFixed(2)),
      })))), used);
    }
  } else {
    // one sheet per (branch,) position
    groups.forEach((g) => g.detailed.forEach((group) => {
      const averageRow = Object.fromEntries(group.columns.map((col, i) => [
        col.title,
        i === 0 ? 'AVERAGE' : (col.numeric ? cell(col, group.average[col.key]) : ''),
      ]));
      const name = byBranch ? `${g.branch} - ${group.position.name}` : group.position.name;
      addSheet(wb, name, [...toSheetRows(group.columns, group.rows), averageRow], used);
    }));
  }

  XLSX.writeFile(wb, `KPI_Consolidated_Report_${info.fileDate}.xlsx`);
};

