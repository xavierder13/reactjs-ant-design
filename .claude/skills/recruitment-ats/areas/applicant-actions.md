# Recruitment ATS — applicant actions (phases 3–8)

Part of the `recruitment-ats` skill; read `SKILL.md` first (cross-cutting rules).

**Phase 3 — status update.** `StatusUpdateModal.jsx` mode `status`, opened
from the **Update Status** button on the current on-process step of the
Application Progress timeline (`careers-update-status`; a Branch Manager
not while the current step is 1, 4 or 5 — they see a lock note there
instead). Shows only that step's
fields; POST `update_status { applicant_id, step, ...step fields }`
(dates `YYYY-MM-DD`, preferences comma-joined, `*_remarks` built from the
Non-Compliant reason picker). Like the portal's `editedItem`, the rules
read the whole applicant: Exam / B.I status, the Final Interview date and
the Orientation dates are disabled by the step before, which isn't
rendered — so `v` must be `Form.useWatch([], { form, preserve: true })`
(without `preserve` it holds rendered fields only and steps 2–5 lock for
everyone). Confirm → save → drawer reloads, list row
replaced by the response's `applicant` (list-row shape). Portal rules, per
step:
- 0 Screening: `status` required; `screening_date` disabled until a
  decided status, required when status > 0 only for users with
  update-hiring-details.
- 1 Initial Interview: date required when Passed; Passed pre-fills and
  requires position / branch preferences (applicant's own, else the
  applied position/branch). Warning (not blocking) when personal details /
  education / references are incomplete.
- 2 Exam: `iq_date` required > 0; Branch Complied defaults to the
  applicant's (else branch applied — the portal uses the acting user's
  branch; a Branch Manager only sees their branch), locked for Branch
  Managers. Passed needs a file titled **Exam**.
- 3 B.I: `bi_date` required > 0.
- 4 Final Interview: status disabled until the date is set; Passed requires
  employment position/branch, hiring officer name (picked from Setup →
  Hiring Officers — employees) and position (read-only, the officer's
  employee position;
  a name saved before the list existed stays selectable with its saved
  position), and the final files (`finalRequiredFiles`: Background
  Investigation, Final Interview Result, Birth Certificate, Police
  Clearance, Diploma or Certification, Health Declaration, SSS, Pag-IBIG,
  PhilHealth, + Driver's License for Logistics Driver / C.I Collector /
  Technician). Non-Compliant → reason (Hired in other organization / Back
  out due to Training / Others (Specify)).
- 5 Orientation: both dates required > 0; status disabled until the
  orientation date; Non-Compliant → reason.
- **Failed remarks (every step):** status Failed (2) shows a required
  "Failed Remarks" text (≤ 1000) → `<stage>_failed_remarks`
  (`screening_`, `initial_interview_`, `iq_`, `bi_`, `final_interview_`,
  `orientation_failed_remarks`; portal columns, separate from the
  Non-Compliant `*_remarks`), sent null once the step isn't Failed. Required
  only when the step *becomes* Failed (a step already Failed can be edited
  without it). The gateway enforces it too (`missingFailedRemarks`, 422
  error bag → `form.setFields`). Shown on the progress timeline and as the
  hidden-by-default list column "Failed Remarks".
File gates apply only while the applicant is on process at that step
(portal checks `progress_status`); the gateway enforces them too.

**Phase 5 — files.** `ApplicantFilesTab.jsx` (Files tab, `careers-file-list`):
list + download (`careers-file-download`), Add → upload modal
(`careers-file-upload`; document type, "Others" → typed title; jpeg/jpg/
png/docs/docx/pdf ≤ 20 MB checked client-side too) → POST `file_upload`
multipart; delete (`careers-file-delete`, Popconfirm) hidden for the
Resume and once Final Interview is passed (gateway refuses both); Final
Requirements checklist (case-insensitive title match). Each change
reloads the drawer so the status gates see it.

**Phase 6 — hiring details.** Same modal, mode `details`: pencil on the
Application Progress card (`careers-update-hiring-details`, not Branch
Managers) → every step's fields → POST `update_hiring_details`, which the
portal saves verbatim — so the form cascades like the portal dialog:
setting a status to Passed opens the next step (On Process), anything else
clears every later step. Validation errors come back as HTTP 200 error
bags → `form.setFields`.

**Phase 7 — list extras.** Stage lists open on the On Process
status button (portal locks them there; here the other buttons stay
usable); All Applicants and Hired open on All. Warning icons beside the
status — "Incomplete Details" (screening passed, initial interview on
process, missing details/education/references) and "Incomplete
Requirements: …" (final interview on process, missing final files; TIN
not counted, matching the portal's dialog/checklist rather than its list
icon) — from POST `secondary_details` for the current page's candidate
rows only, cached per applicant and dropped after a drawer save. Delete
applicant (`careers-applicant-delete`, Popconfirm) → POST
`delete_applicant/{id}` (also deletes their files). **Export** (`careers-export`): toolbar button → `ExportModal.jsx` +
`exportReports.js`. The portal's export endpoints return DATA
(`{ success, applicants }`) — its DialogExport.vue builds the sheet in the
browser — so React builds an .xlsx with the installed `xlsx`: Detailed
Report = one row per applicant, the portal's 31 columns; Front Page
(Sourcing/Screening, Recruitment, Hiring, Signing of Contract, Overall
Count) = one row per branch, TOTAL then each position (groups/metrics in
the response's order, merged group header). File name as the portal:
`<type>[ - Breakdown] (<branch>)`. On a stage list the report is locked to
that stage's Detailed Report; on All Applicants any group/type (Detailed
types filtered by the stage list permission). Branch 1000 = ALL BRANCH
(portal ids — they don't match vueportal's). The request mirrors the
portal's exactly (no `step`, no branch-field parameter — the portal's
dialog requires that picker but never sends it, so it's left out), so the
numbers match. Branch Managers: no branch picker; the gateway forces their
portal branch. Front Page reports follow the vueportal `careers-export`
permission (the portal's own report permission isn't re-checked).

