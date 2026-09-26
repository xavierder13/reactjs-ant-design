---
name: employee-master-data
description: Established architecture, files, and conventions for the Employee Master Data module in this HRIS app, plus what's deferred and why. Use for any task that adds, fixes, or extends Employee Master Data pages, forms, the core record's CRUD, or any of its sub-tabs (Performance Management, Disciplinary, Offboarding, Attendance).
---

# Employee Master Data Module

**Status:** complete relative to the vueportal reference — core record CRUD
(list with server-side search/pagination/column picker/status filter, bulk
delete, Excel import/export, template download, create, view, edit,
delete), all 6 record tabs (Personal Data, Employee Details, Performance
Management, Disciplinary Measures & Penalties, Offboarding, Attendance),
Referral Code display, and the separate Employee Acknowledgment Report
feature. Nothing in this module is blocked; see "Deferred" at the end.

This file describes the **current** state only. The dated history (how each
piece was built, bugs found, verification runs, corrections) is in
`docs/employee-master-data-history.md` — read it only when you need the
*why/when* behind a rule.

The backend is `vueportal` (`EmployeeMasterDataController`,
`EmployeeMasterData` model, and one controller per sub-module) — this repo
can't see it when run on its own. This file records what was confirmed from
that backend and flags what's unconfirmed; don't guess beyond it.

## Architecture / File Map

```
src/pages/employee_master_data/
  EmployeeMasterData.jsx          list page (title+actions row, search/status/column toolbar, bulk-action bar)
  CreateEmployee.jsx              thin wrapper → EmployeeForm mode="create"
  EditEmployee.jsx                reads router state → EmployeeForm mode="edit" (or a "return to list" fallback)
  ViewEmployee.jsx                reads router state → EmployeeForm mode="view" (read-only, same fallback)
  components/
    EmployeeForm.jsx              shared create/edit/view form (owns the single Form instance, Save/Cancel)
    EmployeeTabs.jsx              6-tab container, filters tabs by umbrella permission, threads mode/initialData
    EmployeeTable.jsx             desktop table + row actions (View/Edit/Delete)
    EmployeeCardMobile.jsx        mobile card list, same actions
    ColumnSelector.jsx            up-to-8-column picker, part of the list request payload
    PaginationControls.jsx        mobile pagination UI
    EmployeeModal.jsx             UNUSED — see "Decisions" #3
    ImportEmployeesModal.jsx      Excel/CSV bulk import
    ExportEmployeesModal.jsx      Excel export (core record "Employee List" report only)
    SubmitAcknowledgmentReportModal.jsx  opened from the bulk-action bar
    tabs/
      PersonalDataTab.jsx         nested: personal/PersonalInformation.jsx + personal/FilesRequirements.jsx
      EmployeeDetailsTab.jsx      position/department/branch/employment type/dates/referral code
      PerformanceManagementTab.jsx  7 sub-tabs in performance/ (see "Sub-tabs")
      DisciplinaryTab.jsx         disciplinary/NteRecordsTab.jsx + disciplinary/DisciplinaryRecordsTab.jsx
      OffboardingTab.jsx          + offboarding/OffboardingFileSlot.jsx
      AttendanceTab.jsx           read-only, own fetch
  acknowledgment_report/
    AcknowledgmentReportIndex.jsx   /acknowledgment-reports
    AcknowledgmentReportView.jsx    /acknowledgment-reports/:id

src/store/employeeStore.js, src/store/acknowledgmentReportStore.js
src/hooks/useEmployees.js, src/hooks/useAcknowledgmentReports.js
src/services/employee/
  employeeApi.js                  core CRUD + files + import/export/template + resign
  employeeOptionApi.js            dropdown/typeahead lookups only (also used by Manpower Request)
  employeeAcknowledgmentReportApi.js
  keyPerformanceApi.js, classroomPerformanceRatingApi.js, ojtPerformanceRatingApi.js,
  branchAssignmentPositionApi.js, meritHistoryApi.js, trainingApi.js,
  nteApi.js, disciplinaryApi.js, offboardingApi.js, attendanceApi.js
src/utils/downloadBlobResponse.js  blob download that detects a JSON error body (see "Export / Template")
```

