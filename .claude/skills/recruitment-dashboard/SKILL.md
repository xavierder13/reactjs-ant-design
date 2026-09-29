---
name: recruitment-dashboard
description: The Recruitment Dashboard (/dashboard) — must show the same numbers as vueportal's Dashboard.vue. Where its logic lives, the component map, and the parity check that proves it matches vueportal. Use before changing any Recruitment Dashboard metric/section, or when vueportal's dashboard changes.
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
  status/top positions/branch breakdown count each hire twice, and the stage
  filter is not applied to `hiredApplicants`.
- `src/pages/dashboard/recruitment/components/` — one component per vueportal
  component (DashboardFilters, KpiCards, PipelineStageCards, RecruitmentFunnel,
  SourcingMetrics, ApplicantDistribution, GenderAndStageOutcome,
  ComplianceMetrics, ReservedApplicantAging, ApplicantDemographics,
  HiringOfficerPerformance, PlacementMatchAnalysis,
  QualifiedCandidatesPerVacancy, DeepAnalysis, RecruitmentInsights) + this
  app's own TimeToFill (Manpower Request). Components only render — any
  arithmetic in a template must copy vueportal's template (e.g. gender
  "% of total" is over `dateFilteredApplicants.length`).
- `src/pages/dashboard/DashboardPage.jsx` — loads data, holds filter state,
  calls `computeRecruitmentMetrics` once, renders sections in vueportal order.
- Deliberate differences: Branch Breakdown and the Hiring Officer table page
  at 10 rows with a visible pager (vueportal shows the first 10 and hides the
  rest); TimeToFill exists only here.

## Parity check — run after any metric change

`parity/` runs vueportal's REAL Dashboard.vue computed + component chart
methods (Chart.js stubbed) and this repo's `recruitmentMetrics.js` on the same
synthetic data (6 filter/date scenarios), then diffs every value.

```sh
cd .claude/skills/recruitment-dashboard/parity && python3 gen.py      # fixture.json
docker cp . vueportal_app:/tmp/parity && docker exec -e TZ=Asia/Manila vueportal_app sh -c 'cd /tmp/parity && node vue_harness.js'
docker cp vueportal_app:/tmp/parity/vue_out.json . && docker cp . rbac-react-dev:/tmp/parity
docker exec -e TZ=Asia/Manila rbac-react-dev sh -c 'cd /tmp/parity && node react_harness.mjs'
docker cp rbac-react-dev:/tmp/parity/react_out.json . && python3 compare.py   # expect N/N identical
```

The real page reads `/recruitment/applicant_list`, which calls the production
careers portal — for a browser comparison, intercept that request and serve
`fixture.json` to both apps instead of hitting production.
