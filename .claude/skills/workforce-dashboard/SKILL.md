---
name: workforce-dashboard
description: The Workforce Dashboard (/workforce-dashboard) — HR analytics over Employee Master Data, its backend contract (vueportal employee_dashboard/summary), data caveats and the phase plan. Use when changing or extending that page, or adding a new analytics section to it.
---

# Workforce Dashboard

HR analytics page, separate from the Recruitment Dashboard (`/dashboard`,
`DashboardPage.jsx`) — one page per audience, not tabs. Both sit under the
**Dashboards** menu group; `/dashboard` stays the recruitment page because
login lands there (`GuestRoute`).

## Files

Same shape as the Recruitment Dashboard: a thin page + one component per section.

- `src/pages/dashboard/workforce/WorkforceDashboardPage.jsx` — loads
  `/employee_dashboard/summary`, holds the branch/department filter and
  refresh state, marks the current month "(to date)", renders sections.
- `components/` — `WorkforceOverviewCards` (vueportal HR / Payroll dashboard
  cards + Resigned This Month; each calls the same endpoint as the Vue card,
  shown only with that endpoint's permission, Administrator always;
  company-wide, neutral `table_headers: []`; each card opens its list page —
  /employees, /employees/hired-this-month, /for-regularization, /resigned, /nte,
  /disciplinary, /vacancies — whose total matches the card; Total Employees is
  clickable only with `employee-master-data-list`), `WorkforceFilters`,
  `HeadcountSummary`, `WorkforceMix`, `HeadcountBreakdown`, `AgeAndTenure`,
  `MovementSummary`, `MovementCharts` (+ `MonthlyFiguresTable`), `DataNotes`,
  `AttritionSummary`, `AttritionCharts`, `TurnoverTable` (Branch /
  Department / Position switch), `RegularizationStatus` (links to
  /employees/for-regularization with that permission); shared
  `SectionLabel`, `StatTile` (+ `IconBadge`), `ChartCard`, `WorkforceSkeleton`.
- `components/workforceTones.js` — `TONES`: card/tile accent colors by
  meaning (people = series blue, growth = status good, warning, serious,
  critical; voluntary/involuntary = the charts' blue/orange). The accent
  colors only the 3px top bar and the icon badge — values stay in ink, and
  every card has an icon + label, so color never carries meaning alone.
- `components/workforceCharts.jsx` — `CountBarChart`, `ShareBar` (100% bar
  instead of a pie), `MovementBarChart`, `TrendLineChart`. Palette = the
  dataviz skill's validated reference order (blue, orange, aqua, yellow),
  fixed per entity; grey for Unassigned/Unknown. No dual axes; values written
  on bars. `CountBarChart` takes `colorOf(row)` (reasons colored by type,
  with a legend above).
- Services: `services/dashboard/workforceDashboardApi.js` (contract in its
  header), `services/recruitment/recruitmentApi.js`, count helpers in
  `employeeApi.js` / `nteApi.js` / `disciplinaryApi.js`.

## Access

Route + menu + backend all use `hr-payroll-dashboard` (the vueportal HR /
Payroll dashboard permission; no separate "hr-dashboard" exists). Only roles
holding it see the page.

## Backend (vueportal)

`POST /api/employee_dashboard/summary` `{ branch_id?, department_id? }` —
`EmployeeDashboardController` + `EmployeeDashboardService`,
`EmployeeDashboardMaintenance`. Aggregates only; never returns employee rows.
Current headcount follows `active = 1`; the 12-month trend is rebuilt from
`date_employed` / `date_resigned` (every inactive employee has one).

- **Attrition** (same 12-month window and separation count as the trend):
  reason = the employee's latest `employee_offboardings` row (`MAX(id)`, as
  the Resigned list), "Back out" merged into "Back-out"; no record → "No
  offboarding record". Type: **Involuntary** = End of Contract, AWOL,
  Dismissal, Due to Suspension, Failed in Training Program, Excess
  Collector; **Other / not specified** = Death, blank, no record;
  **Voluntary** = every other reason (incl. Back-out). Decided with the
  user — change the lists in `EmployeeDashboardService`, not the frontend.
- **Early attrition** = left before `PROBATION_MONTHS` (6) after hire.
- **Turnover by branch / department / position** = separations ÷ avg of the
  group's headcount at the window start and today, grouped by the
  employee's *current* record (no assignment history exists).
- **Regularization**: active Probationary, Sales Specialists excluded — the
  For Regularization list/card population. Overdue = past 6 months; due
  soon = reaches 6 months within `REGULARIZATION_DUE_DAYS` (30). Overdue +
  due soon equals the For Regularization card (its ≥ 150-day rule).

## Data caveats (shown on the page where relevant)

- Current month is month-to-date; late-recorded resignations lower recent
  months' separations.
- A few active employees carry a past `date_resigned` → the rebuilt trend's
  last headcount is lower than the active count; the page reports how many.
- Ages outside 15–80 are treated as unknown (bad birth dates).
- Education is excluded: `educ_attain` is free text (130+ spellings).

## Phases

1. Built: overview cards, headcount & composition, hires vs. separations.
2. Built: attrition by type/reason, early attrition, turnover by
   branch/department/position, regularization overdue/due soon by branch.
3. Next: employee relations trends, staffing vs. plan
   (`required_employee_maps`), people moments, Excel export.
