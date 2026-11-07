# Manpower Request (frontend) — per-line status, aging, time to fill

Part of the `manpower-request` skill; read `SKILL.md` first (cross-cutting rules).

## Per-line Status / Aging, Time to Fill

- Each detail line shows a derived `Status` tag: `Open` while it has no
  hires, `Closed` once it has at least one (user-confirmed direction).
  `Aging` (days from `record.date_approved` to today) shows only while
  `Open`.
- **Time to Fill** = `date_approved` → each hire's `date_hired`, one value
  per **hire**. Used per hire in `ViewManpowerRequest.jsx` and in
  `DashboardPage.jsx`'s section (Recruitment KPI 4, computed by
  `dashboard/recruitment/timeToFill.js`): Σ days ÷ positions filled, for
  hires dated within the dashboard's date range, against the Standard Time
  To Fill by position rank — RF 25 / SUP 45 / MGR 60 days (Top Management
  uses 60); by-rank table with % within standard, by-position chart,
  by-hire-month trend, filled-positions table. The rank comes from
  `details.position.rank` (in `detailEagerLoads()`); a position without a
  rank gets no standard and a warning. MRFs without `date_approved`, hires
  without `date_hired`, and hires dated before approval (warned) are
  excluded. Follows the dashboard's date range, Branch and Position (by
  name); Source/Stage/Gender are applicant-only.
- **Hiring Efficiency** (Recruitment KPI 5, `dashboard/recruitment/hiringEfficiency.js`,
  section after Time to Fill) = vacancies closed within the month ÷ open
  positions within the month. Approved MRFs only; each line opens
  `quantity` positions on `date_approved`, and its valid hires (on/after
  approval, earliest first) close them one by one — so it counts positions,
  unlike the MRF report's per-line Open/Closed. Open within a month = open at
  its start + newly approved in it. Monthly table and chart over the
  dashboard's date range (current month to date), the period rate, and the
  "Still Open" count. Same filters as Time to Fill. Positions come from
  `buildMrfPositions()` (shared with Aging of Vacancies).
- **Aging of Vacancies** (Recruitment KPI 6, `dashboard/recruitment/vacancyAging.js`,
  section after Hiring Efficiency) = days each approved MRF position has
  been open since `date_approved`, as of the end of the dashboard's date
  range (a snapshot; the range start doesn't apply), with average, oldest,
  aging buckets (0–15 … over 90 days) and the count past the rank's
  time-to-fill standard. Per **position**, so it can count more than the MRF
  report's per-line Open rows (a line of 3 with no hires = 3 vacancies;
  lines whose only hires predate approval stay open here, Closed there).
