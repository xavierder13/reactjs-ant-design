// Applicant notifications (email via the portal's mail templates, SMS via
// M360) — recruitment-portal ApplicationProgressDialog.vue (after a status
// save) and ApplicationProgressCard.vue (manual resend).
import { currentStep } from './stageProgress';

// Types whose email carries a schedule the user fills in first.
export const INVITATION_TYPES = ['invitation_for_initial_interview', 'invitation_for_examination', 'invitation_bm_interview'];

export const NOTIFICATION_LABELS = {
  personal_info_completion: 'Passed screening — complete personal information',
  failed_screening: 'Failed screening',
  invitation_for_initial_interview: 'Initial interview invitation',
  failed_initial_interview: 'Failed initial interview',
  invitation_for_examination: 'Examination invitation',
  failed_examination: 'Failed examination / B.I',
  invitation_bm_interview: 'Final interview invitation',
  failed_bm_interview: 'Failed final interview',
};

// 8:00 AM – 5:00 PM every 30 minutes (portal timeItems).
export const TIME_OPTIONS = Array.from({ length: 19 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  const h = Math.floor(minutes / 60);
  const label = `${((h + 11) % 12) + 1}:${minutes % 60 ? '30' : '00'} ${h < 12 ? 'AM' : 'PM'}`;
  return { value: label, label };
});

const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

// After a status save: the type for the step just saved, from the saved
// values (payload shape). '' = nothing to send.
export const typeAfterSave = (step, saved) => {
  if (step === 0) return { 1: 'personal_info_completion', 2: 'failed_screening' }[n(saved.status)] || '';
  if (step === 1) {
    const s = n(saved.initial_interview_status);
    if (s === 0 && saved.initial_interview_date) return 'invitation_for_initial_interview';
    return { 1: 'invitation_for_examination', 2: 'failed_initial_interview' }[s] || '';
  }
  if (step === 2) return n(saved.iq_status) === 2 ? 'failed_examination' : '';
  if (step === 3) return { 1: 'invitation_bm_interview', 2: 'failed_examination' }[n(saved.bi_status)] || '';
  if (step === 4) return n(saved.final_interview_status) === 2 ? 'failed_bm_interview' : '';
  return '';
};

// Manual resend (envelope): the type for the applicant's current, saved
// state; '' = no envelope (e.g. Orientation / Hired). Same as the portal
// card, except a failed Initial Interview resends `failed_initial_interview`
// (the card offers the interview invitation there) and a non-compliant one
// offers nothing.
export const typeForResend = (applicant) => {
  const step = currentStep(applicant);
  if (step === 0) return n(applicant.status) === 2 ? 'failed_screening' : '';
  if (step === 1) {
    const s = n(applicant.initial_interview_status);
    if (s === 2) return 'failed_initial_interview';
    if (s !== 0) return '';
    return applicant.initial_interview_date ? 'invitation_for_initial_interview' : 'personal_info_completion';
  }
  if (step === 2) return { 0: 'invitation_for_examination', 2: 'failed_examination' }[n(applicant.iq_status)] || '';
  if (step === 3) return n(applicant.bi_status) === 2 ? 'failed_examination' : '';
  if (step === 4) return { 0: 'invitation_bm_interview', 2: 'failed_bm_interview' }[n(applicant.final_interview_status)] || '';
  return '';
};

// The stage date that an invitation's schedule usually matches.
export const SCHEDULE_DATE_FIELD = {
  invitation_for_initial_interview: 'initial_interview_date',
  invitation_for_examination: 'iq_date',
  invitation_bm_interview: 'final_interview_date',
};