Reference/lookup data for Employee Details comes from the generic hooks —
`useBranches`, `useDepartments`, `usePositions` — not a module-specific
fetch like Manpower Request's `fetchFormData()`.

## Routes

Registered in both `AppRoutes.jsx` (`permissionRoutes`) and
`MainLayout.jsx` (`menuData` + `titleMap`/`getPageMeta`):

```
/employees                 → EmployeeMasterData         (employee-master-data-list)
/employees/create          → CreateEmployee             (employee-master-data-create)
/employees/:id             → ViewEmployee               (employee-master-data-list)
/employees/:id/edit        → EditEmployee               (employee-master-data-create, employee-master-data-edit)
/acknowledgment-reports    → AcknowledgmentReportIndex  (employee-acknowledgment-reports)
/acknowledgment-reports/:id → AcknowledgmentReportView  (employee-acknowledgment-reports)
```

## API / Service Pattern

`employeeApi.js` — **all endpoints are POST** (same as Manpower Request,
unlike KPI's REST verbs; don't "unify"):

```js
getAll:           (payload) => axios.post('/employee_master_data/index', payload)
create:           (payload) => axios.post('/employee_master_data/store', payload)
update:           (id, payload) => axios.post(`/employee_master_data/update/${id}`, payload)
delete:           (ids) => axios.post('/employee_master_data/delete', { ids })
fileUpload:       (employeeId, file, meta) => axios.post(`/employee_master_data/file_upload/${employeeId}`, formData)
fileDelete:       (fileId) => axios.post('/employee_master_data/file_delete', { id: fileId })
fileDownload:     (fileId) => axios.post('/employee_master_data/file_download', { id: fileId }, { responseType: 'blob' })
import:           (file) => multipart POST '/employee_master_data/import'
export:           (payload) => POST '/employee_master_data/export' (blob)
templateDownload: () => POST '/employee_master_data/template/download' (blob)
resign:           ({ employee_id, date_resigned }) => POST '/employee_master_data/resign'
```

`getAll` (`{ page, items_per_page, search, search_status, table_headers }`
in, `{ employees: { data, current_page, per_page, total } }` out) is
**confirmed**. Create/update/delete/file_* shapes are inferred — see
"Unconfirmed Backend Contracts".

`employeeOptionApi.js` is a **separate** lightweight dropdown service
(`/employee_master_data/option_list`) reused by Manpower Request's
`EmployeeSelect.jsx`. Don't merge it into `employeeApi.js`.

**Important backend fact:** `/employee_master_data/index` eager-loads every
sub-module relation onto every row — `monthly_key_performances`,
`classroom_performance_ratings`, `ojt_performance_ratings`,
`branch_assignment_positions`, `merit_histories`, `trainings`,
`explanations` (NTE), `disciplinaries`, `offboardings`. Since View/Edit
receive the full row via router state, every sub-tab except Attendance
starts from `initialData.<relation>` with **no extra fetch**. Sub-module
services therefore have no `getAll`.

## State Management

