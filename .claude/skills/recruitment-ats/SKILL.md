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

## Phase 1 — applicant lists (built)

- `applicants/stages.js` — `APPLICANT_STAGES`: key/path, gateway `api`,
  title, `careers-*-list` permission, default columns (from
  ApplicantDataTable.vue). AppRoutes registers one route per stage with its
  own permission; MainLayout's titleMap is generated from it; the menu has
  an item per stage incl. Hired.
- `JobApplicantList.jsx` (`stageKey` prop) — loads the full list once
  (`recruitmentApi.getApplicants(api)`, GET; no server paging), filters in
  memory: search, status Segmented with live counts, branch, position,
  date submitted; ColumnSelector (max 12) over all columns.
- `applicants/applicantStatus.js` — STATUS_FILTERS (Vue's rule: a row
  matches when ANY stage has the value; Reserved also needs no Failed),
  `progressColor`, `isoFromDisplay` (gateway dates are `MM/DD/YYYY`
  strings; dayjs has no customParseFormat loaded here).
- Response: `{ job_applicants, branches, positions, branch_companies }`.
  `position_preference` / `branch_preference` are comma-separated ids
  (mapped to names via `positions` / `branches`); `branch_complied`,
  `employment_branch`, `employment_position`, `hiring_officer_position`
  are names. Live sizes (Administrator, 2026-10-01): All 8,538, Screening
  3,149, Initial Interview 2,571, Exam 327, BI 85, Final 49, Orientation 22.
- Stage counts are computed client-side from the loaded rows on purpose:
  `get_all_status_count` runs as the service account (not via the
  gateway), so it isn't scoped to the viewer.

## Phase 2 — applicant view (built)

`applicants/ApplicantDrawer.jsx`, opened by each list row's View action:
`view_applicant/{id}` → stage chips (`stageProgress.js`: PIPELINE, the
portal's currentProgress / chip colours), tabs Personal Information
(+ education, family, dependents) / Work Experience / References / Files
(download, `careers-file-download`), and a per-step progress summary. In
this response stage dates are `YYYY-MM-DD`, but `birthdate` /
`date_submitted` are `MM/DD/YYYY` strings; preferences are comma ids
(named via the list's branches/positions). Chips take `onStepClick` for
Phase 3 (only the current on-process step is clickable).

## Planned phases

2 applicant details (`view_applicant/{id}` → `{ success, applicant,
educ_attains, experiences, references, fam_members, dependents,
applicant_files, file }`; vueportal gates it on `vacancy-list`) ·
3 status workflow (`update_status` with `step` 0–5 + that step's fields;
`update_hiring_details` for `careers-update-hiring-details`) · 4 files
(`file_list/{id}`, `file_upload` [applicant_id, document_type, file ≤20MB
jpeg/jpg/png/docs/docx/pdf], `file_delete`, `file_download`) ·
5 SMS/email (`send-sms`, `send-email`) · 6 reports (needs new vueportal
proxy routes) · 7 application-form PDF (vueportal uses pdf-lib — a new
dependency here; ask first).

## Rules enforced by the gateway beyond the portal's own controllers

The portal's UI applied these client-side only; the gateway enforces them:
Branch Managers can't update steps 1, 4, 5 (Initial Interview, Final
Interview, Orientation); applicant files can't be deleted once
`final_interview_status` = 1.

## Still open

- vueportal's own Vue ATS pages still call `/api/job_applicant/export_*` for
  reports (never existed on vueportal) — the gateway now offers
  `export/{report}` via vueportal; only the React side uses it.
- New vueportal permissions `careers-applicant-delete`, `careers-export`
  (seeded to Administrator).
