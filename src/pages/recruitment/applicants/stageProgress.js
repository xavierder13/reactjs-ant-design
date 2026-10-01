// The six pipeline steps and their per-step status, for the applicant
// view (stage chips, summary). Step indexes match recruitment-portal's
// update_status `step` (0 Screening … 5 Orientation).
export const PIPELINE = [
  { step: 0, label: 'Screening', field: 'status', dateField: 'screening_date' },
  { step: 1, label: 'Initial Interview', field: 'initial_interview_status', dateField: 'initial_interview_date' },
  { step: 2, label: 'Exam', field: 'iq_status', dateField: 'iq_date' },
  { step: 3, label: 'B.I & Basic Req', field: 'bi_status', dateField: 'bi_date' },
  { step: 4, label: 'Final Interview', field: 'final_interview_status', dateField: 'final_interview_date' },
  { step: 5, label: 'Orientation', field: 'orientation_status', dateField: 'orientation_date' },
];

export const STATUS_LABELS = { 0: 'On Process', 1: 'Passed', 2: 'Failed', 3: 'Non-Compliant', 4: 'Reserved' };

const asStatus = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

// Chip state for one step — same colours as the portal's progressStatus():
// on process = warning, passed/reserved = success, failed/non-compliant = error,
// not reached = disabled.
export const stepState = (applicant, step) => {
  const status = asStatus(applicant?.[PIPELINE[step].field]);
  if (status === null) return { status, tone: 'idle' };
  if (status === 0) return { status, tone: 'process' };
  if (status === 1 || status === 4) return { status, tone: 'done' };
  return { status, tone: 'error' };
};

// The portal's currentProgress: the last step whose status is set and not
// Passed; Orientation when every set step has passed.
export const currentStep = (applicant) => {
  let current = PIPELINE.length - 1;
  PIPELINE.forEach(({ field }, i) => {
    const status = asStatus(applicant?.[field]);
    if (status !== null && status !== 1) current = i;
  });
  return current;
};
