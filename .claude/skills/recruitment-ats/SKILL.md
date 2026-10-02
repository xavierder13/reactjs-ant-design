---
name: recruitment-ats
description: The Recruitment ATS (applicant tracking) in this app — applicant lists per pipeline stage, and the planned applicant details / status workflow / files / notifications / reports. Covers the vueportal → recruitment-portal gateway it runs on, confirmed data contracts, and the gateway's known gaps. Use for any work under src/pages/recruitment/ other than Vacancies, or anything calling /recruitment/* applicant endpoints.
---

# Recruitment ATS

Port of vueportal's `views/recruitment/ApplicantIndex.vue` (+ its
`components/`). Built in phases; this file describes what exists now.

## How data flows

React → vueportal `/api/recruitment/*` (`RecruitmentController`, gated per
action by `RecruitmentMaintenance` `careers-*` permissions; Administrator
passes all) → recruitment-portal `recruitment_gateway/*`
(`RecruitmentGatewayController`). vueportal logs in as one service account
(credentials in vueportal `.env` `CAREERS_API_*`, token cached 60 min as
`careers_api_token`, retried once on 401) and sends `user_email`. The
gateway resolves that email to the portal's own user, checks that user's
portal permission (`jobapplicants-*`, `sms-send`, `email-send` — same map
as the portal's own middleware) and runs the portal's existing controller
method **as that user**, so the portal's rules and Branch Manager scoping
apply. No portal account for the email → 403 with a clear message. Never
print or copy the credentials.

Development: vueportal's `CAREERS_API_URL` points at the local portal
(`http://recruitment_nginx/api`, docker `shared_network`), loaded from a
production dump — the gateway changes aren't on production yet. With real
M360 / mail credentials in the local portal's `.env`, notifications reach
real applicants: test them only on a throwaway applicant.

## Pipeline model (confirmed from recruitment-portal)

One `applicants` row per application, one status column per stage:
`status` (Screening), `initial_interview_status`, `iq_status` (Exam),
`bi_status` (B.I & Basic Req), `final_interview_status`,
`orientation_status`. Values: 0 On Process, 1 Passed, 2 Failed / Not
Qualified, 3 Non-Compliant, 4 Reserved, null = not reached. Hired = passed
orientation + `signing_of_contract_date`. Rows also carry
`progress_status`, a ready label (SQL CASE in `all_job_applicants()`).

## Source of truth (user-decided, 2026-10-01)

recruitment-portal's **current** code (its own `resources/js/views/recruitment/`
pages + `ApplicantController`) is the reference for every rule — not
vueportal's copies, which are older and drift (e.g. vueportal blocks Branch
Managers on steps 4–5, the portal on 1, 4, 5; the portal dropped TIN from the
final-interview files and the profile-completeness check). When the gateway
lacks something, add the missing procedure to `RecruitmentGatewayController`
(delegate to the portal's own method as the user) rather than re-implementing
it. Don't change recruitment-portal's age handling (the stored `age` is the
age when they applied; React computes it — see Phase 2).

## Phase 1 — applicant lists (built, committed 69fa7b4)

- `applicants/stages.js` — `APPLICANT_STAGES`: key/path, gateway `api`,
  title, `careers-*-list` permission, default columns (portal
  ApplicantDataTable), `dates` / `dateField` (date-filter options per stage,
  from `DATE_FIELDS`). AppRoutes registers one route per stage with its own
  permission; MainLayout titleMap + menu (incl. Hired) come from it.
- `JobApplicantList.jsx` (`stageKey`) — loads the full list once
  (`recruitmentApi.getApplicants(api)`, GET; no server paging), filters in
  memory: search, status filter **buttons** with live counts, Stage filter
  (All Applicants only; portal rule: stage name contained in
  `progress_status`), date filter with a per-stage date field, branch
  (hidden for the Branch Manager role — the gateway scopes them), position;
  ColumnSelector (max 12); View action opens the drawer.
- `applicants/applicantStatus.js` — STATUS_FILTERS (any stage has the value;
  Reserved also needs no Failed), `progressColorOf` / `progressTagProps`
  (portal applicationProgress colours by furthest stage passed — orange
  screening, purple, teal, lime, cyan, dark grey, green hired, indigo
  reserved, red failed/non-compliant; Reserved at Initial Interview / Exam /
  B.I counts as passed so the colour matches the label), STAGE_FILTERS,
  `isoFromDisplay` (gateway dates are `MM/DD/YYYY`), `ageFromBirthdate`.
- Response: `{ job_applicants, branches, positions, branch_companies }`;
  preferences are comma ids (named via branches/positions); branch_complied /
  employment_* / hiring_officer_position are names. Sizes (local copy of
  production, 2026-10-01): All 8,539, Screening 3,150, Initial Interview
  2,571, Exam 327, BI 85, Final 49, Orientation 22, Hired 2,261.

## Phase 2 — applicant view (built, committed 69fa7b4)

`applicants/ApplicantDrawer.jsx` — `view_applicant/{id}` → (no stage-chip bar —
removed as a duplicate of the progress timeline; `stageProgress.js`:
PIPELINE, `currentStep` = portal currentProgress, `stepState` colours),
tabs: Personal Information (grouped cards, labels
above values: Basic / Contact & Address / Government IDs / Education &
Application, then education, family, dependents), Work Experience,
References, Files (Phase 5, `ApplicantFilesTab.jsx`);
right: Application Progress timeline. Stage dates here are `YYYY-MM-DD`;
`birthdate` / `date_submitted` are `MM/DD/YYYY`. **Age When Applied** =
`ageFromBirthdate(birthdate, date_applied || date_submitted)` — the stored
`age` comes from the browser and can be wrong; under 18 → "Check birthday"
tag (mistyped birthdays, e.g. the current year — ~117 applicants).
The progress timeline's current on-process step carries the Phase 3
**Update Status** button.

## Phases 3–8 (built; not committed yet)

Rules: `applicants/requirements.js` (document types, upload limits,
required files, required personal details, `gatewayMessage` /
`errorMessage` — the gateway/portal answer `{ error: "..." }`,
`{ error: { field: [msg] } }` or `{ warning }`, some with HTTP 200, so
check `success` and don't route these through `handleApiError`).

**Phase 3 — status update.** `StatusUpdateModal.jsx` mode `status`, opened
from the **Update Status** button on the current on-process step of the
Application Progress timeline (`careers-update-status`; a Branch Manager
not while the current step is 1, 4 or 5 — they see a lock note there
instead). Shows only that step's
fields; POST `update_status { applicant_id, step, ...step fields }`
(dates `YYYY-MM-DD`, preferences comma-joined, `*_remarks` built from the
Non-Compliant reason picker). Confirm → save → drawer reloads, list row
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
  employment position/branch, hiring officer position (fixed list) and
  name, and the final files (`finalRequiredFiles`: Background
  Investigation, Final Interview Result, Birth Certificate, Police
  Clearance, Diploma or Certification, Health Declaration, SSS, Pag-IBIG,
  PhilHealth, + Driver's License for Logistics Driver / C.I Collector /
  Technician). Non-Compliant → reason (Hired in other organization / Back
  out due to Training / Others (Specify)).
- 5 Orientation: both dates required > 0; status disabled until the
  orientation date; Non-Compliant → reason.
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
portal branch. Front Page reports need the user's portal permission
(`sourcing-report` etc.) — `bm@agoo.ac` lacks them and gets a clear 403.

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

## Remaining phases

**Phase 9 (optional) — live refresh** (portal uses a websocket on
`applicant-submit`) — but the portal's application form has that emit
commented out (`ApplicationForm.vue` `// this.$socket.emit("sendData", {
action: "applicant-submit" })`), so nothing fires it. Options put to the
user: skip (lists have Refresh) or poll the open list every few minutes.

## Deployment checklist (not done yet)

1. Deploy recruitment-portal's gateway (`dfe7477` + the required-files /
   Resume rules) to production FIRST.
2. vueportal `.env`: restore the production `CAREERS_API_URL` (commented
   line above the local one).
3. Production: `composer dump-autoload`; `php artisan db:seed
   --class=PermissionSeeder`; `php artisan db:seed
   --class=RecruitmentBranchManagerPermissionSeeder`.

## Local development setup (how it's wired now)

- Local portal containers `recruitment_app` / `recruitment_nginx` /
  `recruitment_db` (repo's docker-compose; nginx :8090), DB restored from
  `C:\Users\User\Downloads\recruitment-portal-live(1).sql` (production
  export 2026-10-01). `recruitment_nginx` was attached to docker
  `shared_network` (`docker network connect shared_network
  recruitment_nginx`) — redo after a container re-create.
- vueportal `.env` `CAREERS_API_URL=http://recruitment_nginx/api`.
- Local portal: `MAIL_MAILER=log`, M360 keys empty until the user adds them.
- Uploads need `public/wysiwyg` writable in the portal container; portal
  `npm run dev` rewrites the tracked `public/mix-manifest.json` — restore it.

## Rules enforced by the gateway beyond the portal's own controllers

The portal's UI applied these client-side only; the gateway enforces them:
Branch Managers can't update steps 1, 4, 5 (Initial Interview, Final
Interview, Orientation); exports always use a Branch Manager's own branch;
`update_status` / `update_hiring_details` refuse
Exam / Final Interview "Passed" while that step is on process and the
required files are missing (422, `missingRequiredFiles`); applicant files
can't be deleted once `final_interview_status` = 1, and the Resume never.

## Permissions

vueportal `careers-*` gate each route (RecruitmentMaintenance; Administrator
passes); the gateway also checks the matching portal permission for the
user. Branch Manager role: seeded by `RecruitmentBranchManagerPermissionSeeder`
to mirror the portal role (all lists except Screening, update status, files,
SMS/email, export; not hiring details / delete). `careers-applicant-delete`
and `careers-export` are new (PermissionSeeder → Administrator). A user needs
a portal account with the same email (1 of 74 vueportal Branch Managers
lacks one).

## Still open

- vueportal's own Vue ATS pages still call `/api/job_applicant/export_*` and
  GET `delete_applicant` (never existed on vueportal); only React uses the
  new routes.
