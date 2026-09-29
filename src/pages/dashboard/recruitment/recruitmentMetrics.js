// Recruitment Dashboard metrics — a line-for-line port of vueportal's
// resources/js/views/dashboard/Dashboard.vue `computed` block and the chart
// data its components build (ApplicantDistribution, SourcingMetrics,
// RecruitmentFunnel). Pure functions, no React, so the parity check can run
// this exact file against vueportal's own code on the same data. Keep the two
// in step: when vueportal's logic changes, change it here the same way —
// including its quirks (see the notes marked "vueportal:").

import dayjs from 'dayjs';

export const RECRUITMENT_STAGES = [
  'Screening', 'Reserved Applicant', 'Initial Interview', 'Exam',
  'B.I & Basic Req', 'Final Interview', 'Orientation', 'Hired',
];
export const AGE_BAND_LABELS = ['18-25', '26-30', '31-35', '36-40', '41-45', '46-50', '51+'];
const PRIMARY_GREEN = '#389e0d';

// ─── Pure utilities (Dashboard.vue) ──────────────────────────────────────────
export const groupByKey = (arr, key) =>
  arr.reduce((acc, r) => { (acc[r[key]] = acc[r[key]] || []).push(r); return acc; }, {});

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

const getAgeBand = (age) => {
  if (!age) return 'Unknown';
  if (age <= 25) return '18-25'; if (age <= 30) return '26-30';
  if (age <= 35) return '31-35'; if (age <= 40) return '36-40';
  if (age <= 45) return '41-45'; if (age <= 50) return '46-50';
  return '51+';
};

export const parseDateValue = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000));
  if (typeof v === 'string' && v.trim()) {
    const mmddyyyy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) return new Date(+mmddyyyy[3], +mmddyyyy[1] - 1, +mmddyyyy[2]);
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  return null;
};

export const daysBetween = (a, b) => {
  if (!a || !b) return null;
  const diff = Math.round((b - a) / 86400000);
  return diff >= 0 ? diff : null;
};

export const getTodayIso = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
export const getJanFirstThisYearIso = () => `${new Date().getFullYear()}-01-01`;
export const defaultDateRange = () => ({ from: getJanFirstThisYearIso(), to: getTodayIso() });
export const emptyFilters = () => ({ branch: '', position: '', source: '', stage: '', gender: '' });

const monthKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const monthLabel = (mk) => { const [y, m] = mk.split('-'); return new Date(+y, +m - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' }); };

const normalizeProgressStatusToStage = (progressStatus) => {
  if (!progressStatus) return 'Screening';
  const s = progressStatus.toLowerCase();
  if (s.includes('hired'))              return 'Hired';
  if (s.includes('orientation'))        return 'Orientation';
  if (s.includes('final interview'))    return 'Final Interview';
  if (s.includes('b.i') || s.includes('basic req')) return 'B.I & Basic Req';
  if (s.includes('exam'))               return 'Exam';
  if (s.includes('initial interview'))  return 'Initial Interview';
  if (s.includes('reserved'))           return 'Reserved Applicant';
  return 'Screening';
};

export const normalizeApiApplicantRow = (apiRow) => {
  const dateApplied     = parseDateValue(apiRow.date_applied || apiRow.created_at || null);
  const dateScreening   = parseDateValue(apiRow.screening_date);
  const dateInitial     = parseDateValue(apiRow.initial_interview_date);
  const dateIq          = parseDateValue(apiRow.iq_date);
  const dateBi          = parseDateValue(apiRow.bi_date);
  const dateFinal       = parseDateValue(apiRow.final_interview_date);
  const dateOrientation = parseDateValue(apiRow.orientation_date);
  const dateContract    = parseDateValue(apiRow.signing_of_contract_date);

  const isHired     = Number(apiRow.orientation_status) === 1 && !!apiRow.signing_of_contract_date;
  const dateHired   = isHired ? dateContract : null;
  const daysToHire  = (dateApplied && dateHired) ? Math.round((dateHired - dateApplied) / 86400000) : null;
  const age         = parseInt(apiRow.age) || null;
  const recruitmentStage = isHired ? 'Hired' : normalizeProgressStatusToStage(apiRow.progress_status);

  return {
    applicantName:          String(apiRow.name || ''),
    dateApplied,
    dateHired,
    dateScreening,
    dateInitial,
    dateIq,
    dateBi,
    dateFinal,
    dateOrientation,
    dateContract,
    orientationContractGap: daysBetween(dateOrientation, dateContract),
    applicationSource:      String(apiRow.how_learn || 'Others'),
    appliedPosition:        String(apiRow.position_name || 'Unknown'),
    appliedBranch:          String(apiRow.branch_applied || apiRow.branch_name || 'Unknown'),
    applicantGender:        String(apiRow.gender || 'Unknown'),
    applicantAge:           age,
    applicantAgeBand:       getAgeBand(age),
    recruitmentStage,
    rawProgressStatus:      String(apiRow.progress_status || ''),
    isHired:                recruitmentStage === 'Hired',
    daysToHire,
    educAttain:             String(apiRow.educ_attain || 'Unknown'),
    civilStatus:            String(apiRow.civil_status || 'Unknown'),
    positionPreference:     String(apiRow.position_preference || ''),
    branchPreference:       String(apiRow.branch_preference || ''),
    employmentPosition:     String(apiRow.employment_position || ''),
    employmentBranch:       String(apiRow.employment_branch || ''),
    hiringOfficerName:      String(apiRow.hiring_officer_name || ''),
    hiringOfficerPosition:  String(apiRow.hiring_officer_position || ''),
    screeningStatus:        apiRow.screening_status           ?? null,
    initialInterviewStatus: apiRow.initial_interview_status   ?? null,
    biStatus:               apiRow.bi_status                  ?? null,
    iqStatus:               apiRow.iq_status                  ?? null,
    finalInterviewStatus:   apiRow.final_interview_status     ?? null,
    orientationStatus:      apiRow.orientation_status         ?? null,
  };
};

// Dashboard.vue loadApplicantData(): drop rows with no name/position/branch,
// unless that would drop everything.
export const loadApplicantRows = (apiRows) => {
  if (!Array.isArray(apiRows) || !apiRows.length) return [];
  const normalizedRows = apiRows.map(normalizeApiApplicantRow);
  const validRows = normalizedRows.filter(
    (a) => a.applicantName || a.appliedPosition !== 'Unknown' || a.appliedBranch !== 'Unknown',
  );
  return validRows.length ? validRows : normalizedRows;
};

// ─── Every Dashboard.vue computed value, from the same inputs ────────────────
// allApplicantRows: loadApplicantRows() output; filters: { branch, position,
// source, stage, gender }; dateRange: { from, to } ('YYYY-MM-DD' or '');
// positions/branches: the /recruitment/applicant_list lookups; today: Date.
export function computeRecruitmentMetrics({ allApplicantRows, filters, dateRange, positions = [], branches = [], today = new Date() }) {
  const fromDate = dateRange.from ? new Date(dateRange.from) : null;
  const toDate   = dateRange.to   ? new Date(dateRange.to + 'T23:59:59') : null;

  const allFilterOptions = Object.fromEntries(
    Object.entries({ branch: 'appliedBranch', position: 'appliedPosition', source: 'applicationSource', stage: 'recruitmentStage' })
      .map(([key, field]) => [key, [...new Set(allApplicantRows.map((a) => a[field]))].filter(Boolean).sort()]),
  );

  const dateFilteredApplicants = allApplicantRows.filter((applicant) => {
    if (filters.branch   && applicant.appliedBranch     !== filters.branch)   return false;
    if (filters.position && applicant.appliedPosition   !== filters.position) return false;
    if (filters.source   && applicant.applicationSource !== filters.source)   return false;
    if (filters.gender   && applicant.applicantGender   !== filters.gender)   return false;
    if (filters.stage    && applicant.recruitmentStage  !== filters.stage)    return false;
    if (applicant.dateHired !== null) {
      if (fromDate && applicant.dateHired < fromDate) return false;
      if (toDate   && applicant.dateHired > toDate)   return false;
    } else if (applicant.dateApplied) {
      if (fromDate && applicant.dateApplied < fromDate) return false;
      if (toDate   && applicant.dateApplied > toDate)   return false;
    }
    return true;
  });

  // vueportal: the stage filter is not applied here (only to dateFilteredApplicants).
  const hiredApplicants = allApplicantRows.filter((applicant) => {
    if (!applicant.isHired || applicant.dateHired === null) return false;
    if (filters.branch   && applicant.appliedBranch     !== filters.branch)   return false;
    if (filters.position && applicant.appliedPosition   !== filters.position) return false;
    if (filters.source   && applicant.applicationSource !== filters.source)   return false;
    if (filters.gender   && applicant.applicantGender   !== filters.gender)   return false;
    if (fromDate && applicant.dateHired < fromDate) return false;
    if (toDate   && applicant.dateHired > toDate)   return false;
    return true;
  });

  // vueportal: hired applicants are in BOTH lists, so anything built on this
  // counts each hire twice (gender, education, civil status, top positions,
  // branch breakdown). Kept identical so the numbers match vueportal.
  const allDateFilteredApplicants = [...dateFilteredApplicants, ...hiredApplicants];

  const daysToHireValues = dateFilteredApplicants.filter((a) => a.daysToHire > 0).map((a) => a.daysToHire);
  const averageDaysToHire = daysToHireValues.length
    ? Math.round(daysToHireValues.reduce((a, b) => a + b, 0) / daysToHireValues.length)
    : null;
  const topApplicationSource = Object.entries(groupByKey(dateFilteredApplicants, 'applicationSource'))
    .sort((a, b) => b[1].length - a[1].length)[0] || null;

  const kpiCards = [
    { icon: '📥', label: 'Total Applicants', hexColor: '#1677ff',    value: dateFilteredApplicants.length,                                                sub: `${pct(hiredApplicants.length, dateFilteredApplicants.length)}% hire rate` },
    { icon: '✅', label: 'Total Hired',       hexColor: PRIMARY_GREEN, value: hiredApplicants.length,                                                      sub: `${hiredApplicants.length} confirmed hires` },
    { icon: '⏱️', label: 'Avg Time to Hire', hexColor: '#faad14',    value: averageDaysToHire != null ? `${averageDaysToHire}d` : 'N/A',                  sub: `${daysToHireValues.length} data points` },
    { icon: '📣', label: 'Top Source',        hexColor: '#722ed1',    value: topApplicationSource ? topApplicationSource[0] : '—',                        sub: topApplicationSource ? `${topApplicationSource[1].length} applicants` : '' },
    { icon: '🎯', label: 'Hire Rate',          hexColor: '#13c2c2',    value: `${pct(hiredApplicants.length, dateFilteredApplicants.length)}%`,            sub: `${hiredApplicants.length} of ${dateFilteredApplicants.length}` },
    { icon: '📅', label: 'Period From',        hexColor: PRIMARY_GREEN, value: dateRange.from ? dateRange.from.slice(0, 7) : 'All',                       sub: `to ${dateRange.to || 'today'}` },
  ];

  const hasStatus = (a, stageName) => a.rawProgressStatus && a.rawProgressStatus.toLowerCase().includes(stageName.toLowerCase());
  const countOnProcess = (stageName) => dateFilteredApplicants.filter((a) => hasStatus(a, stageName) && /on process/i.test(a.rawProgressStatus)).length;
  const countFailed = (stageName) => dateFilteredApplicants.filter((a) => hasStatus(a, stageName) && /failed|not qualified|non-compliant/i.test(a.rawProgressStatus)).length;
  const countReserved = () => dateFilteredApplicants.filter((a) => /reserved/i.test(a.rawProgressStatus || '')).length;
  const hiredCount = dateFilteredApplicants.filter((a) => a.dateHired !== null).length;

  const recruitmentStageCards = [
    { stageName: 'Screening',         routePath: '/recruitment/screening-list',         countStageItems: countOnProcess('Screening'),         failedCount: countFailed('Screening'),         reservedCount: countReserved() },
    { stageName: 'Initial Interview', routePath: '/recruitment/initial-interview-list', countStageItems: countOnProcess('Initial Interview'), failedCount: countFailed('Initial Interview'), reservedCount: null },
    { stageName: 'Exam',              routePath: '/recruitment/iq-test-list',           countStageItems: countOnProcess('Exam'),              failedCount: countFailed('Exam'),              reservedCount: null },
    { stageName: 'B.I & Basic Req',   routePath: '/recruitment/bi-list',                countStageItems: countOnProcess('B.I & Basic Req'),   failedCount: countFailed('B.I & Basic Req'),   reservedCount: null },
    { stageName: 'Final Interview',   routePath: '/recruitment/final-interview-list',   countStageItems: countOnProcess('Final Interview'),   failedCount: countFailed('Final Interview'),   reservedCount: null },
    { stageName: 'Orientation',       routePath: '/recruitment/orientation-list',       countStageItems: countOnProcess('Orientation'),       failedCount: countFailed('Orientation'),       reservedCount: null },
    { stageName: 'Hired',             routePath: '/recruitment/hired-list',             countStageItems: hiredCount,                          failedCount: null,                             reservedCount: null },
  ];

  const countByStageKeyword = (stageName) => dateFilteredApplicants.filter((a) => hasStatus(a, stageName)).length;
  const recruitmentStageAnalysisRows = [
    { label: 'Applications',      count: dateFilteredApplicants.length },
    { label: 'Screening',         count: countByStageKeyword('Screening') },
    { label: 'Initial Interview', count: countByStageKeyword('Initial Interview') },
    { label: 'Exam',              count: countByStageKeyword('Exam') },
    { label: 'B.I & Basic Req',   count: countByStageKeyword('B.I & Basic Req') },
    { label: 'Final Interview',   count: countByStageKeyword('Final Interview') },
    { label: 'Orientation',       count: countByStageKeyword('Orientation') },
    { label: 'Hired',             count: hiredCount },
  ];

  const totalHiredAllTime = dateFilteredApplicants.filter((r) => Number(r.orientationStatus) === 1 && !!r.dateContract).length;

  const screening   = dateFilteredApplicants.filter((r) => Number(r.screeningStatus) === 1);
  const initial     = screening.filter((r) => Number(r.initialInterviewStatus) === 1);
  const iq          = initial.filter((r) => Number(r.iqStatus) === 1);
  const bi          = iq.filter((r) => Number(r.biStatus) === 1);
  const finalIv     = bi.filter((r) => Number(r.finalInterviewStatus) === 1);
  const orientation = finalIv.filter((r) => Number(r.orientationStatus) === 1);
  const recruitmentFunnelRows = [
    { label: 'Total Applicants',  count: dateFilteredApplicants.length },
    { label: 'Screening',         count: screening.length },
    { label: 'Initial Interview', count: initial.length },
    { label: 'Exam (IQ)',         count: iq.length },
    { label: 'B.I & Basic Req',   count: bi.length },
    { label: 'Final Interview',   count: finalIv.length },
    { label: 'Orientation',       count: orientation.length },
    { label: 'Hired',             count: totalHiredAllTime },
  ];

  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
  const gap = (from, to) => avg(dateFilteredApplicants.filter((a) => a[from] && a[to]).map((a) => daysBetween(a[from], a[to])));
  const avgDaysPerStage = {
    labels: ['Screening', 'Initial Int.', 'Exam', 'B.I & Bsc Req', 'Final Int.', 'Orientation'],
    data: [
      gap('dateApplied', 'dateScreening'),
      gap('dateScreening', 'dateInitial'),
      gap('dateInitial', 'dateIq'),
      gap('dateIq', 'dateBi'),
      gap('dateBi', 'dateFinal'),
      gap('dateFinal', 'dateOrientation'),
    ],
  };

  const genders = [...new Set(allDateFilteredApplicants.map((a) => a.applicantGender))].filter((g) => g && g !== 'Unknown');
  const genderBreakdownStats = genders.map((gender) => ({
    gender,
    totalCount: allDateFilteredApplicants.filter((a) => a.applicantGender === gender).length,
    hiredCount: hiredApplicants.filter((a) => a.applicantGender === gender).length,
  }));

  const outcomeStages = ['Screening', 'Initial Interview', 'Exam', 'B.I & Basic Req'];
  const stageOutcomeData = {
    labels:       outcomeStages,
    onProcess:    outcomeStages.map((s) => dateFilteredApplicants.filter((a) => hasStatus(a, s) && /on process/i.test(a.rawProgressStatus)).length),
    failed:       outcomeStages.map((s) => dateFilteredApplicants.filter((a) => hasStatus(a, s) && /failed|not qualified/i.test(a.rawProgressStatus)).length),
    nonCompliant: outcomeStages.map((s) => dateFilteredApplicants.filter((a) => hasStatus(a, s) && /non-compliant/i.test(a.rawProgressStatus)).length),
  };

  const nonCompliantMonths = {};
  dateFilteredApplicants.forEach((a) => {
    if (!a.dateApplied || !/non-compliant/i.test(a.rawProgressStatus)) return;
    const mk = monthKey(a.dateApplied);
    nonCompliantMonths[mk] = (nonCompliantMonths[mk] || 0) + 1;
  });
  const nonCompliantKeys = Object.keys(nonCompliantMonths).sort();
  const nonCompliantByMonth = { labels: nonCompliantKeys.map(monthLabel), data: nonCompliantKeys.map((k) => nonCompliantMonths[k]) };

  const reservedAgingRows = dateFilteredApplicants
    .filter((a) => /reserved/i.test(a.rawProgressStatus))
    .map((a) => ({
      applicantName:    a.applicantName,
      recruitmentStage: a.recruitmentStage,
      appliedBranch:    a.appliedBranch,
      appliedPosition:  a.appliedPosition,
      dateAppliedStr:   a.dateApplied ? dayjs(a.dateApplied).format('MM/DD/YYYY') : '—',
      daysWaiting:      a.dateApplied ? Math.round((today - a.dateApplied) / 86400000) : 0,
    }))
    .sort((a, b) => b.daysWaiting - a.daysWaiting);

  const reservedAgingBuckets = [
    { label: '0–7 days',   color: '#389e0d', bg: '#f6ffed', count: reservedAgingRows.filter((r) => r.daysWaiting <= 7).length },
    { label: '8–14 days',  color: '#faad14', bg: '#fffbe6', count: reservedAgingRows.filter((r) => r.daysWaiting > 7  && r.daysWaiting <= 14).length },
    { label: '15–30 days', color: '#fa8c16', bg: '#fff7e6', count: reservedAgingRows.filter((r) => r.daysWaiting > 14 && r.daysWaiting <= 30).length },
    { label: '>30 days',   color: '#f5222d', bg: '#fff1f0', count: reservedAgingRows.filter((r) => r.daysWaiting > 30).length },
  ];

  const educAttainStats = Object.entries(groupByKey(allDateFilteredApplicants, 'educAttain'))
    .filter(([k]) => k && k !== 'Unknown')
    .sort((a, b) => b[1].length - a[1].length)
    .map(([educ, rows]) => ({
      educ,
      count:    rows.length,
      hired:    hiredApplicants.filter((a) => a.educAttain === educ).length,
      hireRate: pct(hiredApplicants.filter((a) => a.educAttain === educ).length, rows.length),
    }));

  const civilStatusStats = Object.entries(groupByKey(allDateFilteredApplicants, 'civilStatus'))
    .filter(([k]) => k && k !== 'Unknown')
    .sort((a, b) => b[1].length - a[1].length)
    .map(([status, rows]) => ({ status, count: rows.length }));

  const hiringOfficerStats = Object.entries(groupByKey(hiredApplicants.filter((a) => a.hiringOfficerName), 'hiringOfficerName'))
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15)
    .map((entry, i) => {
      const rows    = entry[1];
      const days    = rows.filter((a) => a.daysToHire > 0).map((a) => a.daysToHire);
      const avgDays = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
      return {
        rank:            i + 1,
        officerName:     entry[0],
        officerPosition: rows[0].hiringOfficerPosition,
        hiredCount:      rows.length,
        avgDays,
        hireRate:        pct(rows.length, dateFilteredApplicants.filter((a) => a.hiringOfficerName === entry[0]).length || rows.length),
      };
    });

  const posMap = {};
  const branchMap = {};
  positions.forEach((p) => { posMap[String(p.id)] = p.name; });
  branches.forEach((b) => { branchMap[String(b.id)] = b.name; });
  const splitIds = (str) => String(str || '').split(',').map((s) => s.trim()).filter(Boolean);
  const withPosPref    = hiredApplicants.filter((a) => a.positionPreference && a.employmentPosition);
  const withBranchPref = hiredApplicants.filter((a) => a.branchPreference && a.employmentBranch);
  const positionMatched = withPosPref.filter((a) => splitIds(a.positionPreference)
    .map((id) => (posMap[id] || '').toLowerCase().trim()).filter(Boolean)
    .includes(String(a.employmentPosition).toLowerCase().trim())).length;
  const branchMatched = withBranchPref.filter((a) => splitIds(a.branchPreference)
    .map((id) => (branchMap[id] || '').toLowerCase().trim()).filter(Boolean)
    .includes(String(a.employmentBranch).toLowerCase().trim())).length;
  const placementMatchStats = {
    totalPlaced:      hiredApplicants.filter((a) => a.employmentPosition).length,
    posCompared:      withPosPref.length,
    positionMatched,
    positionMatchPct: pct(positionMatched, withPosPref.length),
    branchCompared:   withBranchPref.length,
    branchMatched,
    branchMatchPct:   pct(branchMatched, withBranchPref.length),
  };

  const iqPassRateByPosition = Object.entries(groupByKey(dateFilteredApplicants.filter((a) => a.iqStatus != null), 'appliedPosition'))
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([pos, rows]) => ({
      pos,
      passed:   rows.filter((a) => Number(a.iqStatus) === 1).length,
      failed:   rows.filter((a) => Number(a.iqStatus) === 2).length,
      total:    rows.length,
      passRate: pct(rows.filter((a) => Number(a.iqStatus) === 1).length, rows.length),
    }));

  const topPositionEntries = Object.entries(groupByKey(allDateFilteredApplicants, 'appliedPosition'))
    .sort((a, b) => b[1].length - a[1].length).slice(0, 10)
    .map((entry, i) => ({
      rank:         i + 1,
      positionName: entry[0],
      appliedCount: entry[1].length,
      hiredCount:   hiredApplicants.filter((a) => a.appliedPosition === entry[0]).length,
    }));

  const branchBreakdownEntries = Object.entries(groupByKey(allDateFilteredApplicants, 'appliedBranch'))
    .sort((a, b) => b[1].length - a[1].length)
    .map((entry, i) => ({
      rank:         i + 1,
      branchName:   entry[0],
      appliedCount: entry[1].length,
      hiredCount:   hiredApplicants.filter((a) => a.appliedBranch === entry[0]).length,
    }));

  const heatmapSourceLabels = [...new Set(dateFilteredApplicants.map((a) => a.applicationSource))].sort().slice(0, 8);
  const heatmapStageLabels = RECRUITMENT_STAGES.slice(0, 7);
  const heatmapDataGrid = {};
  dateFilteredApplicants.forEach((a) => {
    const key = a.applicationSource + '||' + a.recruitmentStage;
    heatmapDataGrid[key] = (heatmapDataGrid[key] || 0) + 1;
  });
  const heatmapMaxValue = Math.max(...Object.values(heatmapDataGrid), 1);

  // `icon` names match vueportal's mdi icons; the component maps them.
  let recruitmentInsights = [];
  if (dateFilteredApplicants.length) {
    const applicants = dateFilteredApplicants;
    const hireRate          = pct(hiredApplicants.length, applicants.length);
    const topSrc            = Object.entries(groupByKey(applicants, 'applicationSource')).sort((a, b) => b[1].length - a[1].length)[0];
    const topPos            = Object.entries(groupByKey(applicants, 'appliedPosition')).sort((a, b) => b[1].length - a[1].length)[0];
    const topBranch         = Object.entries(groupByKey(applicants, 'appliedBranch')).sort((a, b) => b[1].length - a[1].length)[0];
    const reservedCount     = applicants.filter((a) => /reserved/i.test(a.recruitmentStage)).length;
    const nonCompliantCount = applicants.filter((a) => /non-compliant/i.test(a.rawProgressStatus)).length;
    const longGapCount      = hiredApplicants.filter((a) => a.orientationContractGap != null && a.orientationContractGap > 7).length;
    recruitmentInsights = [
      { type: 'success', icon: 'check-circle', text: `Overall hire rate is ${hireRate}% — ${hiredApplicants.length} hired out of ${applicants.length} total applicants in the selected period.` },
      topSrc    && { type: 'info',    icon: 'information',     text: `${topSrc[0]} is the top applicant source with ${topSrc[1].length} applicants (${pct(topSrc[1].length, applicants.length)}%). Prioritize budget here.` },
      topPos    && { type: 'warning', icon: 'alert',           text: `${topPos[0]} is the most-applied position (${topPos[1].length} applicants). Check headcount targets.` },
      topBranch && { type: 'info',    icon: 'office-building', text: `${topBranch[0]} branch has the highest recruitment activity (${topBranch[1].length} applicants). Ensure interviewer capacity.` },
      averageDaysToHire && { type: averageDaysToHire > 15 ? 'warning' : 'success', icon: 'timer-outline', text: `Average time-to-hire is ${averageDaysToHire} days. ${averageDaysToHire > 15 ? 'Consider streamlining stages.' : 'Processing speed is within a healthy range.'}` },
      reservedCount     > 0 && { type: 'error',   icon: 'account-clock', text: `${reservedCount} reserved applicants (qualified but pending requirements) need follow-up.` },
      nonCompliantCount > 0 && { type: 'warning', icon: 'alert-circle',  text: `${nonCompliantCount} applicants are non-compliant across stages. Review document requirements clarity.` },
      longGapCount      > 0 && { type: 'error',   icon: 'file-clock',    text: `${longGapCount} hired applicants took more than 7 days between orientation and contract signing — at-risk of dropping out.` },
    ].filter(Boolean);
  }

  const qualifiedCandidatesPerVacancy = Object.entries(groupByKey(dateFilteredApplicants.filter((a) => a.finalInterviewStatus != null), 'appliedPosition'))
    .filter(([, rows]) => rows.length >= 1)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([position, rows]) => {
      const passed = rows.filter((a) => Number(a.finalInterviewStatus) === 1).length;
      const failed = rows.filter((a) => Number(a.finalInterviewStatus) === 2).length;
      const total  = rows.filter((a) => ![0, 3].includes(Number(a.finalInterviewStatus))).length;
      return {
        position,
        total,
        passed,
        failed,
        interviewsPerHire: passed > 0 ? +(total / passed).toFixed(1) : total,
        rejectsPerHire:    passed > 0 ? +((failed / passed)).toFixed(1) : failed,
        passRate: pct(passed, total),
      };
    });

  const sourcingChannelEfficiency = Object.entries(groupByKey(hiredApplicants, 'applicationSource'))
    .sort((a, b) => b[1].length - a[1].length)
    .map(([source, rows], i) => ({
      source,
      hiredCount: rows.length,
      percentage: pct(rows.length, hiredApplicants.length),
      colorIndex: i,
    }));

  return {
    allFilterOptions, dateFilteredApplicants, hiredApplicants, allDateFilteredApplicants,
    daysToHireValues, averageDaysToHire, topApplicationSource, kpiCards,
    recruitmentStageCards, recruitmentStageAnalysisRows, recruitmentFunnelRows, totalHiredAllTime,
    avgDaysPerStage, genderBreakdownStats, stageOutcomeData, nonCompliantByMonth,
    reservedAgingRows, reservedAgingBuckets, educAttainStats, civilStatusStats,
    hiringOfficerStats, placementMatchStats, iqPassRateByPosition,
    topPositionEntries, branchBreakdownEntries,
    heatmapSourceLabels, heatmapStageLabels, heatmapDataGrid, heatmapMaxValue,
    recruitmentInsights, qualifiedCandidatesPerVacancy, sourcingChannelEfficiency,
  };
}

