// The ATS applicant lists — one per pipeline stage, plus "All Applicants".
// Each maps to vueportal `GET /recruitment/<api>` (RecruitmentController →
// recruitment-portal recruitment_gateway/<api>) and is gated by its own
// careers-* permission (vueportal RecruitmentMaintenance). Default columns
// follow vueportal's ApplicantDataTable.vue per stage.
const LEAD = ['name', 'position_name', 'branch_name'];
const TAIL = ['progress_status'];

// Dates the list's date-range filter can apply to, in pipeline order (the
// portal's "Filter By Date" options). Each stage offers the dates that exist
// by that stage (`dates`, a count into this list) and defaults to its own
// (`dateField`).
export const DATE_FIELDS = [
  { value: 'created_at', label: 'Date Submitted' },
  { value: 'screening_date', label: 'Screening Date' },
  { value: 'initial_interview_date', label: 'Initial Interview Date' },
  { value: 'iq_date', label: 'Exam Date' },
  { value: 'bi_date', label: 'B.I Date' },
  { value: 'final_interview_date', label: 'Final Interview Date' },
  { value: 'orientation_date', label: 'Orientation Date' },
  { value: 'signing_of_contract_date', label: 'Contract Signed' },
];

export const APPLICANT_STAGES = [
  {
    key: 'applicant-list', api: 'applicant_list', title: 'All Applicants',
    permission: 'careers-applicant-list', dates: 8, dateField: 'created_at',
    columns: [...LEAD, 'created_at', ...TAIL],
  },
  {
    key: 'screening-list', api: 'screening_list', title: 'Screening',
    permission: 'careers-screening-list', dates: 2, dateField: 'created_at',
    columns: [...LEAD, 'created_at', ...TAIL],
  },
  {
    key: 'initial-interview-list', api: 'initial_interview_list', title: 'Initial Interview',
    permission: 'careers-initial-interview-list', dates: 3, dateField: 'initial_interview_date',
    columns: [...LEAD, 'screening_date', 'initial_interview_date', ...TAIL],
  },
  {
    key: 'iq-test-list', api: 'iq_test_list', title: 'Exam',
    permission: 'careers-iq-test-list', dates: 4, dateField: 'iq_date',
    columns: [...LEAD, 'initial_interview_date', ...TAIL],
  },
  {
    key: 'bi-list', api: 'bi_list', title: 'B.I & Basic Req.',
    permission: 'careers-bi-list', dates: 5, dateField: 'bi_date',
    columns: [...LEAD, 'branch_complied', 'iq_date', ...TAIL],
  },
  {
    key: 'final-interview-list', api: 'final_interview_list', title: 'Final Interview',
    permission: 'careers-final-interview-list', dates: 6, dateField: 'final_interview_date',
    columns: [...LEAD, 'branch_complied', 'iq_date', 'bi_date', 'final_interview_date', ...TAIL],
  },
  {
    key: 'orientation-list', api: 'orientation_list', title: 'Orientation',
    permission: 'careers-orientation-list', dates: 8, dateField: 'orientation_date',
    columns: [...LEAD, 'branch_complied', 'employment_branch', 'final_interview_date', 'orientation_date', ...TAIL],
  },
  {
    key: 'hired-list', api: 'hired_list', title: 'Hired',
    permission: 'careers-hired-list', dates: 8, dateField: 'signing_of_contract_date',
    columns: [...LEAD, 'branch_complied', 'employment_branch', 'orientation_date', 'signing_of_contract_date', ...TAIL],
  },
].map((stage) => ({ ...stage, path: `/recruitment/${stage.key}` }));
