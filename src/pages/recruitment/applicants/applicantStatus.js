// Status helpers for the ATS lists.
//
// Every stage has its own status column on the applicant row:
// status (screening), initial_interview_status, iq_status, bi_status,
// final_interview_status, orientation_status — 0 On Process, 1 Passed,
// 2 Failed / Not Qualified, 3 Non-Compliant, 4 Reserved, null = not reached.
// The gateway also sends `progress_status`, a ready label for where the
// applicant currently is (recruitment-portal all_job_applicants()).
export const STAGE_STATUS_FIELDS = [
  'status', 'initial_interview_status', 'iq_status', 'bi_status',
  'final_interview_status', 'orientation_status',
];

const stageValues = (row) => STAGE_STATUS_FIELDS.map((f) => row[f]);

// Status filter — same rules as vueportal's ApplicantDataTable.vue
// `filteredEmployees`: a row matches when ANY stage has that value
// (Reserved also requires no failed stage). `color` is the button's AntD
// preset colour.
export const STATUS_FILTERS = [
  { value: 'all', label: 'All', color: 'green', match: () => true },
  { value: 'process', label: 'On Process', color: 'gold', match: (row) => stageValues(row).includes(0) },
  { value: 'failed', label: 'Failed', color: 'red', match: (row) => stageValues(row).includes(2) },
  { value: 'noncompliant', label: 'Non-Compliant', color: 'volcano', match: (row) => stageValues(row).includes(3) },
  { value: 'reserved', label: 'Reserved', color: 'geekblue', match: (row) => stageValues(row).includes(4) && !stageValues(row).includes(2) },
];

// Status tag colour — recruitment-portal's applicationProgress() (its
// ApplicantDataTable.vue): the colour follows how far the applicant has
// got, using the same Vuetify colours. Any failed / non-compliant stage →
// red; reserved (screening or final interview) → indigo; otherwise the
// colour of the furthest stage passed.
export const PROGRESS_COLORS = {
  screening: '#FB8C00',        // screening on process (Vuetify warning)
  initialInterview: '#9C27B0', // screening passed (purple)
  exam: '#009688',             // initial interview passed (teal)
  bi: '#CDDC39',               // exam passed (lime)
  finalInterview: '#00BCD4',   // B.I passed (cyan)
  orientation: '#424242',      // final interview passed (Vuetify secondary)
  hired: '#4CAF50',            // orientation passed (success)
  reserved: '#1A237E',
  failed: '#FF5252',           // failed / non-compliant (Vuetify error)
};

export const progressColorOf = (row) => {
  const s = STAGE_STATUS_FIELDS.map((f) => (row?.[f] === null || row?.[f] === undefined ? null : Number(row[f])));
  const [screening, initial, exam, bi, final, orientation] = s;
  if (s.some((v) => v === 2 || v === 3)) return PROGRESS_COLORS.failed;
  if (screening === 4) return PROGRESS_COLORS.reserved;
  // Reserved (4) at Initial Interview / Exam / B.I still moves the applicant
  // on (portal update_status opens the next step for any status but 0/2/3),
  // so it counts as passed here — otherwise e.g. an exam-Reserved applicant
  // labelled "B.I & Basic Req on Process" kept the Exam colour. (The
  // portal's own applicationProgress() has that mismatch.)
  const advanced = (v) => v === 1 || v === 4;
  if (screening !== 1) return PROGRESS_COLORS.screening;
  if (!advanced(initial)) return PROGRESS_COLORS.initialInterview;
  if (!advanced(exam)) return PROGRESS_COLORS.exam;
  if (!advanced(bi)) return PROGRESS_COLORS.bi;
  if (final === 4) return PROGRESS_COLORS.reserved;
  if (final !== 1) return PROGRESS_COLORS.finalInterview;
  if (orientation !== 1) return PROGRESS_COLORS.orientation;
  return PROGRESS_COLORS.hired;
};

// Solid tag props for a row's status — light lime gets dark text.
export const progressTagProps = (row) => {
  const color = progressColorOf(row);
  return { color, style: color === PROGRESS_COLORS.bi ? { color: 'rgba(0, 0, 0, 0.85)' } : undefined };
};

// Stage filter (All Applicants page) — the portal matches the stage name
// inside the progress_status label, case-insensitive, so "Screening" also
// catches "Screening Not Qualified", "Non-Compliant - Screening", etc.
export const STAGE_FILTERS = [
  'Screening', 'Initial Interview', 'Exam', 'B.I & Basic Req', 'Final Interview', 'Orientation', 'Hired',
];

export const matchesStage = (row, stage) => !stage
  || String(row.progress_status || '').toLowerCase().includes(stage.toLowerCase());

// The gateway formats dates as "MM/DD/YYYY" strings; this turns one into a
// sortable "YYYY-MM-DD" (or '' when blank).
export const isoFromDisplay = (value) => {
  if (!value) return '';
  const [m, d, y] = String(value).split('/');
  return y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : '';
};

// Age on `asOf` from a gateway birthday ("MM/DD/YYYY"), or null when
// either is blank / unparseable. `asOf` is a "YYYY-MM-DD" or "MM/DD/YYYY"
// date — the application date, so the age is the applicant's age when they
// applied (what the portal stores), but computed from the birthday instead
// of trusting the value the application form sent.
export const ageFromBirthdate = (birthdate, asOf) => {
  const birth = isoFromDisplay(birthdate);
  const on = /^\d{4}-\d{2}-\d{2}/.test(asOf || '') ? asOf.slice(0, 10) : isoFromDisplay(asOf);
  if (!birth || !on) return null;
  const [by, bm, bd] = birth.split('-').map(Number);
  const [y, m, d] = on.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return Number.isNaN(age) ? null : age;
};