// ─── Chart data built inside vueportal's components ──────────────────────────

// ApplicantDistribution.vue renderMonthlyTrendChart()
export function monthlyApplicationTrend(dateFilteredApplicants) {
  const applicantsByMonth = {};
  const hiredByMonth = {};
  dateFilteredApplicants.forEach((a) => {
    if (!a.dateApplied) return;
    const mk = monthKey(a.dateApplied);
    applicantsByMonth[mk] = (applicantsByMonth[mk] || 0) + 1;
    if (a.isHired) hiredByMonth[mk] = (hiredByMonth[mk] || 0) + 1;
  });
  const keys = Object.keys(applicantsByMonth).sort();
  return {
    labels:       keys.map(monthLabel),
    applications: keys.map((k) => applicantsByMonth[k] || 0),
    hired:        keys.map((k) => hiredByMonth[k] || 0),
  };
}

// ApplicantDistribution.vue renderAgeGroupChart()
export function ageGroupDistribution(dateFilteredApplicants, hiredApplicants) {
  return {
    labels:  AGE_BAND_LABELS,
    applied: AGE_BAND_LABELS.map((band) => dateFilteredApplicants.filter((a) => a.applicantAgeBand === band).length),
    hired:   AGE_BAND_LABELS.map((band) => hiredApplicants.filter((a) => a.applicantAgeBand === band).length),
  };
}

// SourcingMetrics.vue — source of application / hired by source, by count desc
export function countBySource(applicants) {
  const entries = Object.entries(groupByKey(applicants, 'applicationSource')).sort((a, b) => b[1].length - a[1].length);
  return { labels: entries.map((e) => e[0]), data: entries.map((e) => e[1].length), total: applicants.length };
}

// RecruitmentFunnel.vue embudoRows
export function funnelChartRows(recruitmentFunnelRows) {
  if (!recruitmentFunnelRows.length) return [];
  const total = recruitmentFunnelRows[0].count || 1;
  return recruitmentFunnelRows.map((row) => ({ ...row, pctOfTotal: Math.round((row.count / total) * 100) }));
}
