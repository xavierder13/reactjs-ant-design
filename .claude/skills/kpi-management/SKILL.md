---
name: kpi-management
description: KPI Management pages (/kpi-templates, /kpi-evaluations, /my-evaluations) — templates, evaluations (self + supervisor), grading sections, approval, print, and the employee self-evaluation portal. Use before changing any file under src/pages/kpi, the KPI services/stores, or KPI menu/route entries.
---

# KPI Management (frontend)

Backend: vueportal `KpiEvaluationController` & co. — **read vueportal's
`kpi-management` skill for the workflow, scoring and authorization rules**;
this file covers the React side. KPI uses **REST verbs** (GET/POST/PUT/
DELETE), unlike Manpower Request's POST-only API.

## Files

- Pages `src/pages/kpi/`:
  - `templates/` — `KpiTemplateIndex` (list, deactivate), `KpiTemplateForm`
    (shared create/edit: items + optional demerit items, total-weight
    indicator), `CreateKpiTemplate`/`EditKpiTemplate` (thin wrappers),
    `KpiTemplateItemRow`, `KpiDemeritItemRow`.
  - `evaluations/` — `KpiEvaluationIndex`, `KpiEvaluationCreate` (single or
    bulk via `EmployeeBulkSelector`, shows created/skipped),
    `KpiEvaluationView` (tabs + every workflow action), sections
    `JobPerformanceSection`, `BehaviorRatingSection`, `DemeritSection`,
    `ScoreSummary`, `KpiEvaluationPrint` (+ `.css`), and `kpiScore.js` —
    the backend's score formula (frozen `itemWeight`, `maxDeduction`,
    `finalBehaviorRating`, `computeScores` with demerit cap + 0–100 clamp),
    used by the summary, sections and print so they match `final_score`.
  - `my-evaluations/` — `KpiMyEvaluationIndex`, `KpiMyEvaluationForm`
    (employee self-grades; read-only once past `draft`).
- Services: `src/services/kpi/kpiTemplateApi.js`, `kpiEvaluationApi.js`
  (evaluations, employees, my-evaluations, `saveApproverRatings`). Stores: `kpiTemplateStore.js`, `kpiEvaluationStore.js`.
- Not in the UI: KPI settings (weights), reports, behavior-criteria list,
  single template-item endpoints.

## Routes & menu

`AppRoutes.jsx` `permissionRoutes` + `MainLayout.jsx` (`menuData` group "KPI
Management", `titleMap`, regex cases for `:id` pages):

| Path | Permission |
|---|---|
| `/kpi-templates` | `kpi-template-list` |
| `/kpi-templates/create` | `kpi-template-create` |
| `/kpi-templates/:id/edit` | `kpi-template-edit` |
| `/kpi-evaluations`, `/kpi-evaluations/:id` | `kpi-evaluation-list` |
| `/kpi-evaluations/create` | `kpi-evaluation-create` |
| `/kpi-evaluations/:id/print` | `kpi-evaluation-print` |
| `/kpi-reports/consolidated` | `kpi-report-view` (menu KPI Management → Reports) |
| `/my-evaluations` | `kpi-self-evaluation-list` |
| `/my-evaluations/:id` | `kpi-self-evaluation-create` or `-edit` |

- Role `KPI Self Evaluation`: `SmartRedirect` sends them to
  `/my-evaluations`; `MainLayout`'s `isEmployeeOnly` (that role without
  `hr-payroll-dashboard`) shows a one-item menu. These accounts are created
  by the backend (`<employee_code>@hr_evaluation.ac`) when a `self`
  evaluation is created.

## Consolidated Report (`src/pages/kpi/reports/`)

- `KpiConsolidatedReport.jsx`: Generate by evaluation period
  (`kpiReportApi.getConsolidated`, approved only); then, client-side:
  positions (multi) and branch filters — options come from the report
  data, not the positions/branches modules (a KPI-only user may lack their
  permissions); layout Summary (per position) / Detailed (per position
  table, one row per employee, Average row); per section Hide / Total /
  Breakdown; **Group by branch** (one block per branch).
- `kpiReportLayout.js`: pure builders (`buildSummary`, `buildDetailed`,
  `summaryColumns`, `filterRows`, `formatValue`) shared by the page and
  `src/utils/kpiConsolidatedReport.js` (SheetJS: Report Info sheet, then
  Summary (+ component / demerit average sheets) or one sheet per
  [branch –] position) — screen, print and Excel always match. Job /
  demerit breakdowns differ per position, so in Summary they're an
  expanded list per position (and extra sheets), not columns.