`employeeStore.js`:
- `items`, `pagination` (`{ current, pageSize, total }`), populated by
  `fetchItems(params)`. **Server-side paginated/searched** (the employee
  count is too large for this repo's usual in-memory filtering), called
  directly with new params on search/page/column/status changes.
- `deleteEmployee(ids, refetchParams)` — optimistically removes the row(s),
  then refetches to reconcile pagination/total.
- No `current`/`fetchById` — there's no endpoint for it (see "Decisions" #1).

`useEmployees.js` wraps `items`/`pagination`/`isLoading`/`error` and returns
`fetchItems`/`deleteEmployee`. **It deliberately does NOT auto-fetch on
mount** (unlike `useBranches`/`usePositions`/`useManpowerRequests`) — the
list page does its own params-based mount fetch, and a second one raced it.
Don't reintroduce a mount effect.

Sub-tabs don't use Zustand stores: each keeps local `useState` seeded from
`initialData.<relation>` and replaced by the list each store/update/delete
response returns (same pattern as `FilesRequirements.jsx`).

## Forms

`EmployeeForm.jsx` is shared between create/edit/view (`mode` prop),
mirroring `ManpowerRequestForm.jsx`:

- One `Form.useForm()` instance, `<Form form={form} layout="vertical"
  disabled={mode === 'view'}>` — `disabled` cascades to every descendant
  `Form.Item`, which is how view mode is read-only.
- `EmployeeTabs.jsx` renders inside that one `<Form>`; every tab's fields
  are bare `Form.Item`s with **no own `<Form>`/`useForm()`**. **Never wrap a
  tab's fields in its own `<Form>`** — it silently detaches them from
  `validateFields()` and the `disabled` cascade. AntD `Tabs` keeps inactive
  panes mounted, so values survive tab switches.
- `buildPayload(values)` maps form values (dayjs → `'YYYY-MM-DD'`, `active`
  → boolean) into the payload — extend it for new core fields (e.g.
  `regularization_date`), don't build payloads ad hoc.
- Edit/View pre-fill via `form.setFieldsValue` in a `useEffect` on
  `initialData`, converting dates back to dayjs. Falls back to
  `initialData.dob` when `birth_date` is absent (schema column is `dob`,
  validated request field is `birth_date`).
- Derived display values (e.g. Age) must use `Form.useWatch(...)`, not a
  field's `onChange` — `setFieldsValue` doesn't fire `onChange`.
- After an update, the fallback record (`{ ...initialData, ...payload }`)
  drops a nested relation object (`position`/`department`/`branch`) when
  its FK changed, so stale Rank/Division/Company isn't shown.
- On create, Save navigates to `/employees/:id` (View) with the saved
  record in router state.

## Validation

- Client-side `rules` match `EmployeeMasterDataController`'s validator
  field-for-field, except Civil Status (see "Decisions" #2).
- Server-side 422s via the shared `handleApiError` — no module-specific
  error handling. Exception: sub-module save handlers must branch on
  `data.success`, not assume success.

## List Page Toolbar / Bulk Actions

`EmployeeMasterData.jsx`'s header is two rows (one row didn't sum to 24
columns once a permission hid a button):

- **Card `title`**: page title (left) + page-level actions (right, `Space
  wrap`): Refresh, Import, Export, Template, Add Employee (each
  permission-gated). `Row justify="space-between" align="middle" wrap`.
- **Toolbar row**: search (`Input` + `Button` in `Space.Compact`), Status
  filter `Select` (All/Active/Inactive), `ColumnSelector`.
- **Status filter** posts `search_status: 'Active' | 'Inactive'`; "All" is
  sent as `undefined` (key omitted) — the backend has no `'All'` case.
  Changing it re-fetches page 1, and it's included in delete refetch
  payloads.
- **Bulk action bar**: an `Alert` (`type="info"`) shown only when
  `selectedRowKeys.length > 0` — selection count, Clear selection,
  permission-gated Delete Selected (`Popconfirm` →
  `deleteEmployee(selectedRowKeys, refetchParams)`), and Submit
  Acknowledgment Report. Follow this pattern for any future bulk action.
- Use `App.useApp()` for every `message`/`notification` in this module —
  never the static `antd` import (it can't consume the `<AntApp>` context
  and warns).

## List Column Safety — the `$table_fields` Whitelist Trap

`EmployeeMasterData.jsx`'s `headers` array drives both display
(`dataIndex`/`render`) and, via `value`, the `table_headers` payload. The
backend (`EmployeeMasterDataController::index()`, duplicated in
`employees_for_regularization()`/`employees_hired_this_month()`) uses
`value` as a **literal raw SQL column** in the search `WHERE` for any
column whose title isn't in its hardcoded `$table_fields` whitelist
(Branch, Company, Department, Division, Job Description, Rank, Status,
Promodizer Brand). **Any new column needs one of:**
1. its `title` matches a whitelist entry, or
2. its `value` is a real top-level column on `employee_master_data`.
Otherwise selecting it throws `Unknown column '<value>' in 'where clause'`
(SQLSTATE 42S22).

- Nested relation columns: use the top-level relation key as `dataIndex`
  plus a `render` that drills in (AntD does not split a dotted string
  `dataIndex`).
- **Length of Service — do not add** until vueportal adds a whitelist
  entry (in all 3 locations): it's a computed `TIMESTAMPDIFF ... AS
  length_of_service` alias, not usable in `WHERE`. Vue's own reference
  has this bug too.
- **Birthday** correctly uses `dob`; don't "fix" it to Vue's
  `birth_date` (not a column).

## Permissions

- Core: `employee-master-data-list`, `-create`, `-edit`, `-delete` (also
  bulk delete), `-import`, `-export`, `-template-download`.
- **Outer tabs** are filtered in `EmployeeTabs.jsx` (`TAB_PERMISSIONS`) by
  umbrella permission — a tab the user lacks is absent from `items`, not
  disabled: `-personal-data`, `-employee-details`,
  `-performance-management`, `-disciplinary-measures-penalties`,
  `-offboarding`, `-attendance`. Inner sub-tabs are filtered the same way
  by their own permission. A role can hold a sub-permission without the
  umbrella (e.g. Payroll Admin) — that must hide the whole tab.
- Sub-modules use `employee-master-data-<sub>-list/-create/-edit/-delete`
  for `key-performance`, `classroom-performance-rating`,
  `ojt-performance-rating`, `branch-assignment-position`, `merit-history`,
  `training`; `nte-*` and `disciplinary-*` add `-file-download`/
  `-file-delete`; offboarding uses `-offboarding` (tab) +
  `-offboarding-create/-edit/-delete/-file-download/-file-delete`;
  Evaluation & Regularization uses `-evaluation-regularization` only.
  `-import`/`-template-download` variants per sub-module are seeded but not
  wired.
- **Rule for any new permission check: confirm the string against the
  live database and the code path the Vue reference actually renders**,
  not `PermissionSeeder.php` or a commented-out lookalike. Both were wrong
  here before (e.g. `employee-master-data-offboarding-list` doesn't exist
  in the live DB at all; `-offboarding-add` is a legacy duplicate —
  `-create` is the live one).

## Sub-tabs

**Performance Management** (`tabs/performance/`):
- `PerformanceRecordTab.jsx` — generic list+modal CRUD shared by
  Classroom/OJT Performance Rating, Merit History, Training (thin
  field-config wrappers) and Branch Assignment & Positions. Each
  store/update/delete returns the employee's full remaining list for that
  relation, which becomes the new local state.
- **Monthly Key Performance** (bespoke `MonthlyKeyPerformanceTab.jsx`):
  "Add Period" creates all 12 months of a year in one call (`grade: null`
  each — not Vue's `grade: ""`); "Delete Period" removes a year's 12 rows
  by `employee_id`+`period`; only a single row's `grade` is editable.
- **Branch Assignment & Positions** side effect: backend store/update/
  delete overwrite the employee's own `branch_id`/`position_id`/
  `department_id` to match the latest `date_assigned` row, so it can
  change what Employee Details shows (surfaced as a warning `Alert`).
  `branch`/`position` here are **name strings**, not ids — Selects reuse
  `useBranches`/`usePositions` keyed on `.label`.
- **Evaluation & Regularization** is not a CRUD module: the core record's
  `regularization_date` (bare `Form.Item`, saved by the main Save) plus two
  files distinguished by `title` ("Performance for Regularization", "Memo
  of Regularization") on the core `file_upload`/`file_delete`/
  `file_download` endpoints; files persist immediately.

**Disciplinary Measures & Penalties** (`tabs/disciplinary/`):
- Standalone components (not `PerformanceRecordTab`) because create/update
  are multipart with files. `DisciplinaryRecordsTab.jsx` = one file per
  record; `NteRecordsTab.jsx` = two independent files (`nte_file`,
  `explanation_file`), each call needing its own `document_type`.
- The backends' `index()` endpoints are a **global open-cases queue**, not
  per-employee — this tab reads `explanations`/`disciplinaries` from
  `initialData`.
- Backend ignores a re-upload once a file exists; the file must be deleted
  first. UI: picker only when no file exists, otherwise Download/Delete.
- Fixed lists from the reference: `offenses` (8), `disciplinary_measures`
  (6), `offense_series` (First–Fifth), as closed `Select`s; `status`
  `Open`/`Closed`. `offense_type` is free text.

**Offboarding** (`OffboardingTab.jsx`, `offboarding/OffboardingFileSlot.jsx`,
`offboardingApi.js`):
- `employee_offboardings` (via `EmployeeOffboardingController`) is the
  **authoritative** source. The resignation columns on
  `employee_master_data` are a legacy holdover (still read by the export,
  never written by the live UI). Settled — don't re-litigate.
- Saving an offboarding record then calls `employeeApi.resign({
  employee_id, date_resigned: last_day_of_work })` to flip the core
  employee's `active`/`date_resigned`. Best-effort: a failure is shown but
  doesn't roll back the saved record (same as the reference).
- Three file slots (Last Day, Clearance, Quitclaim) can be uploaded on
  **create** too; replace-blocked download/delete UI only once a file
  exists.
- Fixed lists: 23 resignation reasons ending in "Others (Specify)" (saved
  literally, no free-text follow-up); `compliance`: `Render 30 Days`,
  `Render 60 days`, `Non-Compliant` (keep the capitalization — it's the
  stored value).

**Attendance** (`AttendanceTab.jsx`, `attendanceApi.js`):
- Read-only biometric logs from a separate `biobridge` DB connection,
  keyed by `employee_code`. The **only** sub-tab with its own fetch:
  `POST /employee_master_data/attendance` `{employee_code, date_from,
  date_to, page, items_per_page}` → Laravel paginator of
  `{date, time_in, time_out, break_in, break_out, break_logs: [{punch, time}]}`.
- Range UX: Last 7 / Last 30 days (fetch immediately) / By Period (manual
  dates + Search). Break chip opens a modal of raw punches.
- Deliberately excludes the reference's dead UI (Overtime/Late-Early/No Pay
  toggles, hardcoded badge counts, Out Time/Work Hours/No Pay columns that
  are never populated) and its Download menu items.

## Export / Template Download

- Only the core-record pieces are wired: Export sends `report_type:
  'Employee List'` (the backend endpoint is a 4-way report dispatcher);
  Template calls the plain `template/download`. Other report/template
  types belong to their own sub-modules — add each following
  `ExportEmployeesModal.jsx`, not one giant dialog.
- `ExportEmployeesModal.jsx` mirrors `ExportDialog.vue`: Branch picker only
  for `hasAnyRole('Administrator', 'Employee Master Data Administrator',
  'Recruitment & Hiring', 'Payroll Admin', 'Employees Relation',
  'Performance Management')` (others omit `branch_id`; scoped server-side);
  Date Field Parameter (Date Employed / Date Assigned-Deployed / Date
  Resigned); Document Status (All / Active Only) **hidden** when Date
  Resigned; one `RangePicker`; no future-date restriction.
- `template_download` returns **HTTP 200 with a JSON error body** on
  failure. Always download blobs via `src/utils/downloadBlobResponse.js`,
  which checks `Content-Type` and surfaces the JSON error instead of saving
  a corrupt file. Known gap: non-200 blob errors still show a generic
  message (shared `handleApiError` doesn't parse Blob bodies) — left alone.

## Referral Code Field

Read-only on `EmployeeDetailsTab.jsx`, edit/view only, shown when
`initialData.referral?.referral_code` exists. A copy button builds
`https://recruitment.addessa.com/careers?ref=<code>` (must match
`EmployeeInformationTabs.vue`'s `referralLink`) via
`navigator.clipboard.writeText`. Generated server-side
(`applyReferralCode()`); never in `buildPayload()`.

## Employee Acknowledgment Report

A **separate feature**, not a record tab. Vue labels its create button
"Upload Employee Report", but it does **not** upload a file — it snapshots
the current row selection (each row's active/inactive status, a `Switch`
here) as a branch-scoped report. Don't confuse it with Import (which
creates/updates employees from a spreadsheet).

