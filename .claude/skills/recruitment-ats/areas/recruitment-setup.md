# Recruitment ATS — Recruitment Setup

Part of the `recruitment-ats` skill; read `SKILL.md` first (cross-cutting rules).

## Recruitment Setup — careers portal records

Recruitment → **Setup** group (a flat group header like Payroll → Setup, after
the Applicant Pipeline group): Careers Positions, Careers Ranks, Careers Branches,
Job Vacancies (`src/pages/recruitment/setup/{position,rank,branch,job_vacancy}/`,
routes `/recruitment/setup/positions|ranks|branches|job-vacancies`). These are the
careers portal's own records — what applicants pick on the careers site —
not this HRIS's Organization branches/positions (different ids). Ports of
the portal's `position/PositionIndex.vue`, `rank/RankIndex.vue`,
`branch/BranchIndex.vue`, `recruitment/JobVacanciesIndex.vue`.

- Flow: `careersPositionApi` / `careersRankApi` / `careersBranchApi` /
  `jobVacancyApi` → vueportal POST
  `/recruitment/setup/{branch|position|rank|job_vacancy}/{index|edit|store|update|delete}/{id?}`
  (`RecruitmentController@setup`) → gateway `recruitment_gateway/setup/…`
  (`RecruitmentGatewayController::SETUP_ACTIONS`) → the portal's own
  Branch/Position/Rank/JobVacancy controller method as the user. Contracts in
  each API file's header.
- Permissions: vueportal `careers-{branch|position|rank|job-vacancy}-{list|create|edit|delete}`
  (PermissionSeeder → Administrator); branch/position `index` also allowed
  with `careers-job-vacancy-create/-edit` (the vacancy form lists them).
  The gateway checks the portal's `branch-*`, `position-*`, `rank-*`,
  `jobvacancies-*` (`update` = `jobvacancies-update`). Portal roles holding
  them: Administrator, Career Admin, Inventory Branch.
- Stores `careersBranchStore` / `careersPositionStore` (+ departments,
  ranks) / `jobVacancyStore`, hooks `useCareersBranches` /
  `useCareersPositions` / `useJobVacancies`; pages reuse the Organization
  pieces (`RecordToolbar`, `RecordRowActions`, `saveRecord` — validation
  failures are HTTP 200 bags; `onError: showGatewayError` reads the
  gateway's `{ error }`).
- Position: name (unique), rank, department (division read-only) required,
  Active switch, description + qualifications in `src/components/RichTextEditor.jsx`.
  **User requirement: the HTML must be the same as the portal's CKEditor 4
  (4.17.2 standard-all, default config) saves.** So: CKEditor 5 with only
  what CKEditor 4's standard setup keeps (Normal/H1–H3, bold, italic,
  strike, remove format, lists + indent, block quote, link, table,
  horizontal line, special characters — no underline/sub/sup/alignment/
  paragraph indent, which CKEditor 4 strips), output rewritten by
  `src/components/ckeditor4Html.js` (port of CKEditor 4's htmlwriter +
  entities: tabs/newlines, `<br />`, `&ldquo;`/`&#39;`…, `<i>`→`<em>`, no
  `<figure>`/`data-list-item-id`/`rel`), and the modal sends edited fields
  with CRLF line breaks (the portal posts FormData; Laravel TrimStrings
  drops the trailing break). `onChange` fires only while the editor is
  focused, so an untouched field is sent back byte-identical. Verified in
  headless Edge against CKEditor 4 itself: 149/149 React outputs round-trip
  through CKEditor 4 unchanged; 102/104 stored texts identical — the two
  others (positions 14, 45) hold `<li><p>`, which CKEditor 5 can't keep
  (only changes if HR edits that field). Re-run that comparison after
  changing the editor config or the converter. The list has no expandable
  row (user decision) — the HTML is only shown in the editor; if it is ever
  rendered as HTML here, sanitise it first (the portal API accepts any
  HTML). Description required on update only (portal rule).
  Not ported: "Level of Position" (the portal controller doesn't save it)
  and the Job Offer PDF — production's `positions` has no `job_offer_file`
  column, so the portal's own upload fails.
- Job Vacancy: create = position, educational attainment (5 fixed values),
  branch type (0 For Branch Only / 1 For Admin Only), status, hiring
  branches (`Transfer`, optional); edit = status + hiring branches only
  (replace-all; the others are disabled — portal rule). The list comes from
  the portal's join, so vacancies of deleted positions don't show.
- Branch: code + name, both required and unique.
- Rank: name, required and unique. The list shows how many careers
  positions use each rank (from the positions index), and the delete
  confirmation repeats it — the portal deletes a rank in use, leaving
  positions with a missing rank (the Position modal then asks for one).
- Deletes have no in-use guard (portal behaviour); deleting a vacancy
  leaves its `job_vacancy_branches` rows (portal behaviour). The gateway
  answers update/delete of a vacancy deleted meanwhile with 404 (the
  portal method would 500).

### Hiring Officers (`/recruitment/setup/hiring-officers`)

Unlike the other Setup pages, this is **this HRIS's own table** (vueportal
`hiring_officers`: `employee_id` unique), not a careers portal record — the
portal has no officer table and the applicant keeps `hiring_officer_name` /
`hiring_officer_position` as text, so editing/deleting an officer never
changes saved applicants.
- An officer is an **Employee Master Data** record: active and matching
  any one of `HiringOfficer::RULES` — an `ADMINISTRATION` employee of rank
  `Managerial`, rank `Top Management`, or position `Branch Manager` (any
  branch) — (`eligibleEmployees()`; checked on save; the API returns
  `rules`, `hiringOfficer.js` `rulesText` / `ineligibleReason` read them).
  The form picks the
  employee from `create`'s eligible list (ones already officers disabled);
  Position is the employee's, read-only. The list flags an officer who no
  longer qualifies (inactive, transferred, re-ranked — `hiringOfficer.js`
  `ineligibleReason`); those are left out of the applicant picker.
- On the applicant form, the saved name is "First Last" (`officerName` —
  the format HR typed in the portal) and the position is the employee's
  position name.
- Files: `src/pages/recruitment/setup/hiring_officer/` (+ `hiringOfficer.js`),
  `hiringOfficerApi.js` (contract in its header), `hiringOfficerStore.js`,
  `useHiringOfficers.js`.
- vueportal `HiringOfficerController`, POST
  `/hiring_officer/{index|create|store|update/{id}|delete/{id}}`; validation
  = HTTP 422 bags (Area style) → the modal maps them inline.
- Permissions `hiring-officer-list/-create/-edit/-delete` (PermissionSeeder
  → Administrator; the middleware also bypasses Administrator, like
  RecruitmentMaintenance); `index` is also allowed with
  `careers-update-status` / `careers-update-hiring-details`, because
  `StatusUpdateModal` loads the officers (store `fetchItems` on open) for
  the Hiring Officer Name select.


**Phase 9 (optional) — live refresh** (portal uses a websocket on
`applicant-submit`) — but the portal's application form has that emit
commented out (`ApplicationForm.vue` `// this.$socket.emit("sendData", {
action: "applicant-submit" })`), so nothing fires it. Options put to the
user: skip (lists have Refresh) or poll the open list every few minutes.