- Print: `window.print()` with `KpiConsolidatedReport.css` — hides the app
  chrome and controls (`.no-print`), A4 landscape, each branch block starts
  a new page.

## Evaluation list (`KpiEvaluationIndex.jsx`)

Search, status, **position** and **branch** filters (in-memory; options
from the loaded evaluations — the list endpoint includes
`employee.branch`).

## Evaluation view — action gates (`KpiEvaluationView.jsx`)

Every KPI permission check is written `isAdmin || hasPermission(...)`
(`isAdmin = hasRole('Administrator')`) — the Administrator can do every
action; the backend's `KpiMaintenance` and controllers bypass it too
(verified with all KPI permissions removed from the Administrator role).


- `canEdit` (grade inputs + **Compute Grades**): `kpi-evaluation-create` or
  `-edit`, and status `draft`/`rejected` (supervisor type) or
  `self`/`rejected` (self type).
- `canSubmit` (**Mark as Submitted**, with client-side "all grades/ratings
  filled" check): same permissions, status `draft` (supervisor) / `self`
  (self) — not `rejected`.
- **Approve / Reject**: `can_approve` from `GET evaluations/{id}` (= the
  `kpi-evaluation-approve` permission) and status `submitted`; reject opens
  a reason modal. Supervisor type: `canApproverRate` (same + type
  `supervisor`) makes the Approver Rating column editable, and Approve warns
  until every criterion has a saved approver rating (backend enforces it).
- **Resubmit**: status `rejected` + create/edit permission (backend also
  requires the creator).
- **Revert** buttons: `hasRole('Administrator')` only — self type: "Revert
  Self Grades" in `self`; "Revert Supervisor Grades"/"Revert All" in
  `submitted`/`approved`; supervisor type: "Revert Rating".
- Print button: `kpi-evaluation-print`.
- The backend enforces the same rules (`KpiMaintenance` + per-record 404);
  keep these gates in sync with it. After submit/approve/resubmit the page
  takes the evaluation from the response (fresh `final_score`).

## Grading sections

Each section saves via `PUT /kpi/evaluations/{id}` with only its own part
(`items`, `behavior_ratings` or `demerit_ratings`):

- `JobPerformanceSection`: per item `actual_grade` 0–100 with the frozen
  weight; a blank grade is sent as `null` (stays unfilled — submit then
  reports it). No `weight` in the payload (the backend uses its own).
- `BehaviorRatingSection`: AntD `Rate` 1–5 per criterion. Supervisor type:
  Evaluator Rating | Approver Rating | Final Rating (average) columns; the
  approver saves via **Save Approver Ratings** (`approver-ratings`).
- `DemeritSection`: deductions per demerit item, per-item max =
  frozen `max_deduction`; total cap = the evaluation's `max_demerit`
  (`show()`'s `template`).
- `ScoreSummary`: `computeScores()` — same as the stored `final_score`
  (plus an "Estimated Final Grade" from self grades on the self tab).
- Print: Supervisor type shows Evaluator / Approver / Final columns to
  approvers and the Administrator only.
- Approver + Final Rating columns show only once the evaluator's rating is
  done (status `submitted`/`approved` — `evaluatorDone` prop; same on the
  print page) — the Administrator also sees them before that, read-only
  with "Available once the evaluator submits" — and only when `show()`'s
  `can_view_approver_rating` is true (the backend hides `approver_rating`
  from others). Those other viewers get the stored `final_score` on an
  approved Supervisor-type evaluation (`computeScores(…, { useStoredFinal })`),
  since it includes approver ratings they can't see.
- `my-evaluations/` (employee): only their self grades/ratings plus the
  final grade — shown once approved ("Pending" until then; an estimate from
  self grades while a self-type evaluation is still `draft`). No supervisor
  or approver columns (the backend doesn't send them), and no rejection
  details at all — the page never renders a rejection block, even if a
  value were sent (a rejected evaluation shows only its "Rejected" tag).
- Self type shows a "Self Evaluation" tab (employee's grades, read-only)
  next to the supervisor tab.

## Known issues

Fixed 2026-09-30: blank grades saved as 0, client weight in the payload,
summary not matching the stored score, duplicate `approve` in the API file.
Remaining: the self tab's demerit block checks `position.template` (never
loaded), so it doesn't show — fine, since employees don't rate demerits.

## Conventions

Follow this repo's CLAUDE.md (Zustand store + hook, `handleApiError`,
`App.useApp()` message — the KPI evaluation pages already use it, row action
colors). Verify with `docker exec rbac-react-dev npm run lint` / `npm run
build`; judge only new lint problems.
