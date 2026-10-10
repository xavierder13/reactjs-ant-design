---
name: recruitment-dashboard
description: The Recruitment Dashboard (/recruitment-dashboard; /dashboard redirects there) — must show the same numbers as vueportal's Dashboard.vue. Where its logic lives, the component map, and the parity check that proves it matches vueportal. Use before changing any Recruitment Dashboard metric/section, or when vueportal's dashboard changes.
---

# Recruitment Dashboard

Mirror of vueportal `resources/js/views/dashboard/Dashboard.vue` (+ its
`components/*.vue`). **Numbers must match vueportal exactly** — users compare
the two.

## Where things live

- `src/pages/dashboard/recruitment/recruitmentMetrics.js` — every metric.
  A line-for-line port of Dashboard.vue's `computed` block plus the chart
  data its components build. Pure JS, no React. vueportal quirks are kept on
  purpose (marked `vueportal:`), e.g. hired applicants appear in both
  `dateFilteredApplicants` and `hiredApplicants`, so gender/education/civil
  status/top positions/branch breakdown count each hire twice. One deliberate
  difference: every section follows the dashboard filters (user,
  2026-10-07), so the stage filter also applies to `hiredApplicants`
  (vueportal skips it there).
- `src/pages/dashboard/recruitment/components/` — one component per vueportal
  component (DashboardFilters, KpiCards, PipelineStageCards, RecruitmentFunnel,
  SourcingMetrics, ApplicantDistribution, GenderAndStageOutcome,
  ComplianceMetrics, ReservedApplicantAging, ApplicantDemographics,
  HiringOfficerPerformance, PlacementMatchAnalysis,
  QualifiedCandidatesPerVacancy, DeepAnalysis, RecruitmentInsights) + this
  app's own TimeToFill (Manpower Request). Components only render — any
  arithmetic in a template must copy vueportal's template (e.g. gender
  "% of total" is over `dateFilteredApplicants.length`).
- Chart shape/axes follow the Workforce Dashboard (`src/pages/dashboard/chartTheme.js`:
  rounded bars, stacked segments with in-segment values, trend-line style,
  no pies — Civil Status is the Workforce `ShareBar`, Hired by Source a count
  bar), but the **colors stay Recruitment's own** (`chartSetup.js`:
  `CHART_COLORS`, `STAGE_COLORS`, `PRIMARY_GREEN` and the per-chart values).
  Exception: Sourcing Metrics bars use the shared `BLUE` (one hue).
  Every bar (chart bars, stacked segments, progress/share/mini bars) is its
  color passed through `soften()` — same hue, lighter; lines, tags, tiles and
  the heatmap keep full strength.
  KPI and Applicant Pipeline cards keep their per-card colors, lightened with
  `soften()` (65% on white, the same rule as `BLUE`/`ORANGE`) and drawn as the
  Workforce `StatTile` (3px top bar, tinted icon badge, value in ink); text on a
  colored fill picks ink or white via `textOn()`. Pipeline cards: stage color
  on the top bar, main count in ink, then a split bar + dot legend for on
  process (stage color) / failed (red) / reserved (navy).
  Styling never touches `recruitmentMetrics.js`.
- `src/pages/dashboard/DashboardPage.jsx` — loads data, holds filter state,
  calls `computeRecruitmentMetrics` once, and renders the sections grouped
  into tabs (`TABS`: Overview, Pipeline, Sourcing & Applicants, Hiring Team,
  Manpower Requests; `renderSection(id)` maps a section id to its
  component). Only the active tab's sections render. The tab is in the URL
  (`?tab=`). The tab body is the shared `src/pages/dashboard/components/DashboardTabLayout.jsx` (+ `useDashboardTabs.js`, `DashboardNav.jsx` — also used by the Workforce Dashboard; `renderSection(id, { changeTab })`). A sticky bar (`DashboardNav.jsx`, `top: -24` inside MainLayout's
  scrolling Content; a shadow only once stuck, via an IntersectionObserver
  on a sentinel) holds AntD's default line tabs (active = app green label +
  ink bar; per-tab colors and a green strip were tried and reverted by the
  user, 2026-10-07) (icon + label; live counts on Pipeline =
  applicants in the period and Manpower Requests = open vacancies, as light
  green chips like the "records loaded" tag), a Filters button with the active-filter count,
  the period and filters in effect as removable tags, and — in tabs with 4+
  sections — AntD `Anchor` jump links drawn as pill chips (`.rd-jump` in
  `src/index.css`; active = filled app green, white text) on md+, or a "Jump
  to section…" select on phones. Each tab opens with its title and a
  one-line description in a light green block with the tab icon and a green
  left stripe (not sticky). Sections carry `id`s and scroll to just below the bar. Overview's `RecruitmentScorecard.jsx` shows
  Time to Fill / Hiring Efficiency / Aging of Vacancies; a tile opens the
  Manpower Requests tab at its section. Export Report still covers every
  section. The Filters button opens `DashboardFilterDrawer.jsx` (right
  drawer, full width on phones) with the same filters as the top panel
  (`recruitment/filterDefs.js`), applied immediately. Headless-Edge note: virtual time barely runs rAF/smooth scroll —
  drive rAF with timers and force `behavior: 'auto'` when testing jumps.
- Deliberate differences: Branch Breakdown and the Hiring Officer table page
  at 10 rows with a visible pager (vueportal shows the first 10 and hides the
  rest); the stage filter applies to hires; TimeToFill exists only here and
  follows the date range, Branch and Position (matched by name to the MRF
  branch / line position) — Source, Stage and Gender are applicant-only, and
  the section says so when one is set. HiringEfficiency (also only here,
  `recruitment/hiringEfficiency.js`) follows the same date range / Branch /
  Position; VacancyAging (`recruitment/vacancyAging.js`) uses Branch /
  Position and the range's end as its as-of date.

## Parity check — run after any metric change

`parity/` runs vueportal's REAL Dashboard.vue computed + component chart
methods (Chart.js stubbed) and this repo's `recruitmentMetrics.js` on the same
synthetic data (6 filter/date scenarios), then diffs every value.

```sh
cd .claude/skills/recruitment-dashboard/parity && python3 gen.py      # fixture.json
docker cp . vueportal_app:/tmp/parity && docker exec -e TZ=Asia/Manila vueportal_app sh -c 'cd /tmp/parity && node vue_harness.js'
docker cp vueportal_app:/tmp/parity/vue_out.json . && docker cp . rbac-react-dev:/tmp/parity
docker exec -e TZ=Asia/Manila rbac-react-dev sh -c 'cd /tmp/parity && node react_harness.mjs'
docker cp rbac-react-dev:/tmp/parity/react_out.json . && python3 compare.py
```

Expected: every scenario PASS except "stage Screening", where the
hire-based values (Total Hired, hire rate, sourcing/placement/hiring officer,
hired counts) are 0 in this app because the stage filter applies to hires —
213/228 identical as of 2026-10-07. Any other difference is a regression.
Delete the generated `fixture.json` / `*_out.json` afterwards.

The real page reads `/recruitment/applicant_list`, which calls the production
careers portal — for a browser comparison, intercept that request and serve
`fixture.json` to both apps instead of hitting production.
