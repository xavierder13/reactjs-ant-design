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
  EditEmployee.jsx                useLatestEmployee(id) → EmployeeForm mode="edit" (or a "not found" fallback)
  ViewEmployee.jsx                useLatestEmployee(id) → profile/EmployeeProfile view="hr" (Back/Edit actions, same fallback)
  profile/                        shared Employee Profile (see "Employee Profile"), also used by src/pages/user/UserProfile.jsx
  components/
    EmployeeForm.jsx              shared create/edit form (owns the single Form instance, Save/Cancel); its view mode is no longer routed
    EmployeeTabs.jsx              tab container for EmployeeForm, filters tabs by umbrella permission
    employeeTabItems.jsx          getEmployeeTabItems() + TAB_PERMISSIONS — tab definitions shared by EmployeeTabs and the profile
    EmployeeTable.jsx             desktop table + row actions (View/Edit/Delete)
    EmployeeCardMobile.jsx        mobile card list, same actions
    employeeColumns.jsx           list columns (EMPLOYEE_COLUMNS / DEFAULT_EMPLOYEE_COLUMNS), shared with the segment lists
    ColumnSelector.jsx            column picker (max 8 by default, `maxColumns` prop), part of the list request payload
    PaginationControls.jsx        mobile pagination UI
    EmployeeModal.jsx             UNUSED — see "Decisions" #3
    ImportEmployeesModal.jsx      Excel/CSV bulk import
    ExportEmployeesModal.jsx      Excel export (core record "Employee List" report only); optional presetValues/extraPayload/title
    SubmitAcknowledgmentReportModal.jsx  opened from the bulk-action bar
    FileSlotCard.jsx              attachment card (status tag, drag-drop picker, download/delete) + FileSlots row wrapper; used by NTE and Disciplinary dialogs
    tabs/
      PersonalDataTab.jsx         nested: personal/PersonalInformation.jsx + personal/FilesRequirements.jsx
      EmployeeDetailsTab.jsx      position/department/branch/employment type/dates/referral code
      PerformanceManagementTab.jsx  7 sub-tabs in performance/ (see "Sub-tabs")
      DisciplinaryTab.jsx         disciplinary/NteRecordsTab.jsx + disciplinary/DisciplinaryRecordsTab.jsx
                                  (form fields: NteFormFields.jsx / DisciplinaryFormFields.jsx; NteFileSlot.jsx)
      OffboardingTab.jsx          + offboarding/OffboardingFileSlot.jsx, offboarding/OffboardingFormFields.jsx
      AttendanceTab.jsx           read-only, own fetch
  lists/                          segment / open-case list pages (see "Segment and Open-Case Lists")
    EmployeeSegmentList.jsx       shared server-paginated list → HiredThisMonth.jsx, ForRegularization.jsx
    ResignedEmployees.jsx         latest offboarding per employee, date-filtered, edit/delete offboarding
    OpenCaseList.jsx              shared client-side queue list → OpenNteList.jsx, OpenDisciplinaryList.jsx
    BranchFilter.jsx, useListAccess.js  branch-name filter; `can()` (Administrator bypass) + canFilterByBranch
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

