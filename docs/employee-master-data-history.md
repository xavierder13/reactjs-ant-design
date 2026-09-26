# Employee Master Data — change history

Archive of how the Employee Master Data frontend module evolved: dated
entries, bugs found and fixed, verification notes, corrections. **Not loaded
by Claude by default** — the current rules and facts live in
`.claude/skills/employee-master-data/SKILL.md`. Read this only when you need
the *why/when* behind a current rule.

Moved here verbatim on 2026-09-26 from the skill's former status preamble
and "Roadmap" section, and the former "Employee Master Data Conventions"
section of `CLAUDE.md`. Some entries describe states later superseded (e.g.
tabs described as placeholders, Offboarding as blocked); the skill is
authoritative for the current state.

---

## From the skill (former status preamble)

Status (2026-09-16): **core record CRUD wired up** (list with server-side
search/pagination, bulk delete, Excel import, create, view, edit, delete),
plus the standalone **Employee Acknowledgment Report** sub-feature and a
**Referral Code** display field, following this repo's own Zustand-store +
thin-service + hook conventions. The reference app (`vueportal`, same HRIS,
a different repo) treats Employee Master Data as one record with a 6-tab
edit UI; only 2 of those 6 tabs (Personal Data, Employee Details) are real
here — the other 4 (Performance Management, Disciplinary Measures &
Penalties, Offboarding, Attendance) are placeholder `Empty` states. The
root `CLAUDE.md`'s "Employee Master Data Conventions" section is the
fast-reference summary kept in sync with real code; this file adds full
detail.