Backend (`EmployeeAcknowledgmentReportController`):
- `GET /employee_master_data/acknowledgment_reports` → `{ branches: [...] }`
  each with nested `acknowledgment_reports` (`user` loaded); scoped to the
  caller's branch unless `employee-acknowledgment-reports-all`
  (server-side only — no UI distinction needed).
- `POST .../store` `{ branch_id, employees: [{ employee_id, is_active }] }`
  — `is_active` is a snapshot, doesn't change the employee.
- `POST .../view` `{ acknowledgment_id }` → full report with nested
  employees — a real single-record fetch, so `AcknowledgmentReportView.jsx`
  fetches by `:id` (works on refresh, unlike ViewEmployee).
- `POST .../export` `{ acknowledgment_id }` → `.xlsx` blob.
- `POST .../delete` `{ acknowledgment_id }`.

Permissions: `employee-acknowledgment-reports` (list/view/submit),
`-export`, `-delete`, `-all`. Unconfirmed: the `user` display field (tries
`name`/`full_name`/`email`). The submit modal doesn't check selected
employees belong to the branch (neither does the backend).

## Decisions (and why)

1. **Router state, not a fetch, for View/Edit.** The backend has **no
   `show/{id}` endpoint** (only `index`/`store`/`update/{id}`/`delete`).
   The list passes the row via `navigate(path, { state: { employee } })`;
   View/Edit fall back to a "return to list" `Result` when opened directly
   or after refresh. User-confirmed; revisit only if a `show/{id}` endpoint
   is added — never add a fetch-by-id call that doesn't exist.
