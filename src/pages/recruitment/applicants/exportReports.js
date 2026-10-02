// ATS Excel reports — recruitment-portal DialogExport.vue. The portal
// returns the data; the sheet is built here with the installed `xlsx`.
import * as XLSX from 'xlsx';

export const FRONT_PAGE = 'Front Page Report';
export const DETAILED = 'Detailed Report';
export const ALL_BRANCHES_ID = 1000; // the portal's "ALL BRANCH"

export const FRONT_PAGE_TYPES = [
  { value: 'Sourcing/Screening', report: 'sourcing' },
  { value: 'Recruitment', report: 'recruitment' },
  { value: 'Hiring', report: 'hiring' },
  { value: 'Signing of Contract', report: 'signing_contract' },
  { value: 'Overall Count', report: 'total_count' },
];

// Detailed types: the list permission each needs, and how many of
// DATE_FIELD_PARAMS it may filter on (portal dateFieldParameters).
export const DETAILED_TYPES = [
  { value: 'ALL', permission: null, dates: 8, stageKey: 'applicant-list' },
  { value: 'Screening', permission: 'careers-screening-list', dates: 1, stageKey: 'screening-list' },
  { value: 'Initial Interview', permission: 'careers-initial-interview-list', dates: 3, stageKey: 'initial-interview-list' },
  { value: 'Exam', permission: 'careers-iq-test-list', dates: 4, stageKey: 'iq-test-list' },
  { value: 'B.I & Basic Req', permission: 'careers-bi-list', dates: 5, stageKey: 'bi-list' },
  { value: 'Final Interview', permission: 'careers-final-interview-list', dates: 6, stageKey: 'final-interview-list' },
  { value: 'Orientation', permission: 'careers-orientation-list', dates: 7, stageKey: 'orientation-list' },
  { value: 'Hired', permission: 'careers-hired-list', dates: 8, stageKey: 'hired-list' },
];

export const DATE_FIELD_PARAMS = [
  { value: 'created_at', label: 'Date Applied' },
  { value: 'screening_date', label: 'Screening Date' },
  { value: 'initial_interview_date', label: 'Initial Interview Date' },
  { value: 'iq_date', label: 'Exam Date' },
  { value: 'bi_date', label: 'B.I. Date' },
  { value: 'final_interview_date', label: 'Final Interview Date' },
  { value: 'orientation_date', label: 'Orientation Date' },
  { value: 'signing_of_contract_date', label: 'Signing of Contract Date' },
];

// Detailed report columns, in the portal's order (its json_fields).
const DETAILED_COLUMNS = [
  ['Progress Status', 'progress_status'], ['Last Name', 'lastname'], ['First Name', 'firstname'],
  ['Middle Name', 'middlename'], ['Position Applied', 'position_name'], ['Branch Applied', 'branch_name'],
  ['Gender', 'gender'], ['Contact', 'contact_no'], ['Date Applied', 'date_applied'], ['Source', 'how_learn'],
  ['Screening', 'screening_status'], ['Screening Date', 'screening_date'], ['Interview Schedule', 'initial_interview_date'],
  ['Initial Interview', 'initial_interview_status'], ['Position Preference', 'position_preference'],
  ['Branch Preference', 'branch_preference'], ['Branch Complied', 'branch_complied'], ['Exam', 'iq_status'],
  ['Exam Date', 'iq_date'], ['B.I & Basic Req', 'bi_status'], ['B.I & Basic Req Date', 'bi_date'],
  ['Final Interview Date', 'final_interview_date'], ['Final Interview Status', 'final_interview_status'],
  ['Employment Position', 'employment_position'], ['Employment Branch', 'employment_branch'],
  ['Requirements', 'requirements'], ['Hiring Officer Position', 'hiring_officer_position'],
  ['Hiring Officer Name', 'hiring_officer_name'], ['Date of Orientation & Training', 'orientation_date'],
  ['Orientation Status', 'orientation_status'], ['Date of Contract Signing', 'signing_of_contract_date'],
];

// beg_bal → "Beg. Bal", total_screening_failed → "Screening Failed".
const METRIC_LABELS = { beg_bal: 'Beg. Bal', end_bal: 'End Bal', total_applicants: 'Applicants' };
const metricLabel = (key) => METRIC_LABELS[key]
  || key.replace(/^total_/, '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const widths = (rows) => rows[0].map((_, c) => ({
  wch: Math.min(40, Math.max(6, ...rows.map((r) => String(r[c] ?? '').length)) + 2),
}));

const detailedSheet = (rows) => {
  const aoa = [DETAILED_COLUMNS.map(([label]) => label), ...rows.map((r) => DETAILED_COLUMNS.map(([, key]) => r[key] ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = widths(aoa);
  return ws;
};

// One row per branch: Branch | TOTAL (metrics) | each position (metrics),
// with a merged group header above the metric names. Groups and metrics
// keep the portal's response order (its column order).
const frontPageSheet = (data) => {
  const branches = Object.keys(data);
  const groups = branches.length ? Object.keys(data[branches[0]]) : [];
  const head1 = ['Branch'];
  const head2 = [''];
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }];
  const layout = groups.map((group) => {
    const metrics = Object.keys(data[branches[0]][group] || {});
    const start = head1.length;
    metrics.forEach((m, i) => {
      head1.push(i === 0 ? (group === 'total_count' ? 'TOTAL' : group.toUpperCase()) : '');
      head2.push(metricLabel(m));
    });
    if (metrics.length > 1) merges.push({ s: { r: 0, c: start }, e: { r: 0, c: start + metrics.length - 1 } });
    return [group, metrics];
  });
  const body = branches.map((branch) => [
    branch,
    ...layout.flatMap(([group, metrics]) => metrics.map((m) => data[branch]?.[group]?.[m] ?? 0)),
  ]);
  const aoa = [head1, head2, ...body];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = widths([head2, ...body]);
  return ws;
};

// Portal fileName: "<type>[ - Breakdown] (<branch>)", unsafe characters → _.
export const reportFilename = (group, type, branchName) => (
  `${group === DETAILED ? `${type} - Breakdown` : type} (${branchName})`.replace(/[\\/:*?"<>|&.]/g, '_')
);

// Returns false when there is nothing to write.
export const downloadReport = (group, type, data, filename) => {
  const empty = group === DETAILED ? !data?.length : !Object.keys(data || {}).length;
  if (empty) return false;
  const wb = XLSX.utils.book_new();
  const sheetName = type.replace(/[\\/?*[\]:]/g, '-').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, group === DETAILED ? detailedSheet(data) : frontPageSheet(data), sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
  return true;
};
