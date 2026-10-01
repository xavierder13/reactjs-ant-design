// Workforce Dashboard "Export Report": one .xlsx with a sheet per section,
// built from the /employee_dashboard/summary response already on the page
// (so it matches what's shown, filters included). Same SheetJS setup as
// recruitmentReport.js. People moments are left out — the export holds
// aggregates only.

import * as XLSX from 'xlsx';

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

const counts = (rows, labelHeader) => rows.map((r) => ({ [labelHeader]: r.label, Employees: r.count }));
const pct = (v) => (v == null ? '' : `${v}%`);

export const buildWorkforceReportWorkbook = (d, filterLabel) => {
  const wb = XLSX.utils.book_new();
  const h = d.headcount;

  addSheet(wb, 'Summary', [
    { Metric: 'As of', Value: d.as_of },
    { Metric: 'Filter', Value: filterLabel },
    { Metric: 'Active headcount', Value: h.active },
    { Metric: 'Regular', Value: h.regular },
    { Metric: 'Probationary', Value: `${h.probationary} (${h.probationary_pct}%)` },
    { Metric: 'Female / Male', Value: `${h.female} / ${h.male}` },
    { Metric: 'Average age', Value: h.avg_age ?? '' },
    { Metric: 'Average length of service (years)', Value: h.avg_tenure_years ?? '' },
    { Metric: 'Hires (12 months)', Value: d.movement.totals.hires },
    { Metric: 'Separations (12 months)', Value: d.movement.totals.separations },
    { Metric: 'Turnover rate (12 months)', Value: pct(d.movement.totals.turnover_rate) },
    { Metric: `Early attrition (< ${d.attrition.early.months} months)`, Value: `${d.attrition.early.count} (${d.attrition.early.pct}%)` },
    { Metric: 'Regularization overdue', Value: d.regularization.overdue },
    { Metric: `Regularization due within ${d.regularization.due_days} days`, Value: d.regularization.due_soon },
    { Metric: 'NTEs issued (12 months)', Value: d.relations.totals.ntes },
    { Metric: 'Disciplinary cases (12 months)', Value: d.relations.totals.disciplinary },
    { Metric: 'Required (plan)', Value: d.staffing.totals.required },
    { Metric: 'Short vs. plan', Value: d.staffing.totals.short },
    { Metric: 'Fill rate', Value: pct(d.staffing.totals.fill_rate) },
  ]);

  const c = d.composition;
  addSheet(wb, 'By Branch', counts(c.branch, 'Branch'));
  addSheet(wb, 'By Department', counts(c.department, 'Department'));
  addSheet(wb, 'By Rank', counts(c.rank, 'Rank'));
  addSheet(wb, 'By Employment Type', counts(c.employment_type, 'Employment Type'));
  addSheet(wb, 'By Gender', counts(c.gender, 'Gender'));
  addSheet(wb, 'By Age', counts(c.age, 'Age'));
  addSheet(wb, 'By Length of Service', counts(c.tenure, 'Length of Service'));

  addSheet(wb, 'Regularization', d.regularization.by_branch.map((r) => ({
    Branch: r.label, Overdue: r.overdue, 'Due soon': r.due_soon,
  })));

  addSheet(wb, 'Hires vs Separations', d.movement.months.map((m) => ({
    Month: m.label, Hires: m.hires, Separations: m.separations, Net: m.net,
    'Headcount (end)': m.headcount_end, Turnover: pct(m.turnover_rate),
  })));

  addSheet(wb, 'Separations by Type', d.attrition.by_type.map((t) => ({
    Type: t.label, Separations: t.count, Share: pct(t.pct), 'Left < 6 months': t.early,
  })));
  addSheet(wb, 'Separations by Reason', d.attrition.by_reason.map((r) => ({
    Reason: r.label, Type: r.type, Separations: r.count,
  })));
  const turnover = (rows, labelHeader) => rows.map((r) => ({
    [labelHeader]: r.label, Headcount: r.headcount, Separations: r.separations,
    Voluntary: r.voluntary, Involuntary: r.involuntary, Others: r.other, 'Left < 6 months': r.early, Turnover: pct(r.turnover_rate),
  }));
  addSheet(wb, 'Turnover by Branch', turnover(d.attrition.turnover_by.branch, 'Branch'));
  addSheet(wb, 'Turnover by Department', turnover(d.attrition.turnover_by.department, 'Department'));
  addSheet(wb, 'Turnover by Position', turnover(d.attrition.turnover_by.position, 'Position'));

  addSheet(wb, 'NTE & Disciplinary', d.relations.months.map((m) => ({
    Month: m.label, NTEs: m.ntes, Disciplinary: m.disciplinary,
  })));
  addSheet(wb, 'Relations by Branch', d.relations.by_branch.map((r) => ({
    Branch: r.label, Headcount: r.headcount, NTEs: r.ntes, 'NTEs per 100': r.ntes_per_100 ?? '', Disciplinary: r.disciplinary,
  })));
  addSheet(wb, 'Disciplinary by Offense', d.relations.by_offense.map((r) => ({ Offense: r.label, Cases: r.count })));
  addSheet(wb, 'Disciplinary by Action', d.relations.by_action.map((r) => ({ Action: r.label, Cases: r.count })));

  const staffing = (rows, labelHeader) => rows.map((r) => ({
    [labelHeader]: r.label, Required: r.required, Current: r.current, Short: r.short, Excess: r.excess, Filled: pct(r.fill_rate),
  }));
  addSheet(wb, 'Staffing by Branch', staffing(d.staffing.by_branch, 'Branch'));
  addSheet(wb, 'Staffing by Position', staffing(d.staffing.by_position, 'Position'));

  return wb;
};

export const downloadWorkforceReport = (dashboard, filterLabel) => {
  const wb = buildWorkforceReportWorkbook(dashboard, filterLabel);
  XLSX.writeFile(wb, `Workforce_Report_${dashboard.as_of}.xlsx`);
};