2. **Civil Status matches the backend validator** (`Single`, `Married`,
   `Widowed`, `Legally Separated`), not Vue's dropdown (`Divorced`, which
   its own backend rejects). User-confirmed. Don't restore `Divorced`.
3. **`EmployeeModal.jsx` is unused** — a modal shell kept for a possible
   future quick-edit; not on any code path.
4. **Promodizer Brand**: the list column exists; the Employee Details
   **form field** (Vue: conditional on Position = "Sales Specialist") is
   not built because there's no promodizer-brand lookup store/hook yet —
   add one (like `useBranches`) first.
5. **Rank / Division / Company / Cost Center / Date Assigned / Length of
   Service** on Employee Details are read-only, best-effort (optional
   chaining, blank when absent), never sent in the payload.

## Unconfirmed Backend Contracts

Verify against a real request/response before relying on these, then
simplify the defensive code:
- The resource key on `store`/`update` responses — `EmployeeForm.jsx`
  falls back through a couple of likely keys.
- `delete`'s id-list payload key (assumed `{ ids: [...] }`).
- `file_upload`'s response shape and file object field names —
  `FilesRequirements.jsx` renders defensively.
- Whether `date_assigned`/`length_of_service`/`cost_center` are present on
  `index()` rows.
- `import`'s column layout and per-row error shape (errors shown generically
  via `handleApiError`).

