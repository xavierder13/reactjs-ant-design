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

`applicants/ApplicantDrawer.jsx` — `view_applicant/{id}` → stage chips
(`stageProgress.js`: PIPELINE, `currentStep` = portal currentProgress,
`stepState` chip colours), tabs: Personal Information (grouped cards, labels
above values: Basic / Contact & Address / Government IDs / Education &
Application, then education, family, dependents), Work Experience,
References, Files (read-only list + download, `careers-file-download`);
right: Application Progress timeline. Stage dates here are `YYYY-MM-DD`;
`birthdate` / `date_submitted` are `MM/DD/YYYY`. **Age When Applied** =
`ageFromBirthdate(birthdate, date_applied || date_submitted)` — the stored
`age` comes from the browser and can be wrong; under 18 → "Check birthday"
tag (mistyped birthdays, e.g. the current year — ~117 applicants).
`StageChips` takes `onStepClick` (Phase 3): only the current on-process
chip is clickable.

## Remaining phases (portal rules to apply — read before building)

**Phase 3 — status update by clicking the current chip** (+ Phase 5, files
are a prerequisite for "Passed"). Portal `ApplicationProgressDialog.vue`.
`POST /recruitment/update_status` `{ applicant_id, step, ...step fields }`
(gateway: `jobapplicants-change-status`; Branch Managers refused on steps
1, 4, 5). Status options 0 On Process, 1 Passed, 2 Failed, 3 Non-Compliant,
4 Reserved. Per step:
- 0 Screening: `status`, `screening_date` (required when status > 0 only
  for users with update-hiring-details).
- 1 Initial Interview: `initial_interview_date` (required when status = 1),
  `initial_interview_status`; on Passed `position_preference` +
  `branch_preference` (multi-select, sent comma-joined) required.
- 2 Exam: `branch_id_complied`, `iq_status`, `iq_date` (required > 0); Passed
  requires an applicant file titled **Exam**.
- 3 B.I & Basic Req: `bi_status`, `bi_date` (required > 0).
- 4 Final Interview: `final_interview_date` (required > 0),
  `final_interview_status`; on Passed `employment_position`,
  `employment_branch`, `hiring_officer_position` (one of: HR Director,
  General Manager, HR Division Manager, Recruitment Manager, Immediate
  Division Manager, Immediate Department Manager, Branch Manager, Immediate
  Branch Supervisor, Recruitment Staff), `hiring_officer_name`, and files:
  Background Investigation, Final Interview Result, Birth Certificate,
  Police Clearance, Diploma or Certification, Health Declaration, SSS,
  Pag-IBIG, PhilHealth (+ Driver's License when the employment position is
  Logistics Driver / C.I Collector / Technician). Non-Compliant → reason
  (Hired in other organization / Back out due to Training / Others
  (Specify)) → `final_interview_remarks`.
- 5 Orientation: `orientation_date`, `signing_of_contract_date` (both
  required > 0), `orientation_status`; Non-Compliant → reason →
  `orientation_remarks`.
- Confirm before saving; the response's `applicant` replaces the row.

**Phase 4 — notifications** (after a successful save; portal sends SMS via
M360 and email via Laravel mail templates). `notif_type` by step/status:
0 Passed `personal_info_completion`, 0 Failed `failed_screening`; 1 On
Process with a date `invitation_for_initial_interview`, 1 Passed
`invitation_for_examination`, 1 Failed `failed_initial_interview`; 2 Failed
`failed_examination`; 3 Passed `invitation_bm_interview`, 3 Failed
`failed_examination`; 4 Failed `failed_bm_interview`. Invitations first ask
date, time (8:00 AM–5:00 PM, 30-min), venue, facilitator, facilitator
position (+ deadline date for `invitation_bm_interview`); email payload also
carries `position` (first position preference). Then "Send notification?" →
`POST send-email` then `send-sms` `{ applicant_id, step, notif_type, ... }`.
Also the manual Send Notification (envelope) on the progress card. SMS needs
a valid PH mobile (portal returns 422 otherwise). **Test only on a throwaway
applicant with the user's own phone/email** once real M360 / Gmail
credentials are in the local portal `.env` — the data is a production copy.

**Phase 5 — applicant files**: upload `POST file_upload` (multipart:
applicant_id, document_type, file ≤ 20MB jpeg/jpg/png/docs/docx/pdf;
vueportal returns 422 on validation), types: Exam, Background
Investigation, Diploma or Certification, Copy of Grades, Birth Certificate,
Police Clearance, Health Declaration, SSS, Pag-IBIG, PhilHealth, TIN,
Driver's License, Drive Test Result, Final Interview Result, Others;
delete `POST file_delete { file_id }` (blocked after Final Interview
passed); list `GET file_list/{id}`.

**Phase 6 — edit hiring details**: progress-card pencil →
`update_hiring_details` (all step fields; `careers-update-hiring-details`,
Administrator only in both systems).

**Phase 7 — list extras** (portal ApplicantDataTable): "Incomplete Details"
icon (screening passed + missing required details / education / references,
via `POST secondary_details { id: [...] }`) and "Incomplete Requirements"
icon (final interview on process + missing final files); stage lists default
to status **On Process** (portal locks it; All/Hired don't); Delete applicant
(`POST delete_applicant/{id}`, `careers-applicant-delete`); Export dialog →
`POST export/{report}` (applicants, total_count, sourcing, recruitment,
hiring, signing_contract; Branch Managers' branch locked; gateway checks
each report's portal permission).

**Phase 8 — application-form PDF** (portal fills `/pdf/application_form.pdf`
with pdf-lib in the browser) — needs the user's OK to add `pdf-lib`.

**Phase 9 (optional) — live refresh** (portal uses a websocket on
`applicant-submit`); ask the user.

## Deployment checklist (not done yet)

1. Deploy recruitment-portal `dfe7477` (gateway) to production FIRST.
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
Interview, Orientation); applicant files can't be deleted once
`final_interview_status` = 1.

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