Branch / department / position options for the module (Employee Details,
Branch Assignment & Positions, Export and Submit Acknowledgment Report
modals, the segment lists' `BranchFilter`) come from the module's own
`POST /employee_master_data/create` → `{ branches, departments, positions }`
(`[{ id, name }]`, by name) via `employeeApi.getCreate` →
`employeeFormOptionsStore` (fetched once, `isLoaded` guard) →
`useEmployeeFormOptions()` (`{ label, value: id }` options). It's gated by
`employee-master-data-list`/`-create`/`-edit`. **Don't use** the generic
`useBranches`/`useDepartments`/`usePositions` here: they call
`/branch/index`, `/department/index`, `/position/get-all`, which need
`branch-list`/`department-list`/`position-list` — only Administrator / HR
Admin have them, so HR roles (Employee Master Data Administrator,
Recruitment & Hiring) and managers got 401 and empty dropdowns. The list's
own filters use `filterOptions` from the index response instead.

## Routes

Registered in both `AppRoutes.jsx` (`permissionRoutes`) and
`MainLayout.jsx` (`menuData` + `titleMap`/`getPageMeta`). Sidebar: the list pages
sit under Human Resource → Employee; Branch Reports and Branch Manpower Fill
Rate sit under the generic Human Resource → **Reports** submenu (`hr-reports`,
meant for every HR report — employee, recruitment, …):

```
/employees                 → EmployeeMasterData         (employee-master-data-list)
/employees/create          → CreateEmployee             (employee-master-data-create)
/employees/:id             → ViewEmployee = profile     (employee-master-data-list); `?tab=` keeps the open tab
/employees/:id/edit        → EditEmployee               (employee-master-data-create, employee-master-data-edit)
/acknowledgment-reports    → AcknowledgmentReportIndex  (employee-acknowledgment-reports)
/acknowledgment-reports/:id → AcknowledgmentReportView  (employee-acknowledgment-reports)
/reports/branch-manpower   → BranchManpowerReport       (employee-master-data-branch-manpower-export)
/employees/hired-this-month   → HiredThisMonth       (employee-master-data-for-regularization — the backend gates this list on it too)
/employees/for-regularization → ForRegularization    (employee-master-data-for-regularization)
/employees/resigned           → ResignedEmployees    (employee-master-data-resigned-list)
/employees/nte                → OpenNteList          (employee-master-data-nte-list)
/employees/disciplinary       → OpenDisciplinaryList (employee-master-data-disciplinary-list)
```

## API / Service Pattern

`employeeApi.js` — **all endpoints are POST** (same as Manpower Request,
unlike KPI's REST verbs; don't "unify"):

```js
getAll:           (payload) => axios.post('/employee_master_data/index', payload)
create:           (payload) => axios.post('/employee_master_data/store', payload)
update:           (id, payload) => axios.post(`/employee_master_data/update/${id}`, payload)
delete:           (ids) => axios.post('/employee_master_data/delete', { ids })
fileUpload:       (employeeId, file, meta) => axios.post(`/employee_master_data/file_upload/${employeeId}`, formData)  // file + document_type
fileDelete:       (fileId) => axios.post('/employee_master_data/file_delete', { id: fileId })
fileDownload:     (fileId) => axios.post('/employee_master_data/file_download', { file_id: fileId }, { responseType: 'blob' })
import:           (file) => multipart POST '/employee_master_data/import'
export:           (payload) => POST '/employee_master_data/export' (blob)
templateDownload: () => POST '/employee_master_data/template/download' (blob)
resign:           ({ employee_id, date_resigned }) => POST '/employee_master_data/resign'
```

`getAll` (`{ page, items_per_page, search, search_status, search_branch,
search_rank, search_position, sort_field, sort_order, table_headers }` in,
`{ employees: { data, current_page, per_page, total }, branches, positions,
ranks, subordinate_position_ids, departments, promodizer_brands }` out) is
**confirmed**. file_* are **confirmed** against the controller:
`file_upload` reads `file` + `document_type` (stored as `title`) and
answers HTTP 200 with `{ success, file }` or `{ error }` (string or
validator bag) — check `data.error`, a 200 isn't success;
`file_download` reads `file_id`, `file_delete` reads `id`.
Create/update/delete shapes are inferred — see "Unconfirmed Backend
Contracts".

`employeeOptionApi.js` is a **separate** lightweight dropdown service
(`/employee_master_data/option_list`) reused by Manpower Request's
`EmployeeSelect.jsx`. Don't merge it into `employeeApi.js`.

**Important backend fact:** `/employee_master_data/index` eager-loads every
sub-module relation onto every row — `monthly_key_performances`,
`classroom_performance_ratings`, `ojt_performance_ratings`,
`branch_assignment_positions`, `merit_histories`, `trainings`,
`explanations` (NTE), `disciplinaries`, `offboardings`. Since View/Edit
load the full row (`useLatestEmployee`), every sub-tab except Attendance
starts from `initialData.<relation>` with **no extra fetch**. Sub-module
services therefore have no `getAll`.

## State Management

`employeeStore.js`:
- `items`, `pagination` (`{ current, pageSize, total }`), populated by
  `fetchItems(params)`. **Server-side paginated/searched** (the employee
  count is too large for this repo's usual in-memory filtering), called
  directly with new params on search/page/column/status changes. Records
  per page: `PAGE_SIZE_OPTIONS` (10–500, sent as `items_per_page`, which
  the backend doesn't cap) in both the desktop `EmployeeTable` and mobile
  `PaginationControls`; changing the size goes back to page 1.
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
- **Toolbar row** (one wrapping `Space`): search (`Input` + `Button` in
  `Space.Compact`, clearing the box re-fetches), Status filter `Select`
  (All/Active/Inactive), Branch, Rank and Position `Select`s (searchable,
  clearable; Branch and Rank only for the all-branch roles — see below),
  a "Clear filters" button shown only while any filter is set
  (resets every filter, keeps the sort), `ColumnSelector`.
- **Default columns** (`DEFAULT_EMPLOYEE_COLUMNS`): Branch, Emp. Code, Job
  Title Code, Lastname, Firstname, Middlename, Job Description, Status — kept in
  `EMPLOYEE_COLUMNS` order, with Status last there so it stays last after
  `ColumnSelector` changes. The Status column renders a green `success` /
  grey `default` `Tag`, same as the View/Edit card header tag.
- **Status filter** posts `search_status: 'Active' | 'Inactive'`; "All" is
  sent as `undefined` (key omitted) — the backend has no `'All'` case.
  Changing it re-fetches page 1, and it's included in delete refetch
  payloads.
- **Branch / Rank / Position filters** post `search_branch` /
  `search_rank` / `search_position` as the **name** (option value = label)
  — the backend matches `b.name` / `g.name` / `f.name`
  (`employee_master_data.branch_id`/`position_id` and that position's rank,
  not the latest branch assignment); names are unique per Branch/Rank/
  PositionController validation. Cleared = key omitted. All params go
  through `buildParams()`, shared by fetch, refresh and delete refetches.
- **Filter options** come from the list response itself
  (`employeeStore.filterOptions` = `branches`, `positions`, `ranks`), not
  `useBranches`/`usePositions`/`/rank/index`: those need `branch-list`/
  `position-list`/`rank-list`, which almost no `employee-master-data-list`
  role has (Branch/Department Managers, HR roles → 401, empty dropdowns).
- **Who sees which filter**: Branch and Rank are shown only when
  `useListAccess().seesAllBranches` — the user has one of Administrator,
  Employee Master Data Administrator, Recruitment & Hiring, Payroll Admin,
  Employees Relation, Performance Management (exactly the roles
  `getEmployees()` doesn't scope). Scoped users (Branch Manager,
  Department/Division Manager, Section Head) get Status + Position only.
  (`canFilterByBranch`, used by the segment lists, also admits a
  "Department Manager" position — not used here.)
- **Branch Manager's Position options** = their position's subordinate
  positions (`subordinate_position_ids`, from `position_subs` of the
  signed-in user's position — 12 for the "Branch Manager" position), when
  the user has the Branch Manager role and none of the all-branch roles;
  falls back to every position if none are on record. Other scoped roles
  see every position.
- **Rank narrows Position**: with a Rank picked, Position lists only
  positions whose `rank_id` is that rank; picking a rank that excludes the
  selected position clears it in the same request. Clearing Rank keeps the
  position and restores every option.
- **Sorting** is server-side: every column is `sorter: true` with a
  controlled `sortOrder` (key = column `value`); a header click posts
  `sort_field` (the column `value`) + `sort_order` (`ascend`/`descend`),
  back to page 1; the third click clears it (backend default order). The
  backend maps `sort_field` through its own whitelist (join aliases for
  relation columns, real `employee_master_data` columns otherwise) and
  ignores anything else; `id` breaks ties. Empty relation values (`-`) sort
  first ascending. A sort on a column hidden via `ColumnSelector` is
  dropped. Paging and filtering keep the sort. A sort click fires only the
  Table's `onChange` (action `sort`), never `pagination.onChange`.
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
  `useEmployeeFormOptions` keyed on `.label`.
- **Evaluation & Regularization** is not a CRUD module: the core record's
  `regularization_date` (bare `Form.Item`, saved by the main Save) plus two
  files distinguished by `title` ("Performance for Regularization", "Memo
  of Regularization") on the core `file_upload`/`file_delete`/
  `file_download` endpoints — the title is sent as `document_type`. Each is a
  `FileSlotCard`; a picked file uploads immediately.

**Disciplinary Measures & Penalties** (`tabs/disciplinary/`):
- Standalone components (not `PerformanceRecordTab`) because create/update
  are multipart with files. `DisciplinaryRecordsTab.jsx` = one file per
  record; `NteRecordsTab.jsx` = two independent files (`nte_file`,
  `explanation_file`), each call needing its own `document_type`.
- The backends' `index()` endpoints are a **global open-cases queue**, not
  per-employee — this tab reads `explanations`/`disciplinaries` from
  `initialData`.
- Backend ignores a re-upload once a file exists; the file must be deleted
  first. UI: each file is a `FileSlotCard` (in the tab dialogs and the
  Open NTE/Disciplinary list dialogs) — drag-drop picker only when no file
  exists, otherwise Download/Delete; `NteFileSlot.jsx` wires it to `nteApi`.
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
- Three file slots (Last Day, Clearance, Quitclaim) — `OffboardingFileSlot`
  cards (shared `FileSlotCard`) in one `OffboardingFileSlots` row, also
  used by the Resigned list's edit modal. Pickable on **create** too;
  replace-blocked download/delete only once a file exists. Where the
  record can't be edited (employee View mode / no edit permission) the row
  action is View (eye), opening the modal read-only: fields disabled,
  download-only cards. It's wrapped in `ConfigProvider componentDisabled=
  {false}` because the employee page's View-mode `<Form disabled>` would
  otherwise disable the View/Download/Close buttons.
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

## Segment and Open-Case Lists

React counterparts of vueportal's EmployeeHiredThisMonth / EmployeeForRegularization /
EmployeeResigned / EmployeeNTEList / EmployeeDisciplinaryList pages; the Workforce
Dashboard's cards open them (`/vacancies` is the recruitment page `src/pages/recruitment/Vacancies.jsx`).
Each list's total matches its dashboard card.

- **Hired This Month / For Regularization** (`EmployeeSegmentList`): same rows as the
  main list (backend `getEmployees()` base), so the main list's columns, search,
  View/Edit via router state, delete and bulk delete all apply. Branch filter
  (`search_branch`, branch **name**) only for `canFilterByBranch`. Always sends
  `include_sales_specialist: false` (vueportal's toggle is commented out). No status
  filter — both endpoints are active-only.
- **Export**: For Regularization → `for_regularization/export` with the list filters.
  Hired This Month → the Employee List export **pre-filled** (Date Employed, 1st of
  month → today, Active Only, `include_sales_specialist: false`); vueportal's Hired
  page opens its dialog in "for regularization" mode and downloads the wrong list.
- **Resigned**: rows are `employee_offboardings` (latest per employee) + employee
  fields; column `title`s must equal `resignedQuery()`'s `$table_fields` names.
  Date filter (`date_field_param` + range, default Resignation Date Filed this month =
  the dashboard card). Edit reuses `OffboardingFormFields` + `OffboardingFileSlot`;
  the backend re-syncs `active`/`date_resigned` on offboarding update/delete, so no
  separate resign call here. Export → `resigned/export`.
- **NTE / Disciplinary (Open)** (`OpenCaseList`): the backends' `index()` queues
  (all open records in the caller's scope at once), so search, branch filter and
  paging are client-side. Edit reuses the tabs' form fields; a record set to Closed
  drops off on reload. Disciplinary actions are gated on `disciplinary-*` (what the
  backend checks) — vueportal's page checks `nte-*` by mistake.

## Export / Template Download

- Only the core-record pieces are wired: Export sends `report_type:
  'Employee List'` (the backend endpoint is a 4-way report dispatcher);
  Template calls the plain `template/download`. Other report/template
  types belong to their own sub-modules — add each following
  `ExportEmployeesModal.jsx`, not one giant dialog. The dispatcher's
  'Branch Manpower Report' is **not** used here — see Branch Manpower
  Fill Rate below.
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

## Branch Manpower Fill Rate

`branch_manpower/BranchManpowerReport.jsx` (+ `PositionColumnsPicker.jsx`),
`services/employee/branchManpowerApi.js`. R-5 report: Req / Exst / Vac per
position for each branch, grouped by Area Assignment, with fill-in rate
(Exst ÷ Req) and vacancy rate (Vac ÷ Req) per branch, area subtotal and
grand total, plus a per-position percentage row.

- Backend: vueportal `BranchManpowerReportController` +
  `BranchManpowerReportService`, POST `/employee_master_data/branch_manpower/
  options|report|export`, all gated by
  `employee-master-data-branch-manpower-export` in
  `EmployeeMasterDataMaintenance`. **Separate from** the dispatcher's legacy
  'Branch Manpower Report' (`App\Exports\BranchManpowerReport`), which
  vueportal's Vue `ExportDialog.vue` still uses unchanged.
- Numbers reproduce the legacy export (Exst = its *Ending* column) — the
  service docblock lists the legacy rules/quirks kept on purpose. The only
  known difference: an employee with two assignments on the same
  `date_assigned` (the service takes the last-entered row; the legacy
  query's pick depends on MySQL's plan).
- Filters: As of date; **Generate by** Per Area / Per Branch / Per HR Head
  Personnel, each with a multi-select (`ids`, empty = all; reset when the
  mode changes). Per Area groups by area (+ `UNASSIGNED` when all); Per
  Branch is one flat group; Per HR Head groups by `area_hr_heads` employee
  with the branches of every area they head (+ `NO HR HEAD` when all) — a
  branch under two heads shows in both, the grand total counts it once.
  Subtotal rows only appear with more than one group.
- Position columns: one always-editable list, pre-filled with the legacy
  17 (`default_positions`, includes the 4 Reserved columns that exist only
  by name) — add any position, remove, drag rows by the handle to reorder
  (`@hello-pangea/dnd`, as in the KPI template form), Reset restores the
  17. Not saved; applies to that generation/export only.
- Export = `.xlsx` with an `R-5` sheet (same order/filters as the screen)
  and a `Detailed` sheet in the legacy 7-measures-per-position layout.

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
  fetches by `:id`.
- `POST .../export` `{ acknowledgment_id }` → `.xlsx` blob.
- `POST .../delete` `{ acknowledgment_id }`.

Permissions: `employee-acknowledgment-reports` (list/view/submit),
`-export`, `-delete`, `-all`. Unconfirmed: the `user` display field (tries
`name`/`full_name`/`email`). The submit modal doesn't check selected
employees belong to the branch (neither does the backend).

## Employee Profile

`profile/EmployeeProfile.jsx` (ports vueportal's `EmployeeProfile2.vue`),
shared by `/employees/:id` (`view="hr"`) and `/user/profile`
(`view="self"`, only when `employee_master_data/my_profile` returns the
account's `users.employee_id` record; otherwise UserProfile shows just its
account form with an info Alert). Parts:
- `ProfileHeader.jsx` — photo (`profile_picture_upload/{id}`, gated
  `employee-master-data-profile-picture-upload`; image from the public
  web route via `utils/employeePhoto.js`), name, status/employment-type
  tags, contact, hire date / length of service / regularization or
  resigned date, Reports To (`reportingManager.js`, Vue's `manager` rule).
- `ProfileOverview.jsx` (personal, contact, gov IDs masked with reveal,
  education), `ProfileEmployment.jsx` (employment, job & org, assignment
  history timeline), `ProfileDocuments.jsx` (all core files; upload needs a
  document type → `document_type`; `-file-upload/-download/-delete`).
- HR view only: the record tabs (work schedule, attendance, performance,
  disciplinary, offboarding) from `getEmployeeTabItems({ mode: 'view' })`,
  each in its own non-disabled `<Form>` (view mode hides mutations;
  `disabled` would also kill downloads/attendance filters).
- Gating: HR sections follow `TAB_PERMISSIONS` (Overview/Documents =
  personal-data, Employment = employee-details); self view always shows
  Overview/Employment/Documents but actions still need their permission.
  Administrator passes every gate. `extraTabs` adds UserProfile's
  "Account & Security" tab.

## Decisions (and why)

1. **View/Edit re-read the employee on every open.** The backend has **no
   `show/{id}` endpoint** (only `index`/`store`/`update/{id}`/`delete`), so
   `src/hooks/useLatestEmployee.js` calls `index` with
   `table_headers: [{ text: 'ID', value: 'employee_master_data.id' }]`,
   `search: id` and keeps the exact-id match (same `getEmployees()` row
   shape). The list still passes the row in router state, but only as a
   fallback (fetch failed, or an edit-only user lacking
   `employee-master-data-list`): that snapshot survives a browser refresh
   and goes stale after any immediate save (files, sub-records), which hid
   just-uploaded files. User-requested. If a `show/{id}` endpoint is added,
   switch the hook to it.
2. **Civil Status matches the backend validator** (`Single`, `Married`,
   `Widowed`, `Legally Separated`), not Vue's dropdown (`Divorced`, which
   its own backend rejects). User-confirmed. Don't restore `Divorced`.
3. **`EmployeeModal.jsx` is unused** — a modal shell kept for a possible
   future quick-edit; not on any code path.
4. **Promodizer Brand**: the list column exists; the Employee Details
   **form field** (Vue: conditional on Position = "Sales Specialist") is
   not built because `/employee_master_data/create` doesn't return
   promodizer brands yet — add them there (and to `useEmployeeFormOptions`)
   first.
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
2. Resign/rehire quick actions, new-hire sync from Careers Portal, the
   Employee Master Data index's mini cards (the lists exist and are reachable
   from the sidebar and the Workforce Dashboard cards).
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