## Backend Facts and Known Backend Bugs (vueportal-owned, not fixed here)

1. Validated field `birth_date` vs. schema column `dob`.
2. `employee_code` has **no uniqueness validation** server-side despite
   being the business key and the attendance join key.
3. Backend `store()`/`update()` are **not** in a `DB::transaction()` —
   don't assume atomicity.
4. `EmployeeKeyPerformanceController` has no `index()` despite a
   registered route; Classroom/OJT controllers have registered `/import`
   and `/template/download` routes with no methods. Not called here.
5. `employee-master-data-offboarding-list` doesn't exist in the live DB,
   so `/offboarding/index` is unreachable. Not used here.

## Deferred (none of it blocking), rough priority order

1. Profile picture upload/display.
2. Resign/rehire quick actions, new-hire sync from Careers Portal,
   dashboard counters (new-hired/for-regularization/NTE-open/
   disciplinary-open).
3. Promodizer Brand form field (needs a lookup source — "Decisions" #4).
4. "Length of Service" column (needs a vueportal whitelist fix first).
5. Sub-module import/export/template tooling (Performance, NTE,
   Disciplinary, Offboarding, Attendance reports).

## Common Mistakes To Avoid

- Adding a fetch-by-id to `employeeApi.js` (the endpoint doesn't exist).
- Wrapping a tab's fields in their own `<Form>`/`useForm()`.
- Re-adding a mount auto-fetch to `useEmployees.js`.
- Restoring `Divorced`, or "matching Vue exactly" where Vue and its own
  backend disagree — check the backend validator.
- Adding a list column without the `$table_fields` check.
- Gating on a permission string taken from the seeder instead of the live
  DB / the Vue code path that actually renders.
- Treating the offboarding data-source question as open.
- Switching this module's calls from POST to REST verbs.
- Treating an "Unconfirmed Backend Contracts" item as settled.

## Keeping this file current

After changing this module, **edit the relevant section above in place**
so it describes the new current state, and delete anything the change made
untrue. Don't append dated "Done, added YYYY-MM-DD" entries; put the
narrative (what changed, why, bugs found, how it was verified) in the
commit message and, if worth keeping, `docs/employee-master-data-history.md`.
