// Shared by the Referral Codes pages (Referred Applicants, View Referrals).

// Any careers list permission opens the recruitment ApplicantDrawer (vueportal
// RecruitmentMaintenance view_applicant); the drawer's own actions gate themselves.
export const APPLICANT_LIST_PERMISSIONS = [
  "careers-applicant-list", "careers-screening-list", "careers-initial-interview-list", "careers-iq-test-list",
  "careers-bi-list", "careers-final-interview-list", "careers-orientation-list", "careers-hired-list",
];

// A click on a link / button / expand toggle inside a row isn't a row click.
export const isInnerControl = (e) => Boolean(e.target.closest("a, button, [role='button'], .ant-table-row-expand-icon"));

// The drawer's `maps`: id -> name lookups from the endpoint's branches / positions.
export const lookupMaps = (data) => ({
  branches: Object.fromEntries((data.branches || []).map((b) => [String(b.id), b.name])),
  positions: Object.fromEntries((data.positions || []).map((p) => [String(p.id), p.name])),
});