**Phase 4 — notifications.** `notifications.js` (`typeAfterSave`,
`typeForResend`, `INVITATION_TYPES`, `TIME_OPTIONS`) +
`SendNotificationModal.jsx` (channels Email / SMS by permission, schedule
fields for invitations when Email is picked, per-channel result Alerts; a
channel that went through is unticked so "Send again" retries only the
failed one). Status saves (`StatusUpdateModal` → `onSaved(row, notify)`)
open it as "Status updated — notify the applicant?" (Skip = don't send);
the ✉ button beside the pencil opens it for a manual resend. Hiring-details
saves never notify. Portal sends SMS via M360 and email via Laravel mail
templates. `notif_type` by step/status:
0 Passed `personal_info_completion`, 0 Failed `failed_screening`; 1 On
Process with a date `invitation_for_initial_interview`, 1 Passed
`invitation_for_examination`, 1 Failed `failed_initial_interview`; 2 Failed
`failed_examination`; 3 Passed `invitation_bm_interview`, 3 Failed
`failed_examination`; 4 Failed `failed_bm_interview`. Invitations first ask
date, time (8:00 AM–5:00 PM, 30-min), venue, facilitator, facilitator
position (+ deadline date for `invitation_bm_interview`); email payload also
carries `position` (first position preference). Then "Send notification?" →
`POST send-email` then `send-sms` `{ applicant_id, step, notif_type, ... }`.
**Manual (re)send** — the goal is resending when the automatic send
failed. Portal ApplicationProgressCard.vue: envelope icon beside the
pencil on the progress card, hidden for Branch Managers, shown only when
the current step (0–4) has a notification type for the applicant's
**saved** state (`notificationType`, different from the post-save map):
0 Screening Failed → `failed_screening`; 1 → `invitation_for_initial_interview`,
or `personal_info_completion` while no initial interview date; 2 Exam On
Process → `invitation_for_examination`, Failed → `failed_examination`;
3 B.I Failed → `failed_examination`; 4 Final On Process →
`invitation_bm_interview`, Failed → `failed_bm_interview`; Orientation /
Hired → none (no envelope). Dialog: channel multi-select EMAIL / SMS
(required); for the three invitation types with EMAIL picked, the same
schedule fields (date, time, venue, facilitator, facilitator position, +
deadline for `invitation_bm_interview`; dates must not be in the past) →
confirm → POST `send-email` and/or `send-sms` `{ applicant_id, step,
notif_type, position (first position preference's name), ...schedule }`.
Gate on `careers-notification-send-email` / `-send-sms` (vueportal) —
the gateway checks the portal's `email-send` / `sms-send`. Show each
channel's own result (the portal hides failures; don't).

SMS needs a valid PH mobile (portal returns 422 otherwise). **Test only on
a throwaway applicant with the user's own phone/email** — the local data is
a production copy. Local portal: M360 keys and Gmail SMTP are configured
(`MAIL_MAILER=smtp` sends for real; `log` only writes the mail log); the
container's 2021 CA bundle can't verify M360's TLS, fixed by
`/usr/local/etc/php/conf.d/zz-cacert.ini` pointing at a current bundle
(lost when the container is re-created). The whole send path was verified
2026-10-02 on test applicant #31896 (all 4 email + 4 SMS received).


**Phase 8 — application-form PDF (built).** Drawer header **Application
Form** button (anyone who can open the applicant, as in the portal) →
`applicationFormPdf.js` (`pdf-lib`, user-approved 2026-10-02) writes the
details onto `public/pdf/application_form.pdf` — a copy of the portal's
`public/pdf/application_form.pdf` (re-copy if HR changes the form) — at
the portal's ApplicantDetailsPDF.vue coordinates. Fixes vs the portal, each
seen on real data: Junior/Senior "High School" with a space (7,932 rows)
and `honors` (portal read `sy_honors`) now print; source boxes match the
stored values (walk-in variants, Print ADS…, Job Fair, INDEED, Addessa FB
Page, Employee Referral + referral code, anything else → Others + text —
the portal's labels never matched and its fallback re-marked civil status);
text "null"/"undefined" prints blank; newest education row per level;
age = computed age when applied; marks are filled dots, not form radio
widgets; long text shrinks to its box (min 5pt) then cuts; characters the
standard font can't encode print as "?". Verified by rendering
(applicants #31896, #29226).
