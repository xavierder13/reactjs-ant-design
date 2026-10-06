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
  `/employee_dashboard/summary`, holds the filter state (branch,
  department, position, employment type, date range on a chosen date field
  — `components/workforceFilterQuery.js` maps it to the request) and
  refresh state, marks the current month "(to date)", renders sections —
  current state first (overview, headcount & composition, regularization,
  staffing vs. plan, people moments), then the last 12 months (hires vs.
  separations, attrition, employee relations). Export Report →
  `src/utils/workforceReport.js` (SheetJS, one sheet per section, built from
  the loaded summary so it follows the filters; people moments excluded).
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
  /employees/for-regularization with that permission), `StaffingVsPlan`
  (Branch / Position switch; links to /vacancies with `vacancy-list`),
  `PeopleMoments`, `EmployeeRelations` (By offense / By action switch);
  shared
  `SectionLabel`, `StatTile` (+ `IconBadge`), `ChartCard`, `WorkforceSkeleton`.
- `components/workforceTones.js` — `TONES`: card/tile accent colors by
  meaning (people = series blue, growth = status good, warning, serious,
  critical; voluntary/involuntary = the charts' blue/orange). The accent
  colors only the 3px top bar and the icon badge — values stay in ink, and
  every card has an icon + label, so color never carries meaning alone.
- `components/workforceCharts.jsx` — `CountBarChart`, `ShareBar` (100% bar
  instead of a pie), `MovementBarChart`, `MonthlyCountChart` (generic
  per-month series), `TrendLineChart`; horizontal-bar labels over 28
  characters are shortened on the axis (full name in the tooltip). Palette = the
  dataviz skill's validated reference order (blue, orange, aqua, yellow),
  fixed per entity; grey for Unassigned/Unknown. No dual axes; values written
  on bars. Blue = `BLUE` (`#68a7ff`, the Recruitment Age Group bar blue),
  used by `SERIES[0]` and the people/voluntary tones; orange = `ORANGE`
  (`#f29d7b`, the same 65% lightening) for `SERIES[1]` and the involuntary tone;
  aqua/yellow (`SERIES[2]`/`[3]`) get the same `soften()`. Hires in Hires and
  Separations per Month = `GREEN` (`#7ec062`, the Recruitment hired green lightened). `CountBarChart` takes `colorOf(row)` (reasons colored by type,
  with a legend above). The palette, bar/line styling, scales and value-label
  plugins live in `src/pages/dashboard/chartTheme.js`, shared with the
  Recruitment Dashboard — change the look there so both pages stay uniform.
- Services: `services/dashboard/workforceDashboardApi.js` (contract in its
  header), `services/recruitment/recruitmentApi.js`, count helpers in
  `employeeApi.js` / `nteApi.js` / `disciplinaryApi.js`.

## Access

Route + menu + backend all use `hr-payroll-dashboard` (the vueportal HR /
Payroll dashboard permission; no separate "hr-dashboard" exists). Only roles
holding it see the page.

## Backend (vueportal)

`POST /api/employee_dashboard/summary` `{ branch_id?, department_id?,
employment_type?, position_id?, date_field?, date_from?, date_to? }` —
all applied by `scopeEmployees()` to every employee-based section;
`date_field` ∈ `DATE_FILTER_FIELDS` (Date Employed, Date Resigned, Date of
Regularization, Date of Regularization Interview, Birthday — not the
legacy resignation columns), the range needs all three, zero dates never
match. Staffing honours only branch and position (the page names the
filters that don't apply). `filters.positions` feeds the Position select.
`EmployeeDashboardController` + `EmployeeDashboardService`,
`EmployeeDashboardMaintenance`. Aggregates only, except `moments` (name,
position, branch and upcoming date — never birth year or age).
Current headcount follows `active = 1`; the 12-month trend is rebuilt from
`date_employed` / `date_resigned` (every inactive employee has one).

- **Attrition** (same 12-month window and separation count as the trend):
  reason = the employee's latest `employee_offboardings` row (`MAX(id)`, as
  the Resigned list), "Back out" merged into "Back-out"; no record → "No
  offboarding record". Type: **Involuntary** = the Offboarding form's
  Involuntary group (AWOL, Dismissal/Suspension, Death) plus older stored
  values End of Contract, Dismissal, Due to Suspension, Failed in Training
  Program, Excess Collector; **Other / not specified** = blank, no record;
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
- **Relations**: NTEs (`employee_explanations`) and disciplinary cases
  (`employee_disciplinaries`) by `date_issued` over the 12-month window;
  by month, disciplinary by `offense` (category) / `disciplinary_action`,
  by branch with NTEs per 100 (÷ date-based headcount today, like
  turnover — not the `active` flag). Repeat case = 3+ NTEs. NTE
  `violation` is free text, so it isn't broken down.
- **Staffing vs. plan**: `required_employee_maps` (branch × position,
  quantity > 0, inner-joined to positions like `RecruitmentController@vacancies`)
  vs. active employees in the same branch × position. Short = Σ max(required
  − current, 0) = the Total Vacancies card; fill rate = Σ min(current,
  required) ÷ required. The plan is branch × position → only those two
  filters apply (the page names the others).
- **Moments**: active employees' birthdays / work anniversaries (1+ years)
  in the next `MOMENTS_DAYS` (30); 29 Feb → 28 Feb in non-leap years.

## Data caveats (shown on the page where relevant)

- Current month is month-to-date; late-recorded resignations lower recent
  months' separations.
- A few active employees carry a past `date_resigned` → the rebuilt trend's
  last headcount is lower than the active count; the page reports how many.
- Ages outside 15–80 are treated as unknown (bad birth dates).
- Education is excluded: `educ_attain` is free text (130+ spellings).
- Local dev DB (Sep 2026): only ~600 employees are `active = 1` while
  ~2,300 have no `date_resigned` — the active flag looks wrong for most
  staff there, which inflates Short and lowers Fill Rate. Check the flag
  before trusting those numbers on a copied DB.

## Known issues — fix next

Found by the phase 2–3 code review and integration test (all 5 integration
checks passed; nothing blocking). Verify each against the code, fix, then
delete it from this list.

1. **MEDIUM — Regularization doesn't use the card's rule**
   (`vueportal` `EmployeeDashboardService::regularization`, ~line 326–333).
   The For Regularization card/list
   (`EmployeeMasterDataController::forRegularizationQuery`, ~line 375) counts
   `DATEDIFF(NOW(), date_employed) >= 150` and, via `f.name <> 'Sales
   Specialist'` on a left join, drops employees with **no position**. The
   service instead uses `employed + 6 months <= today + 30` (≈ 151–154 days)
   and keeps null positions, so "overdue + due soon = card" only holds by
   coincidence. Fix: due soon = not overdue and `diffInDays(today) >= 150`;
   exclude null/blank positions; update the "Regularization" rule above and
   the tile sub-text in `RegularizationStatus.jsx` ("Due within 30 days").
2. **LOW — Month overflow**: `addMonths(self::PROBATION_MONTHS)` (service
   ~lines 227 and 332) overflows for hires on the 29th–31st (Aug 31 → Mar 3).
   Use `addMonthsNoOverflow(...)`.
3. **LOW — Export label can mismatch the data**:
   `WorkforceDashboardPage.jsx` `exportReport` builds the "Filter" label from
   current `filters`, but after a failed refetch `dashboard` still holds the
   previous filter's numbers. Store the filters used with the loaded
   dashboard (set both on success) and label from those.
4. **LOW — Numeric group labels break sorting**: PHP turns a numeric-string
   `groupBy` key into an int, so `a.label.localeCompare` throws in
   `TurnoverTable.jsx`, `StaffingVsPlan.jsx`, `EmployeeRelations.jsx`. Use
   `String(a.label).localeCompare(String(b.label))`.
5. **INFO — Contract comment**: `services/dashboard/workforceDashboardApi.js`
   header doesn't list `relations`, `staffing`, `moments` — add them.

Re-verify after fixing: overdue + due soon = For Regularization card for
every branch and department (the integration test looped all 90 branches /
28 departments via the API), lint, build, and a browser check.

## Phases

1. Built: overview cards, headcount & composition, hires vs. separations.
2. Built: attrition by type/reason, early attrition, turnover by
   branch/department/position, regularization overdue/due soon by branch.
3. Built: employee relations trends, staffing vs. plan, people moments,
   Excel export.
