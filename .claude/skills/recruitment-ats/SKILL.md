---
name: recruitment-ats
description: The Recruitment ATS (applicant tracking) in this app — applicant lists per pipeline stage, applicant details / status workflow / files / notifications / reports, and the Recruitment Setup pages (careers portal Positions, Branches, Job Vacancies). Covers the vueportal → recruitment-portal gateway it runs on, confirmed data contracts, and the gateway's known gaps. Use for any work under src/pages/recruitment/ other than Vacancies, or anything calling /recruitment/* applicant or setup endpoints.
---

# Recruitment ATS

Port of vueportal's `views/recruitment/ApplicantIndex.vue` (+ its
`components/`). Built in phases; this file describes what exists now.

## Area files — read the one for the area you're changing

Sections in this file apply to every change in this module. Area-specific
rules live beside it; **read the matching file before touching that area**
(they are rules, not optional background).

| Touching | Read |
|---|---|
| applicant view actions: status update, files, hiring details, notifications / manual resend, list extras, application-form PDF | `areas/applicant-actions.md` |
| Recruitment Setup: careers Positions / Ranks / Branches / Job Vacancies, Hiring Officers | `areas/recruitment-setup.md` |
| local dev wiring (gateway, .env, tokens) | `areas/local-dev.md` |
| online examination (exam links, results, expiry setting; the separate exam app) | `areas/online-exam.md` |

## How data flows

React → vueportal `/api/recruitment/*` (`RecruitmentController`, gated per
action by `RecruitmentMaintenance` `careers-*` permissions; Administrator
passes all) → recruitment-portal `recruitment_gateway/*`
(`RecruitmentGatewayController`). vueportal logs in as one service account
(credentials in vueportal `.env` `CAREERS_API_*`, token cached 60 min as
`careers_api_token`, retried once on 401) and sends `user_email` + `scope`
(`branch` for an HRIS Branch Manager, else `all`; Administrator always
`all`). **vueportal decides permissions** (`careers-*`); the gateway doesn't
re-check portal permissions. It runs the portal's existing controller method
as: the portal account with the same email when there is one (its Branch
Manager rules always apply — a portal Branch Manager stays branch-scoped
even with `scope` all); otherwise, for `scope` all, the gateway's service
account (full access); refused (403, clear message) for `scope` branch
without a portal account, or when the HRIS says Branch Manager but the portal
account isn't one — a mismatch only narrows. No `scope` (older vueportal) =
the old rule (portal account + portal permission). The portal locks the
gateway to vueportal's account with `HRIS_GATEWAY_EMAIL` (portal `.env`;
unset = any portal Administrator, the old rule). Every accepted change
(status, hiring details, delete, file upload / delete, SMS / email, setup
create / update / delete) is logged by vueportal (`RecruitmentController::audit`)
in the Audit Trail — module Recruitment, records "Applicant / Applicant File
/ Recruitment Setup (careers portal)" with the record id; refusals aren't.
The portal doesn't log gateway requests itself (its `RecruitmentMaintenance`
turns logging off); changes portal staff make in the portal are logged
there and shown on the Audit Trail's Careers portal view
(`activity_logs/careers_audit_trail` → gateway `audit_trail`).
Never print or copy the credentials.

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
  Columns chooser (`useTableColumns`, every column — the stage's `columns`
  shown by default; order / shown saved per stage in localStorage); View
  action opens the drawer.
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

## Phases 3–8

Rules: `applicants/requirements.js` (document types, upload limits,
required files, required personal details, `gatewayMessage` /
`errorMessage` — the gateway/portal answer `{ error: "..." }`,
`{ error: { field: [msg] } }` or `{ warning }`, some with HTTP 200, so
check `success` and don't route these through `handleApiError`).

## Deployment checklist (not done yet)

1. Deploy recruitment-portal's gateway (`dfe7477` + the required-files /
   Resume rules) to production FIRST.
2. vueportal `.env`: restore the production `CAREERS_API_URL` (commented
   line above the local one).
3. Production: `composer dump-autoload`; `php artisan db:seed
   --class=PermissionSeeder`; `php artisan db:seed
   --class=RecruitmentBranchManagerPermissionSeeder`.

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
passes); the gateway doesn't re-check portal permissions (see top). Branch Manager role: seeded by `RecruitmentBranchManagerPermissionSeeder`
to mirror the portal role (all lists except Screening, update status, files,
SMS/email, export; not hiring details / delete). `careers-applicant-delete`
and `careers-export` are new (PermissionSeeder → Administrator). An HRIS
Branch Manager needs a portal Branch Manager account with the same email (its
branch scopes the data; 1 of 74 locally — bm@sanfernando.ac — lacks one);
other users don't need a portal account.

## Still open

- vueportal's own Vue ATS pages still call `/api/job_applicant/export_*` and
  GET `delete_applicant` (never existed on vueportal); only React uses the
  new routes.