**2026-09-16: vueportal's `master` branch was merged into
`F-HRIS-Staging`.** Master had diverged substantially (44 commits, ~64
files, mostly unrelated modules — credit application, inventory) but
carried real Employee Master Data additions this repo didn't have yet:
referral codes and the Employee Acknowledgment Report feature (both now
ported here — see their own sections below), plus two new
`EmployeeOffboarding` fields (`resignation_date_received`, `compliance`)
relevant only once the deferred Offboarding tab gets built. The merge
itself also surfaced and fixed 3 real pre-existing backend bugs unrelated
to this port (a route namespace typo, a duplicated migration file, the
Promodizer Brand column's actual root cause) — see `vueportal`'s own git
history for those; not repeated here since they're backend-only.

## From the skill (former Roadmap section)


**Done:**
- Core record: list (server-side search/pagination, column picker,
  desktop table + mobile cards), create, view, edit, delete.
- Personal Data tab (Personal Information fields; Files & Requirements
  upload/list/delete/download, available once the employee has an id).
- Employee Details tab (position/department/branch/employment
  type/dates/active, plus best-effort read-only org-chart display).
- `/employees/:id/edit` route registered (previously a page file that
  existed but was unreachable).
- Fixed a real bug in the pre-existing `EmployeeTable.jsx`: its Actions
  column `render` didn't destructure `(text, record)`, so `record` was
  undefined and Edit/Delete would have thrown on click.
- Stripped stray TypeScript syntax from `EmployeeModal.jsx`,
  `EmployeeCardMobile.jsx`, `ColumnSelector.jsx`, `PaginationControls.jsx`
  (this project has no TS toolchain — these previously wouldn't parse) and
  fixed `EmployeeCardMobile.jsx`'s broken `useAuth` import
  (`@/context/AuthContext`, which doesn't exist, → the real
  `src/hooks/useAuth.js`).
- Added View actions (previously only Edit/Delete existed) to both
  `EmployeeTable.jsx` and `EmployeeCardMobile.jsx`.
- **Post-build verification pass (2026-09-15)** found and fixed 3 real bugs
  introduced in this same pass, via source-tracing (route → page → API →
  store → re-render):
  1. **Duplicate/racy fetch on every list-page mount.** `useEmployees.js`
     had its own `useEffect(() => fetchItems(), [])` (the usual pattern
     for other hooks in this repo) *in addition to*
     `EmployeeMasterData.jsx`'s own mount-time
     `useEffect(() => fetchEmployees(1), [selectedHeaders])` — both fire
     on first render, sending two concurrent POSTs to
     `/employee_master_data/index` (one with `{}`, one with real params)
     with no guaranteed resolution order, so the wrong one could win and
     leave the table showing an unpaginated/unfiltered result. Fixed by
     removing the auto-fetch from `useEmployees.js` — **this hook
     deliberately does not auto-fetch on mount**, unlike
     `useBranches`/`useDepartments`/`usePositions`/`useManpowerRequests`,
     because the list page always needs params-based fetching. Don't
     reintroduce a mount effect here.
  2. **Age display field never populated in View/Edit.**
     `PersonalInformation.jsx` computed Age from local state set only by
     the DatePicker's own `onChange` — but `EmployeeForm.jsx` pre-fills
     `birth_date` via `form.setFieldsValue`, which does not fire a field's
     `onChange`. Fixed by switching to `Form.useWatch('birth_date')`,
     which reacts to the form value itself regardless of how it was set.
  3. **Stale Rank/Division/Company shown right after an Edit save.**
     `EmployeeForm.jsx`'s post-update fallback (see "Unconfirmed Backend
     Contracts") spread `{ ...initialData, ...payload }`, which keeps
     `initialData`'s old nested `position`/`department`/`branch` objects
     even when the corresponding FK changed in that save. Fixed by
     dropping a nested object from the fallback whenever its FK actually
     changed (falls back to "-" in the display, matching how a genuinely
     missing value already renders, rather than showing a wrong one).
- **List toolbar redesign + Bulk Delete + Import (2026-09-15/16)**, in
  response to reported issues (`[antd: message] Static function can not
  consume context...` console warning on the column picker, and a client
  error when selecting the "Promodizer Brand" column):
  1. Fixed the static-`message`-API warning in `ColumnSelector.jsx` — it
     imported `{ message }` directly from `antd` instead of using
     `App.useApp()`, which can't consume this app's `<AntApp>`
     `ConfigProvider` context (dynamic theme). Every other file in this
     module already used `App.useApp()` correctly; this was the one
     leftover. If you add a new `message`/`notification` call anywhere in
     this module, use `App.useApp()`, never the static import.
  2. Fixed the "Promodizer Brand" list column's frontend bug (bad
     `dataIndex`, see "Decisions" item 4 above) — this alone was not
     sufficient. Selecting the column still threw a backend 500
     (`SQLSTATE[42S22]: Column not found: 1054 Unknown column
     'promodizer_brand.brand'`), reported separately once the frontend fix
     was live. **Root cause was in `vueportal`, not this repo**:
     `EmployeeMasterDataController::index()` (and two duplicate copies of
     the same logic in `employees_for_regularization()`/
     `employees_hired_this_month()`) maps only 7 hardcoded relation-column
     titles (Branch/Company/Department/Division/Job Description/Rank/
     Status) to their real SQL join aliases for the search `WHERE` clause;
     anything else falls through to using the frontend's raw
     `table_headers[].value` string as a literal column reference.
     "Promodizer Brand" wasn't in that whitelist, so `promodizer_brand.brand`
     was used literally against a table aliased `h`, which doesn't exist
     under that name. **Fixed in `vueportal`** (all 3 duplicate whitelist
     arrays, `app/Http/Controllers/API/EmployeeMasterDataController.php`) by
     adding `['name' => 'Promodizer Brand', 'field' => 'h.brand']`,
     matching the existing pattern exactly — this was a cross-repo fix,
     documented here because the frontend column is what surfaces it, but
     see `vueportal`'s own inline comment at the fix site for the backend
     side of the story. Confirmed this is the *only* React-side list column
     with this problem (every other nested-relation column's title already
     matches the backend's whitelist); no other column needs the same fix.
  3. Redesigned `EmployeeMasterData.jsx`'s header into title+actions /
     search+columns / bulk-actions rows — see "List Page Toolbar / Bulk
     Actions" above.
  4. Added bulk delete (UI only — `employeeStore.deleteEmployee` already
     accepted an array).
  5. Added Import (`employeeApi.import`, `ImportEmployeesModal.jsx`,
     gated on `employee-master-data-import`) — Export and Template
     Download were deliberately **not** added in this pass (not asked
     for; see Deferred #5 below), even though vueportal exposes both as
     natural companions to Import.

**Done, added 2026-09-22 (Excel Export + Template Download):**
- `employeeApi.export`/`.templateDownload` (`src/services/employee/employeeApi.js`),
  `ExportEmployeesModal.jsx` (new), a "Template" button wired directly to
  `employeeApi.templateDownload()` in `EmployeeMasterData.jsx` (no dialog —
  see scoping note below for why), both gated on `employee-master-data-export`/
  `-template-download` in the list page's title-actions row next to Import.
- **Scoping decision, deliberately narrower than the Vue reference**:
  vueportal's `/employee_master_data/export` endpoint is actually a
  4-way report dispatcher (`report_type`: `'Employee List'` |
  `'Employee Attendance Report'` | `'Branch Manpower Report'` |
  `'Key Performance Index Monitoring'`, confirmed by reading
  `EmployeeMasterDataController@export` directly), and its "Generate
  Template" dialog (`TemplateDownloadDialog.vue`) offers template
  downloads for 7 other sub-modules (Branch Assignment Position, Monthly
  Key Performance, Classroom/OJT Performance Rating, NTE, Disciplinary,
  Offboarding) on top of the core record. Only the core-record pieces —
  `report_type: 'Employee List'` for Export, and the plain
  `template/download` endpoint for Template — are wired here. The other
  three report types and seven other template types belong to modules
  that are still placeholders in this app (Performance Management/
  Disciplinary/Offboarding tabs, Attendance tab) and to dashboard-level
  reports outside this module's scope; wire each up alongside its own
  module when that module gets built, following this same
  `ExportEmployeesModal.jsx` pattern rather than trying to build one
  giant multi-report dialog upfront.
- `ExportEmployeesModal.jsx`'s form fields/validation intentionally mirror
  `ExportDialog.vue`'s actual field-by-field behavior (confirmed by
  reading that file, not guessed from the button label): a Branch picker
  visible only for `hasAnyRole('Administrator', 'Employee Master Data
  Administrator', 'Recruitment & Hiring', 'Payroll Admin', 'Employees
  Relation', 'Performance Management')` — everyone else is scoped
  server-side to their own branch/department/division and `branch_id` is
  omitted from the payload entirely for them; a Date Field Parameter
  select (Date Employed / Date Assigned-Deployed / Date Resigned); a
  Document Status select (All / Active Only) hidden — not merely
  disabled — whenever Date Field Parameter is Date Resigned, matching
  `EmployeeMasterDataExport::collection()`'s own
  `$params['document_status'] == 'Active Only' && $params['date_field_param']
  != 'date_resigned'` condition server-side; and a single AntD
  `RangePicker` in place of Vue's two separate native date inputs
  (idiomatic AntD equivalent, not a literal port — the min/max
  cross-constraint Vue enforces manually is what `RangePicker` already
  guarantees natively). Deliberately did **not** add a "no future dates"
  restriction on the range — the Vue reference doesn't have one either,
  and a date range that includes future dates is plausibly valid for this
  report.
- **Real bug found and fixed while building this (not present in the Vue
  reference's own error handling, which has the same gap but was out of
  this pass's scope to fix there)**: `EmployeeMasterDataController@template_download`'s
  `catch` block returns `response()->json(['error' => ...], 200)` — HTTP
  200, not an error status, on failure. A naive blob-download handler
  (axios `responseType: 'blob'`, save-on-success) would have silently
  downloaded a corrupted "file" that's actually JSON text with a `.xls`
  extension, since a 200 response never reaches a `.catch()` block.
  Fixed by adding `src/utils/downloadBlobResponse.js`, a small shared
  helper used by both `ExportEmployeesModal.jsx` and the Template button's
  handler (and reusable by `FilesRequirements.jsx`'s `handleDownload` if
  that's ever revisited — not changed in this pass since it wasn't asked
  for and touches a different tab): it checks the response's actual
  `Content-Type` header and, if it's JSON rather than a binary file, reads
  and surfaces the real error message instead of triggering a download.
  **Known remaining gap, not fixed**: a genuine non-200 error from either
  endpoint (e.g. a 403 from `EmployeeMasterDataMaintenance`) still shows a
  generic message — `error.response.data` is a `Blob` in that case too,
  and the shared `handleApiError` util (used everywhere else in this repo,
  including the pre-existing `FilesRequirements.jsx`) doesn't parse Blob
  error bodies. This is a pre-existing limitation of that shared util
  across every blob-download call site in this repo, not something
  introduced here — left alone since fixing it means changing shared,
  widely-used code well beyond this module's scope.
- No automated test run against a live backend was possible in the
  environment this was built in (no Node/npm toolchain available at all —
  not even `npm run lint` could be run). Reviewed manually line-by-line
  instead; verify against a real `employee-master-data-export`/
  `-template-download`-permitted login before treating this as fully
  proven.

**Done, added 2026-09-22 (Performance Management tab, all 7 sub-features):**

- **Major architecture discovery, changes how every remaining tab should
  be built**: `EmployeeMasterDataController::getEmployees()` (which backs
  `/employee_master_data/index` — the same endpoint the list page already
  calls) unconditionally eager-loads `monthly_key_performances`,
  `classroom_performance_ratings`, `ojt_performance_ratings`,
  `branch_assignment_positions`, `merit_histories`, `trainings`,
  `explanations` (NTE), `disciplinaries`, and `offboardings` onto **every
  row**, confirmed by reading the query directly. vueportal's own Vue
  reference relies on exactly this — `EmployeeMasterData2.vue`'s
  `viewProfile(item)` reads `item.monthly_key_performances` etc. straight
  off the already-loaded list row, no extra fetch. Since this repo's list
  page already passes the full row via router state (see Decision #1
  above), **every Performance Management/Disciplinary/Offboarding
  sub-tab's starting data is already sitting in `initialData` with zero
  new fetches needed** — only Attendance is excluded from this eager-load
  (it's joined server-side against a separate BioBridge system via its
  own `/attendance` endpoint, matching the existing Roadmap note).
- **Two more confirmed backend bugs found while mapping this** (documented
  here, not fixed — out of scope, `vueportal`'s own): (1)
  `EmployeeKeyPerformanceController` has **no `index()` method at all**
  despite `GET employee_master_data/key_performance/index` being a
  registered route — would throw if ever called; not called by this
  frontend (see the architecture note above for why it's unnecessary).
  (2) `EmployeeClassroomPerformanceRatingController` and
  `EmployeeOjtPerformanceRatingController` both have registered
  `/import` and `/template/download` routes but **no corresponding
  controller methods** — same class of bug, also not called here.
- Files: `src/pages/employee_master_data/components/tabs/performance/` —
  `PerformanceRecordTab.jsx` (generic list+modal CRUD shared by the 4
  structurally-identical simple sub-modules: Classroom/OJT Performance
  Rating, Merit History, Training — each has no `index()` endpoint, every
  store/update/delete returns the employee's full remaining list for that
  relation, which becomes the new local state), `ClassroomPerformanceRatingTab.jsx`,
  `OjtPerformanceRatingTab.jsx`, `MeritHistoryTab.jsx`, `TrainingTab.jsx`
  (thin field-config wrappers around it), `BranchAssignmentPositionTab.jsx`
  (also built on `PerformanceRecordTab` but with its own Select-by-name
  fields and a warning banner — see below), `MonthlyKeyPerformanceTab.jsx`
  (bespoke — see below), `EvaluationRegularizationTab.jsx` (bespoke — see
  below). `src/services/employee/keyPerformanceApi.js`,
  `classroomPerformanceRatingApi.js`, `ojtPerformanceRatingApi.js`,
  `branchAssignmentPositionApi.js`, `meritHistoryApi.js`, `trainingApi.js`
  — one file per sub-module, no `getAll` in any of them (see above). No
  new Zustand stores — this data isn't independently fetched, so there's
  nothing for a store to own; each sub-tab keeps its own local `useState`
  seeded from `initialData.<relation>`, same pattern as
  `FilesRequirements.jsx`.
- `PerformanceManagementTab.jsx` now threads `mode`/`initialData` down
  (previously rendered with no props) and filters its `Tabs items` by each
  sub-feature's own `-list` permission before rendering, matching
  vueportal's `EmployeeInformationTabs.vue` `tabItems` computed property
  exactly (a tab a user can't see is absent from the array, not just
  disabled) — the pattern the original Roadmap entry asked for.
- **Monthly Key Performance is NOT single-row CRUD** — confirmed from both
  `EmployeeKeyPerformanceController` and `MonthlyKeyPerformance.vue`: "Add
  Period" creates all 12 months of a chosen year in one batch call
  (`grade: null` for each), "Delete Period" removes an entire year's 12
  rows in one call keyed by `employee_id`+`period` (not a row id), and
  only a single row's `grade` is ever individually editable via a separate
  modal. `MonthlyKeyPerformanceTab.jsx` is a bespoke component for this
  reason, not built on `PerformanceRecordTab`. Deliberately sends `grade:
  null` for new months rather than copying Vue's own `grade: ""` (which a
  `nullable|numeric` Laravel rule would likely reject) — see the user's
  own instruction to treat the Vue app as reference only, not something to
  literally port bugs from.
- **Branch Assignment & Positions has a real, confirmed side effect not
  obvious from the tab's name**: `EmployeeBranchAssignmentPositionController`'s
  store/update/delete all overwrite the employee's own `branch_id`/
  `position_id`/`department_id` on `employee_master_data` to match
  whichever assignment row now has the latest `date_assigned` — meaning an
  action taken in this sub-tab can silently change what the Employee
  Details tab shows. Surfaced as a warning `Alert` above the table rather
  than attempting to live-patch `initialData` from a sibling tab (no clean
  way to do that without a broader state-lifting change not otherwise
  needed anywhere else in this module). Also: `branch`/`position` here are
  plain NAME strings server-side (matched via `Branch::where('name', ...)`/
  `Position::where('name', ...)`), not the `branch_id`/`position_id`
  convention used everywhere else in this app — the Select options reuse
  `useBranches`/`usePositions` but are keyed on `.label`, not `.value`.
- **Evaluation & Regularization is not its own CRUD module** — it's a
  `regularization_date` field on the core `employee_master_data` record
  itself (confirmed handled in `EmployeeMasterDataController::store/update`,
  same endpoint as every other core field — added to `EmployeeForm.jsx`'s
  pre-fill/`buildPayload` in this pass) plus two file attachments
  distinguished only by a `title` metadata value ("Performance for
  Regularization", "Memo of Regularization"), reusing the exact same
  `file_upload`/`file_delete`/`file_download` endpoints as Files &
  Requirements. `EvaluationRegularizationTab.jsx`'s `regularization_date`
  field is a bare `Form.Item` relying on `EmployeeForm.jsx`'s shared
  ancestor Form (same rule as every other tab field — see "Forms" above),
  saved by the main Save button; the two file slots persist immediately on
  upload/delete, independent of the form.
- Permission strings in use: `employee-master-data-key-performance-list/
  -create/-edit/-delete` (plus `-import`/`-template-download`, seeded but
  not wired — see the confirmed bugs above), same `-list/-create/-edit/
  -delete` shape for `-classroom-performance-rating`, `-ojt-performance-
  rating`, `-branch-assignment-position`, `-merit-history`, `-training`,
  and `employee-master-data-evaluation-regularization` (base tab-visibility
  permission only — `-create`/`-edit` variants are seeded but not
  separately checked in this pass, unlike the other six sub-modules which
  do split create/edit/delete). All confirmed already present in
  `PermissionSeeder.php` — no backend changes were needed.
- **No automated test run against a live backend was possible** in the
  environment this was built in (no Node/npm toolchain at all). Reviewed
  manually — including re-deriving every relative import path against a
  sibling file's known-correct depth, and specifically re-checking that
  every `store`/`update` handler correctly branches on `data.success`
  rather than assuming success (a real bug caught and fixed in this same
  pass, before it shipped) — but this has not been executed. Verify
  against a real employee record with data in each sub-module before
  treating this as fully proven, especially Branch Assignment Position's
  side effect and Monthly Key Performance's batch semantics.

**Done, added 2026-09-22 (Disciplinary Measures & Penalties tab, both sub-features):**

- Unlike every Performance Management sub-module, `EmployeeNTEController`
  and `EmployeeDisciplinaryController` both DO have a working `index()` —
  but each is a **global, cross-employee "open cases" queue** (scoped by
  manager/subordinate hierarchy, filtered to `status IS NULL OR 'Open'`),
  confirmed by reading both directly — it backs a separate queue view
  (`EmployeeDisciplinaryList.vue` in the Vue reference), not this
  per-employee tab. This tab still reads `explanations`/`disciplinaries`
  off the employee record itself, same as every Performance Management
  sub-tab — the architecture discovery above covers these two relations
  as well.
- **Not built on `PerformanceRecordTab.jsx`** — these two have a
  genuinely different shape (multipart create/update carrying an attached
  file, not a plain JSON payload) that would have forced the shared
  component to grow file-handling complexity only 2 of 6 total
  sub-modules need. Built as two standalone components instead:
  `src/pages/employee_master_data/components/tabs/disciplinary/DisciplinaryRecordsTab.jsx`
  (single file per record) and `NteRecordsTab.jsx` (**two** independent
  files per record — `nte_file` and `explanation_file`, each needs its own
  `document_type` on every file-scoped call — see `nteApi.js`).
  `DisciplinaryTab.jsx` is the 2-sub-tab container, permission-filtered
  the same way as `PerformanceManagementTab.jsx`.
  `src/services/employee/disciplinaryApi.js`, `nteApi.js`.
- **Confirmed backend limitation, not a bug in this port**: once a record
  has a file, re-uploading a new one via `update()` is silently ignored
  server-side (`if (!$disciplinary->file_name) { ...set file... }`,
  same in NTE per file slot) — the file field must be deleted first
  (`fileDelete`) before a replacement actually takes effect. Reflected in
  the UI: the file picker is only shown when no file exists yet; once one
  exists, only Download/Delete are offered (matching
  `DisciplinaryAction.vue`'s own `v-if="editedItem.file_name"` split).
- Real reference lists (not invented) ported from `DisciplinaryAction.vue`'s
  own hardcoded `data()` arrays: `offenses` (8 categories),
  `disciplinary_measures` (6 actions), `offense_series` (First–Fifth
  Offense) — presented as closed `Select`s rather than Vue's free-text-
  capable autocomplete, deliberately: these are fixed policy categories.
  `status` is `['Open', 'Closed']` on both NTE and Disciplinary, confirmed
  from the same Vue file and from `index()`'s own status filter.
  `offense_type` is free text on the backend (`required`, no `in:` rule)
  despite initially looking like it should be another fixed list —
  confirmed by actually reading `DisciplinaryAction.vue`'s template
  (`v-text-field`, not `v-autocomplete`) before assuming.
- Permission strings in use: `employee-master-data-nte-list/-create/-edit/
  -delete/-file-download/-file-delete` (plus `-import`/`-template-download`,
  seeded but not wired here, same scoping decision as every other
  sub-module's import/export tooling), identical shape for
  `-disciplinary-*`. All confirmed already present in `PermissionSeeder.php`.
- **Validated 2026-09-22 via the project's actual running dev containers**
  (`rbac-react-dev`, a live-bind-mounted Vite container with Node 20 +
  the real `node_modules` — discovered mid-session; this environment has
  no host-level Node/PHP toolchain, only Docker) — `npm run lint` and
  `npm run build` both run clean against every file touched this session,
  including this tab: 0 errors/warnings in anything new, and the 56
  pre-existing problems elsewhere in the codebase are unchanged. This is
  real, executed validation, not just a manual read-through — a
  meaningfully stronger bar than every earlier session's "no toolchain
  available" caveat. Still not validated: actual browser click-through
  (no browser-automation tool available even with the container running)
  and a live backend round-trip (the file-upload multipart shape and the
  `{success, disciplinaries/explanations}` response contract are read
  directly from the controllers, not exercised against a running request).
- **Two real bugs caught and fixed in this session's own code before
  shipping** (via the lint run above, not by inspection alone): three
  instances of calling a `useState` setter synchronously inside a
  `useEffect` (`react-hooks/set-state-in-effect`, a stricter rule this
  project's ESLint config enforces as an error) in `RoleIndex.jsx`,
  `PermissionIndex.jsx`, `RoleForm.jsx` — all copied uncritically from a
  pre-existing buggy pattern in `KpiTemplateIndex.jsx`/`KpiTemplateForm.jsx`
  (still unfixed there, out of scope). Fixed by deriving `filtered` via
  `useMemo` instead of syncing it through state (Role/Permission), and by
  replacing `RoleForm.jsx`'s effect with a lazy `useState` initializer
  since both callers already gate rendering until the async data they'd
  been syncing is already available. Also fixed a genuine unused-variable
  error in `PerformanceRecordTab.jsx` (an `employeeId` prop declared but
  never read, since callback props already close over it).

**Done, added 2026-09-22 (Attendance tab):**

- Confirmed read-only, exactly as the previous Roadmap entry assumed:
  `EmployeeMasterDataController::getAttendanceLogs()` queries a **separate
  `biobridge` DB connection** keyed by `employee_code` (not `id`/
  `employee_id` like every other sub-module) — no store/update/delete
  exists for this data at all, it's raw biometric punch logs, not an
  editable HRIS record.
- **Unlike every other sub-tab, this one genuinely needs its own fetch** —
  attendance is not part of `/employee_master_data/index`'s eager-loaded
  relations (confirmed absent from `getEmployees()`'s `.with(...)` list;
  makes sense, it's not a local relation). `src/services/employee/attendanceApi.js`
  posts directly to `/employee_master_data/attendance` with `{employee_code,
  date_from, date_to, page, items_per_page}`, returning a standard Laravel
  paginator of per-day summaries: `{date, time_in, time_out, break_in,
  break_out, break_logs: [{punch, time}]}`.
  `src/pages/employee_master_data/components/tabs/AttendanceTab.jsx`.
- **Deliberately excludes 3 pieces of dead/unfinished UI found in the Vue
  reference itself**, confirmed by reading `EmployeeAttendance.vue`'s
  script, not just its template: the "Overtime"/"Late/Early"/"No Pay"
  view-type toggle buttons (`view_type` is bound via `v-model` but never
  read anywhere else — no computed property, method, or watcher consumes
  it; the badge counts are hardcoded `10`, not real data) and the "Out
  Time"/"Work Hours"/"No Pay" table columns (declared in the `headers`
  array but never populated in the actual row markup — the cells are
  empty `<td>`s). Porting these would have shipped fake, non-functional
  controls — directly against the "fully tested and no bug" instruction
  this session is building under. Also excludes both "Download" menu
  items (Attendance Log Excel export, Attendance Report print view) —
  same scoping discipline as every other sub-module's deferred import/
  export tooling in this app.
- Matches `EmployeeAttendance.vue`'s own range-selection UX: Last 7 Days /
  Last 30 Days (auto-computed, re-fetches immediately) / By Period
  (unlocks manual date pickers, fetch deferred to a Search button) — plus
  a clickable Break In/Out chip opening a small modal listing that day's
  raw punches, matching the reference's `dialog_break_logs`.
- **A real lint error surfaced and fixed a subtlety worth remembering for
  any future data-fetching effect in this app**: `useEffect(() => {
  fetchAttendance(...); }, [...])` was flagged by `react-hooks/set-state-in-effect`
  even though `fetchAttendance` is called by *reference*, not inlined —
  this project's ESLint config traces into same-component helper
  functions and flags the effect if that helper directly calls a
  `useState` setter. The fix (confirmed by testing, not just theorizing):
  wrap the call in a function *defined and invoked inside the effect
  itself* (`const load = async () => { await fetchAttendance(...); };
  load();`) — matching the exact shape already used cleanly elsewhere in
  this app (`EditKpiTemplate.jsx`'s own `load()` pattern). A **plain top-level
  call to the same reusable `fetchAttendance` from an event handler**
  (the Search button, the range-type radio's `onChange`, the table's
  pagination `onChange`) is completely fine — the rule only fires inside
  `useEffect` bodies.
- Permission strings in use: `employee-master-data-attendance` (view —
  gates the whole tab), `-export`, `-report` (both seeded, neither wired —
  see above). Confirmed already present in `PermissionSeeder.php`.
- **Validated the same way as the Disciplinary tab**: `npm run lint` (0
  new errors, exactly 1 new warning — a missing-dependency warning on the
  mount-fetch effect, matching the same accepted pattern already used in
  `usePermissions.js`/`useRoles.js`/`EmployeeMasterData.jsx`) and `npm run
  build` both run clean via `rbac-react-dev`. Not validated: an actual
  live request against the `biobridge` connection (no way to exercise this
  in the environment this was built in), and the browser click-through
  gap noted in the Disciplinary tab's own entry above still applies.

**Done, added 2026-09-22 (Offboarding tab) — the "two data sources"
blocker from "Important Business Rules" item 4 below is resolved, not
just unbuilt:**

- **Resolved by reading `Offboarding.vue` directly** (the component
  actually wired into `EmployeeInformationTabs.vue`'s Offboarding tab, not
  just inferred from the two schemas existing) — every one of its save
  calls goes to `/employee_master_data/offboarding/store` or `/update/:id`
  (the dedicated `employee_offboardings` table via `EmployeeOffboardingController`).
  It never writes `last_day_of_work`/`reason_of_resignation`/etc. onto the
  core `employee_master_data` record. `employee_offboardings` (created a
  month after those core columns, with 3 file-attachment slots the core
  table doesn't have, and still gaining new fields as of 2026-08-12) is
  the live, actively-maintained source; the core table's resignation
  columns are a superseded legacy holdover — still read by
  `EmployeeMasterDataExport` for its own export columns, but not written
  by any live UI flow. Update "Important Business Rules" item 4's framing
  if it's ever re-read in isolation — this file's version above is now the
  stale one.
- Files: `src/pages/employee_master_data/components/tabs/OffboardingTab.jsx`
  (not built on `PerformanceRecordTab.jsx`, same multipart-file reasoning
  as Disciplinary/NTE), `offboarding/OffboardingFileSlot.jsx` (shared
  across this record's 3 independent file slots — Last Day File,
  Clearance File, Quitclaim File — generalized from the same shape NTE
  duplicated inline for its 2 slots; NTE's own copy wasn't refactored to
  use it, not worth the churn on already-validated code for this pass).
  `src/services/employee/offboardingApi.js`. `employeeApi.js` gained a
  `resign` function (`POST /employee_master_data/resign`).
- **Saving an offboarding record automatically triggers a second call**,
  confirmed from `Offboarding.vue`'s own `save()` flow: right after the
  offboarding record itself saves successfully,
  `employeeApi.resign({employee_id, date_resigned: last_day_of_work})`
  fires to flip the core employee's `active`/`date_resigned` — not a
  separate manual "Resign Employee" button anywhere. Best-effort: a
  failure on this second call is surfaced via `handleApiError` but doesn't
  roll back the already-saved offboarding record, matching the Vue
  reference (which has no rollback either).
- **A real mistake caught before shipping, not by lint this time but by
  re-reading the backend contract**: the first draft only offered file
  upload in *edit* mode, assuming (wrongly) the same "no file yet" gate
  NTE/Disciplinary use for uploading after a file was deleted. Re-reading
  `EmployeeOffboardingController::save()` (shared by both `store()` and
  `update()`) showed the file-blocking guard (`if (!$offboarding->last_day_file_name)`)
  is trivially true for a brand-new record, so files upload fine on
  *create* too — fixed to show plain upload pickers in create mode,
  `OffboardingFileSlot`'s download/delete/replace-blocked UI only once a
  record (and therefore a file to conflict with) actually exists.
- Real reference lists ported from `Offboarding.vue`'s own hardcoded
  `data()`/computed values (not invented): 23 resignation reasons ending
  in "Others (Specify)" (saved as that literal string — `Offboarding.vue`
  has no working free-text follow-up field despite a *different*, unused
  legacy component nearby suggesting otherwise; `employee_offboardings`
  itself has no column for one either) and `compliance`'s 3 values
  (`Render 30 Days`, `Render 60 days`, `Non-Compliant` — kept the
  reference's own inconsistent capitalization rather than "fixing" it,
  since that's the literal value the backend and any existing data use).
- **Correction (2026-09-22, same day, caught by the user)**: this tab
  originally gated its whole-tab visibility on
  `employee-master-data-offboarding-list`, reasoning (from reading only
  `PermissionSeeder.php`'s source and `EmployeeOffboardingMaintenance`'s
  middleware) that the middleware's checked string was more authoritative
  than the seeder's. **That reasoning itself was the mistake** — neither
  file reflects what's actually true right now. Queried the live
  `vueportal` database directly (`docker exec vueportal_db mysql ...`,
  see [[docker-validation-stack]]) instead of reading source files, and
  found: `employee-master-data-offboarding-list` does not exist as a
  permission row **at all**, seeded or otherwise — 0 roles hold it,
  including Administrator, so the dedicated `/offboarding/index` endpoint
  (the global queue, unused by this tab anyway) is currently unreachable
  by anyone. Gating the tab on it would have hidden this feature from
  every single user. The actually-used, actually-granted permission
  (`employee-master-data-offboarding`, no suffix — 10 roles hold it,
  including every real offboarding-touching role) is exactly what
  `EmployeeInformationTabs.vue`'s live `tabItems` computed property checks
  for this tab's visibility (confirmed by reading that computed property
  directly — a `v-if`-per-tab block earlier in the same file that looks
  equivalent is dead, commented-out markup, not what actually renders;
  don't mistake one for the other again). Also `-create` (not `-add`,
  which is a real but Vue-unread legacy duplicate) is what `Offboarding.vue`
  actually checks for its Add button, and it does exist with real role
  grants — the "no role can ever get -create" claim in this file's first
  draft was also wrong, an artifact of only reading the seeder file
  instead of the live table. **Lesson generalized**: for any "which
  permission string actually gates X" question, check the live database
  and the actual rendering code path (not a commented-out lookalike, not
  a seed script that may be stale) before shipping a permission check —
  source-reading alone was insufficient here twice in one pass.
- **Same audit found (and fixed) a second, more consequential gap**: none
  of this session's 3 new sub-tabs (Performance Management, Disciplinary,
  Offboarding) were gating the *outer tab itself* — only their own inner
  sub-tabs. vueportal's `tabItems` computed property gates all 6 top-level
  tabs (Personal Data, Employee Details, Performance Management,
  Disciplinary Measures & Penalties, Offboarding, Attendance) on their own
  umbrella permission, hiding a tab entirely (not just emptying it) for a
  role that lacks it — confirmed for real in the live database: role
  "Payroll Admin" holds `employee-master-data-evaluation-regularization`
  (a Performance Management sub-permission) but **not**
  `employee-master-data-performance-management` (the umbrella), so the
  reference app hides the whole tab from them while this app's previous
  code would have shown it. Fixed in `EmployeeTabs.jsx` — it now filters
  its `Tabs items` by each tab's own umbrella permission, matching
  `tabItems()`'s `items.filter(value => value.hasPermission == true)`
  exactly. All 6 umbrella permissions confirmed present with real role
  grants in the live database before wiring them in.
- Permission strings in use (confirmed against the live database, not
  just source): `employee-master-data-offboarding` (tab visibility, via
  `EmployeeTabs.jsx` now — see above), `employee-master-data-offboarding-create/
  -edit/-delete/-file-download/-file-delete` (`-import`/`-template-download` seeded and
  checked consistently, not wired here — same scoping decision as every
  other sub-module's import/export tooling).
- **Validated the same way as every sub-tab this session**: `npm run
  lint` — 0 new errors/warnings in any file touched — and `npm run build`
  both clean via `rbac-react-dev`. Same not-validated gaps as every other
  entry above (no live backend round-trip, no browser click-through).

This closes out every sub-tab of Employee Master Data that vueportal's
reference has. Nothing is blocked anymore in this module — see "Deferred"
below for what's left, none of it gating.

**Deferred, in rough priority order:**
1. Profile picture upload/display.
2. Resign/rehire quick actions, new-hire sync from Careers Portal,
   dashboard counters (new-hired/for-regularization/NTE-open/
   disciplinary-open) — all present in the Vue reference, not ported.
3. Promodizer Brand **form** field (see "Decisions" item 4 above — the
   list column is done, the form field is not).
4. "Length of Service" list column — blocked on a backend fix (a
   `$table_fields` whitelist entry in `vueportal`, in all 3 duplicated
   locations) before it's safe to add. See "List Column Safety" above for
   the full explanation; this is the same class of bug Promodizer Brand
   was, just not yet fixed since it wasn't the one reported.

**Done, added 2026-09-16 from the master merge** (see their own section
below): Referral Code field, Employee Acknowledgment Report feature.

**Done, added 2026-09-16 from a header-list parity check against Vue**:
Job Title Code, Educ. Attainment, School Attended, Course, Employment
Type, Status columns (see "List Column Safety" above) — plus confirmed
`AntD Alert`'s `message` prop is deprecated in favor of `title` in the
installed v6.4.3 (documented in the root `CLAUDE.md`), fixed everywhere
in this module.

Each of these, when picked up, should follow this file's existing
patterns (service function → store action → form/table wiring) rather
than introducing a new shape — and should update this Roadmap and the
root `CLAUDE.md` section when done, the same way Manpower Request's own
history is tracked in its skill file.

---

## From `CLAUDE.md` (former "Employee Master Data Conventions" section)


Module status (2026-09-16): **core record wired up** (list with search/
pagination/column picker/bulk delete/Excel import, create, view, edit,
delete) using this repo's Zustand-per-resource + thin-service convention,
plus two additions ported from a `vueportal` `master`-branch merge: a
read-only **Referral Code** field (Employee Details tab), a standalone
**Employee Acknowledgment Report** feature (`/acknowledgment-reports`,
submitted from the list's bulk-action bar — see the skill for why this is
NOT the same thing as the Import feature despite vueportal's UI calling
the submit action "Upload Employee Report"), and (2026-09-22) **Excel
Export + Template Download** — scoped to just the core record's own
report type/template (vueportal's actual `/export` endpoint is a 4-way
report dispatcher and its template dialog covers 7 other sub-modules;
only the Employee Master Data pieces are wired here — see the skill for
the full scoping rationale and a real masked-200-JSON-error bug this
surfaced and fixed via the new `src/utils/downloadBlobResponse.js`), and
(2026-09-22) the **Performance Management tab** — all 7 sub-features
(Evaluation & Regularization, Monthly Key Performance, Classroom/OJT
Performance Rating, Branch Assignment & Positions, Merit History,
Training). Built after discovering that `/employee_master_data/index`
already eager-loads every one of these relations (and Disciplinary's and
Offboarding's) onto every row server-side — no new fetch endpoint was
needed, only UI. Also built (same session): the **Disciplinary Measures &
Penalties tab** (Issued NTE, Disciplinary Actions) — not built on the same
shared component as Performance Management since both sub-modules carry
multipart file uploads — and the **Attendance tab** (read-only, joined
server-side against a separate BioBridge system by `employee_code`, the
only sub-tab that needs its own fetch rather than reusing
`/employee_master_data/index`'s eager-loaded data; deliberately excludes
3 pieces of dead/unfinished UI found in the Vue reference itself — see the
skill), and the **Offboarding tab** — its "two data sources" question
(columns on `employee_master_data` vs. the separate `employee_offboardings`
table) is resolved, not just unbuilt: reading `Offboarding.vue`'s actual
save calls confirmed `employee_offboardings` is the live, authoritative
one. Every sub-tab vueportal's reference has is now built — nothing left
in this module is blocked. Starting
this session, changes are validated with real `npm run lint`/`npm run
build` runs via this project's Docker dev container (`rbac-react-dev`,
live bind-mounted) rather than manual review alone — see the skill for
how. A dedicated
`.claude/skills/employee-master-data/SKILL.md` has the full detail
(architecture, list toolbar layout, unconfirmed backend contracts,
roadmap) — this section is the fast-reference summary, kept in sync with
real code the way the Manpower Request section above is.

- Files: `src/pages/employee_master_data/` — `EmployeeMasterData.jsx`
  (list, with a title+actions row, a search+column-picker toolbar row, and
  a bulk-action bar), `CreateEmployee.jsx`/`EditEmployee.jsx`/
  `ViewEmployee.jsx` (thin wrappers around the shared
  `components/EmployeeForm.jsx`), `components/EmployeeTabs.jsx` (6-tab
  container), `components/tabs/*` (per-tab content),
  `components/EmployeeTable.jsx`/`EmployeeCardMobile.jsx` (desktop/mobile
  list rendering), `components/ColumnSelector.jsx`/`PaginationControls.jsx`,
  `components/ImportEmployeesModal.jsx` (Excel/CSV bulk import).
  `src/store/employeeStore.js`, `src/hooks/useEmployees.js`,
  `src/services/employee/employeeApi.js` (CRUD + file attachments +
  import) and the pre-existing `src/services/employee/employeeOptionApi.js`
  (dropdown/typeahead lookups only — not the CRUD surface, reused by
  Manpower Request's `EmployeeSelect.jsx`).
- **Registered** in both `AppRoutes.jsx` and `MainLayout.jsx` — reachable
  at `/employees`, `/employees/create`, `/employees/:id`,
  `/employees/:id/edit` (this last one was previously an unregistered
  page file despite existing — fixed).
- **No single-employee "show/{id}" endpoint exists on the backend** for
  this module (unlike Manpower Request's `/edit/{id}`) — only
  `index`/`store`/`update/{id}`/`delete`. `EditEmployee.jsx`/
  `ViewEmployee.jsx` therefore depend on the employee record being passed
  via React Router state from the list (`navigate(path, { state:
  { employee } })` in `EmployeeMasterData.jsx`), not a fetch. Opening
  either page directly or after a refresh shows a "return to list" `Result`
  instead of guessing at a fetch — this was a deliberate decision (see the
  skill's Roadmap), not an oversight; revisit only if a `show/{id}`
  endpoint is added backend-side.
- All service endpoints are POST-only
  (`/employee_master_data/index`, `/store`, `/update/{id}`, `/delete`,
  `/file_upload/{id}`, `/file_delete`, `/file_download`), matching Manpower
  Request's convention (this module's backend controller is POST-only
  throughout, including reads) — do not switch to REST verbs.
- **Server-side search + pagination**, not the client-side-filter
  convention most other list pages use — `employeeStore.fetchItems(params)`
  posts `{ page, items_per_page, search, table_headers }` and the backend
  returns a paginated slice, because the employee count is too large for
  in-memory filtering. `table_headers` (the currently-selected columns) is
  sent as part of the request and triggers a re-fetch on change — it isn't
  purely a client-side display concern here.
- Civil Status options (`Single`, `Married`, `Widowed`, `Legally
  Separated`) intentionally match `EmployeeMasterDataController`'s
  server-side validator exactly, **not** the vueportal reference UI's
  dropdown (which offers `Divorced`, a value the backend actually rejects
  with a 422 — a pre-existing bug in the reference app). Don't restore
  `Divorced`.
- Several request/response field names (the create/update response's
  resource key, the delete payload's id-list key, the file-upload response
  shape) are inferred from convention, not confirmed against the live
  `EmployeeMasterDataController` — the code defends against a couple of
  likely shapes rather than assuming one. See the skill's "Unconfirmed
  Backend Contracts" section before treating any of these as settled, and
  simplify the defensive fallbacks once confirmed.
- **Deferred** (placeholder `Empty` states in `EmployeeTabs.jsx`'s
  Performance Management / Disciplinary / Offboarding / Attendance tabs):
  each is its own CRUD module against its own vueportal route group
  (`employee_master_data/key_performance`, `/classroom_performance_rating`,
  `/ojt_performance_rating`, `/branch_assignment_position`,
  `/merit_history`, `/training`, `/nte`, `/disciplinary`, `/offboarding`,
  `/attendance`). Offboarding specifically needs a product decision before
  it can be built at all — vueportal keeps offboarding data in two places
  (columns on `employee_master_data` itself, and a separate
  `employee_offboardings` table) and which is authoritative isn't
  resolvable from the code — the data itself (`initialData.offboardings`)
  is already available, per the architecture note below. Excel
  Export/Template Download for those sub-modules are also deferred (each
  gets its own report/template wiring alongside its own tab, following the
  pattern `ExportEmployeesModal.jsx` already established for the core
  record — see the skill). The Promodizer Brand **form**
  field (conditional on Position = "Sales Specialist" in the Vue
  reference) is deferred too — no lookup store/hook for it exists in this
  repo yet; note the **list column** for it does exist and was bug-fixed
  (see the skill's Decisions section) — don't confuse the two.
- Permission strings in use: `employee-master-data-list`, `-create`,
  `-edit`, `-delete`, `-import`. The vueportal reference also seeds one
  permission per tab (`-personal-data`, `-employee-details`,
  `-performance-management`, `-disciplinary-measures-penalties`,
  `-offboarding`) plus many sub-module-specific ones — not yet checked
  client-side here since those tabs are still placeholders; add the
  per-tab gate when a tab goes from placeholder to real (see vueportal's
  `EmployeeInformationTabs.vue` `tabItems` computed property for the exact
  pattern to match).
- Bulk delete: row selection (`selectedRowKeys`) drives an `Alert`-based
  bulk-action bar shown only when something's selected — see the skill's
  "List Page Toolbar / Bulk Actions" section for the full layout rationale
  and why the header is split into two rows instead of one.
- Use `App.useApp()` for any `message`/`notification` call in this module,
  never the static `message`/`notification` import from `antd` directly —
  the static API can't consume this app's `<AntApp>` `ConfigProvider`
  context and raises a console warning. A real instance of this was found
  and fixed in `ColumnSelector.jsx`.
