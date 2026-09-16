---
name: employee-master-data
description: Established architecture, files, and conventions for the Employee Master Data module in this HRIS app, plus what's deferred and why. Use for any task that adds, fixes, or extends Employee Master Data pages, forms, the core record's CRUD, or any of its sub-tabs (Performance Management, Disciplinary, Offboarding, Attendance).
---

# Employee Master Data Module

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

vueportal has its own project-specific `CLAUDE.md`/skills for the backend
side of this module (`EmployeeMasterDataController`, `EmployeeMasterData`
model) — read that repo directly for anything backend-shaped; this file
only covers frontend-specific conventions and flags where the backend
contract is genuinely unconfirmed (see "Unconfirmed Backend Contracts"
below) rather than guessing at it.

## Architecture / File Map

```
src/pages/employee_master_data/
  EmployeeMasterData.jsx          list page (search, column picker, desktop/mobile table)
  CreateEmployee.jsx              thin wrapper → EmployeeForm mode="create"
  EditEmployee.jsx                reads router state → EmployeeForm mode="edit" (or a "return to list" fallback)
  ViewEmployee.jsx                reads router state → EmployeeForm mode="view" (read-only, same fallback)
  components/
    EmployeeForm.jsx              shared create/edit/view form (owns the single Form instance, Save/Cancel)
    EmployeeTabs.jsx              6-tab container, threads mode/initialData to each tab
    EmployeeTable.jsx             desktop table + row actions (View/Edit/Delete)
    EmployeeCardMobile.jsx        mobile card list, same actions
    ColumnSelector.jsx            up-to-8-column picker, part of the list request payload
    PaginationControls.jsx        mobile pagination UI
    EmployeeModal.jsx             UNUSED — see "Decisions" below
    ImportEmployeesModal.jsx      Excel/CSV bulk import (POST /employee_master_data/import)
    SubmitAcknowledgmentReportModal.jsx  opened from the list's bulk-action bar — see "Employee Acknowledgment Report" below
    tabs/
      PersonalDataTab.jsx         nested tabs: Personal Information + Files & Requirements
      EmployeeDetailsTab.jsx      real fields (position/department/branch/employment type/dates/referral code)
      PerformanceManagementTab.jsx   placeholder (7 sub-tabs, all Empty)
      DisciplinaryTab.jsx            placeholder (2 sub-tabs, all Empty)
      OffboardingTab.jsx             placeholder (blocked on a product decision, see below)
      AttendanceTab.jsx              placeholder
      personal/
        PersonalInformation.jsx   real fields (name, DOB, gender, civil status, contact, TIN/SSS/etc.)
        FilesRequirements.jsx     real upload/list/delete/download UI (needs an existing employee id)

src/store/employeeStore.js                        zustand store
src/services/employee/employeeApi.js               CRUD + file attachment + import axios service
src/services/employee/employeeOptionApi.js          pre-existing — dropdown/typeahead lookups only
src/hooks/useEmployees.js                           list hook (wraps store.fetchItems)

src/pages/employee_master_data/acknowledgment_report/
  AcknowledgmentReportIndex.jsx    list (branches flattened into one table), route /acknowledgment-reports
  AcknowledgmentReportView.jsx     single report + its employee snapshots, route /acknowledgment-reports/:id
src/store/acknowledgmentReportStore.js
src/services/employee/employeeAcknowledgmentReportApi.js
src/hooks/useAcknowledgmentReports.js
```

Reference/lookup data for the Employee Details tab comes from this repo's
existing generic hooks — `useBranches`, `useDepartments`, `usePositions` —
**not** a module-specific fetch like Manpower Request's `fetchFormData()`.
There was no existing reason to duplicate those stores for this module.

## Routes

Registered in both `AppRoutes.jsx` (`permissionRoutes`) and
`MainLayout.jsx` (`menuData` + `getPageMeta`, which already had a regex
case for `/employees/:id/edit` before this module's edit route was
actually registered — only `AppRoutes.jsx` needed the addition):

```
/employees            → EmployeeMasterData   (employee-master-data-list)
/employees/create     → CreateEmployee       (employee-master-data-create)
/employees/:id        → ViewEmployee         (employee-master-data-list)
/employees/:id/edit   → EditEmployee         (employee-master-data-create, employee-master-data-edit)
```

## API / Service Pattern

`src/services/employee/employeeApi.js` — **all endpoints are POST**,
matching this module's backend controller (same convention as Manpower
Request, unlike KPI's REST verbs):

```js
getAll:       (payload) => axios.post('/employee_master_data/index', payload)
create:       (payload) => axios.post('/employee_master_data/store', payload)
update:       (id, payload) => axios.post(`/employee_master_data/update/${id}`, payload)
delete:       (ids) => axios.post('/employee_master_data/delete', { ids })
fileUpload:   (employeeId, file, meta) => axios.post(`/employee_master_data/file_upload/${employeeId}`, formData)
fileDelete:   (fileId) => axios.post('/employee_master_data/file_delete', { id: fileId })
fileDownload: (fileId) => axios.post('/employee_master_data/file_download', { id: fileId }, { responseType: 'blob' })
```

`getAll`'s request/response shape (`{ page, items_per_page, search,
table_headers }` in, `{ employees: { data, current_page, per_page, total }
}` out) is **confirmed** — it's exactly what the pre-existing
`EmployeeMasterData.jsx` was already sending/reading successfully before
this pass; only moved into the store, not changed. Everything else in this
service (payload/response shapes for create/update/delete/file_*) is
inferred from route existence and this repo's own conventions, not
confirmed against the live controller — see "Unconfirmed Backend
Contracts" below.

`employeeOptionApi.js` (pre-existing, unchanged) is a **separate**,
lightweight dropdown/typeahead service (`/employee_master_data/option_list`)
reused elsewhere (Manpower Request's `EmployeeSelect.jsx`). Don't merge it
into `employeeApi.js` — they serve different call sites and payload shapes.

## State Management

`src/store/employeeStore.js` (zustand):

- `items`, `pagination` (`{ current, pageSize, total }`) — populated by
  `fetchItems(params)`. **Deliberately server-side paginated/searched**,
  not the client-side in-memory-filter convention most other list pages in
  this repo use (see root `CLAUDE.md`) — the employee count is too large
  for that, and the pre-existing list page already worked this way.
  `fetchItems` takes params and is called directly with new params on
  search/page/column-selection changes, not just auto-fetched once on
  mount.
- `deleteEmployee(ids, refetchParams)` — optimistically removes the row(s)
  from `items`, then calls `fetchItems(refetchParams)` to reconcile with
  the server (pagination/total can shift after a delete).
- No `current`/`fetchById` — there's nothing to fetch by id (see "No
  Single-Employee Fetch Endpoint" below).

`useEmployees.js` wraps `items`/`pagination`/`isLoading`/`error` +
auto-fetches page 1 on mount, returns `fetchItems`/`deleteEmployee` for the
list page to call directly with params.

## Forms

`EmployeeForm.jsx` is shared between create/edit/view (`mode` prop),
mirroring `ManpowerRequestForm.jsx`'s shape:

- One `Form.useForm()` instance, `<Form form={form} layout="vertical"
  disabled={mode === 'view'}>` — the `disabled` prop cascades to every
  descendant `Form.Item` automatically, which is how "view mode" is
  read-only without threading a `readOnly` prop through every field.
- `EmployeeTabs.jsx` renders inside that one `<Form>`; every tab's field
  component (`PersonalInformation.jsx`, `EmployeeDetailsTab.jsx`) renders
  bare `Form.Item`s with **no own `<Form>`/`useForm()`** — they pick up
  the ancestor Form's React context. **Do not wrap a tab's fields in its
  own `<Form>`** (the original `PersonalInformation.jsx` did this before
  this pass, which would have silently detached it from `validateFields()`
  and the `disabled` cascade). AntD `Tabs` keeps inactive panes mounted by
  default, so values survive switching tabs.
- `buildPayload(values)` maps form values (dayjs dates → `'YYYY-MM-DD'`
  strings, `active` coerced to boolean) into the API payload — extend this
  function for new fields, don't build payloads ad hoc elsewhere.
- Edit/View pre-fill via `form.setFieldsValue` in a `useEffect` keyed on
  `initialData`, converting date strings back to `dayjs`. Falls back to
  `initialData.dob` if `birth_date` isn't present, since the vueportal
  schema column is `dob` but the validated request field is `birth_date`
  (see "Important Business Rules" below) — the router-state record could
  plausibly carry either key depending on what the list/update response
  actually returns.
- On create, Save navigates to `/employees/:id` (View) with the saved
  record in router state — completing the loop that `viewData`/`editData`
  on the list page start.

## Validation

- Client-side: AntD `rules={[{ required: true, message: '...' }]}`,
  matching `EmployeeMasterDataController`'s server-side `validator()`
  field-for-field (see vueportal's own docs for the exact list) — Civil
  Status is the one deliberate exception (see "Decisions" below).
- Server-side 422 errors surfaced via the shared `handleApiError` util —
  no module-specific error handling exists or should be added.

## List Page Toolbar / Bulk Actions

`EmployeeMasterData.jsx`'s header is deliberately split into two rows
rather than one growing `Row` of columns (the original had Title + Search
+ Search/Refresh buttons + Add Employee crammed into one `Card` title row,
which didn't sum to 24 grid columns once a permission hid a button, and
had no room left for Import):

- **Card `title`**: page title (left) + primary page-level actions
  (right, `Space wrap`): Refresh, Import (permission-gated), Add Employee
  (permission-gated). `Row justify="space-between" align="middle" wrap`.
- **Toolbar row** (card body, above the table): search (`Input` +
  `Button` as one `Space.Compact`), a Status filter `Select`
  (All/Active/Inactive), and `ColumnSelector`, left to right, same
  `justify="space-between"` pattern.
- **Status filter** (added 2026-09-16): posts `search_status: 'Active' |
  'Inactive' | undefined` — matches `EmployeeMasterDataController::index()`'s
  `in_array($request->search_status, ['Active', 'Inactive'])` check
  exactly. "All" is sent as `undefined` (key omitted from the payload,
  since axios drops `undefined` values), not a literal `'All'` string —
  the backend has no case for that value, so sending it as anything other
  than omitted/`Active`/`Inactive` would silently do nothing (harmless,
  but don't rely on it). Changing the filter re-fetches page 1
  (`handleStatusFilterChange`), same pattern as the search box and column
  selector. Included in the delete/bulk-delete refetch payloads too, so
  the list stays consistent with the active filter after a delete.
- **Bulk action bar**: an `Alert` (`type="info"`) shown only when
  `selectedRowKeys.length > 0`, between the toolbar and the table —
  selection count, "Clear selection", and a permission-gated "Delete
  Selected" (`Popconfirm` → `employeeStore.deleteEmployee(selectedRowKeys,
  refetchParams)`, which already accepted an array before this pass — no
  store change was needed, only the UI). This is the standard admin-table
  pattern (select rows → a contextual bar appears with bulk actions) —
  follow it for any future bulk action rather than adding per-row-only
  actions for something that's inherently a multi-row operation.

Added 2026-09-15/16 along with Import — see Roadmap.

## Permissions

Strings currently checked: `employee-master-data-list`, `-create`,
`-edit`, `-delete`, `-import` — all pre-existing on the backend side
(seeded in vueportal's `PermissionSeeder.php`), now also checked
client-side. `EmployeeTable.jsx`/`EmployeeCardMobile.jsx` (via
`useAuth().hasPermission`) already gated Edit/Delete correctly before this
pass; Add Employee and Import are now both gated the same way
(`employee-master-data-create`/`-import` respectively) — Add Employee was
previously unguarded client-side, relying only on the route-level
permission. Bulk "Delete Selected" reuses `employee-master-data-delete`,
the same permission as the per-row Delete action (deleting one employee
and deleting several are the same authorization concern).

The vueportal reference seeds a permission **per tab**
(`employee-master-data-personal-data`, `-employee-details`,
`-performance-management`, `-disciplinary-measures-penalties`,
`-offboarding`) and many sub-module-specific ones on top of those — not
yet checked client-side here since 4 of the 6 tabs are still placeholders.
When a placeholder tab becomes real, gate it the way vueportal's
`EmployeeInformationTabs.vue` `tabItems` computed property does (a tab
that fails its permission check simply isn't in the `items` array, not
just visually disabled) — see that file in the vueportal repo for the
exact pattern.

## Decisions Made While Building This (and why)

1. **Router-state, not a fetch, for View/Edit.** vueportal's
   `employee_master_data` route group has **no single-employee
   "show/{id}" endpoint** — only `index` (list), `store`, `update/{id}`,
   `delete`. The Vue reference works around this by populating its
   edit/view dialogs directly from the row already loaded in the list
   table, never a separate fetch. This repo's `EmployeeMasterData.jsx`
   does the same: `viewData`/`editData` call
   `navigate(path, { state: { employee: record } })`, and
   `EditEmployee.jsx`/`ViewEmployee.jsx` read `useLocation().state`,
   falling back to a "return to list" `Result` if it's missing (opened
   directly, or after a refresh). **This was a deliberate, user-confirmed
   choice** among three options (the others were: drop routed pages
   entirely in favor of a list-page modal, matching Vue exactly; or add a
   real `show/{id}` endpoint backend-side) — revisit only if a
   single-employee endpoint is ever added to vueportal, not by silently
   reintroducing a fetch-by-id call that doesn't exist.
2. **Civil Status options match the backend validator, not the Vue
   reference's dropdown.** vueportal's Vue UI offers `Single/Married/
   Divorced/Widowed`, but `EmployeeMasterDataController`'s server-side
   validator only accepts `Single/Married/Widowed/Legally Separated` —
   `Divorced` is a pre-existing bug in the reference app (a value its own
   UI lets you pick that its own backend then rejects). This repo's
   `PersonalInformation.jsx` uses the backend's list. **User-confirmed.**
   Don't "fix" this back to match Vue.
3. **`EmployeeModal.jsx` is unused.** It was TypeScript-syntax-broken
   scaffolding for a modal-based Add/Edit flow; fixed (stripped TS syntax
   so it at least lints/parses) but not wired to anything, since decision
   #1 went with routed pages. Kept as a reusable full-screen modal shell
   in case a future quick-edit-from-the-list feature wants it — not
   deleted, but don't assume it's on any current code path.
4. **Promodizer Brand FORM field still omitted; the LIST COLUMN exists and
   was fixed.** A "Promodizer Brand" list column was added directly to
   `EmployeeMasterData.jsx`'s `headers` array outside this skill's
   original scope, with a real bug: it used the literal dotted string
   `"promodizer_brand.brand"` as `dataIndex` (AntD `Table` does not split
   a string `dataIndex` on `.` — only an array form nests), so the column
   never resolved to real data and produced a client-reported error when
   selected in the column picker. Fixed 2026-09-15/16 to match every other
   nested-relation column here (Branch/Company/Department/Division):
   `dataIndex: "promodizer_brand"` (the top-level relation key) + a
   `render` that drills into `.brand`. The **Employee Details form field**
   (Vue: conditional on Position = "Sales Specialist") is still
   intentionally not built — no lookup store/hook for promodizer brands
   exists in this repo yet; add one (following `useBranches`/
   `useDepartments`'s pattern) before reintroducing it rather than
   inventing the endpoint. Don't assume the list column existing means the
   form field is safe to add without that lookup source.
5. **Rank / Division / Company / Cost Center / Date Assigned / Length of
   Service are read-only, best-effort display only.** These come from
   nested relations (`position.rank`, `department.division`,
   `branch.company`) or server computation that aren't confirmed to be
   present on every list row or router-state record — rendered with
   optional chaining, blank when absent, never sent in the payload.

## Unconfirmed Backend Contracts

Flagging explicitly rather than presenting these as settled (per this
workspace's "avoid inventing contracts" rule) — verify each against a real
request/response before relying on it:

- The resource key on `store`/`update`'s JSON response (`employee`?
  `employee_master_data`?, per this backend's `{success, message,
  <resource_key>}` envelope convention). `EmployeeForm.jsx`'s save handler
  falls back through a couple of likely keys rather than assuming one —
  simplify once confirmed.
- The `delete` endpoint's payload key for the id(s) being deleted (assumed
  `{ ids: [...] }}` in `employeeApi.js`).
- `file_upload`'s response shape (a single new file record? the full
  updated file list?) and the field name(s) on a file object (`file_name`?
  `name`? `original_name`?) — `FilesRequirements.jsx` renders defensively
  against several shapes.
- Whether `date_assigned`/`length_of_service`/`cost_center` are actually
  present on `index()` rows, or only computed/returned in some other
  context — `EmployeeDetailsTab.jsx`'s read-only block shows "-" if
  absent rather than assuming they're there.
- `import`'s expected spreadsheet column layout and the shape of a
  per-row validation failure (`ImportEmployeesModal.jsx` surfaces errors
  generically via `handleApiError` rather than a bespoke per-row error
  table, since the real shape isn't confirmed).

## List Column Safety — the `$table_fields` Whitelist Trap

`EmployeeMasterData.jsx`'s `headers` array serves double duty: it drives
both the table's display (`dataIndex`/`render`) and, via `value`, the
`table_headers` payload sent to `/employee_master_data/index`. The
backend (`EmployeeMasterDataController::index()`, and two duplicated
copies of the same logic in `employees_for_regularization()`/
`employees_hired_this_month()`) uses `value` as a **literal raw SQL
column reference** in the search `WHERE` clause for any column whose
`title`/`text` doesn't match one of a small hardcoded whitelist
(`$table_fields`: Branch, Company, Department, Division, Job Description,
Rank, Status, Promodizer Brand — the last one added 2026-09-15, see
"Decisions" item 4). **Any new column added to `headers` needs one of
these three checks before it's safe**:
1. Its `title` matches a `$table_fields` whitelist entry → safe regardless
   of `value` (the whitelist wins).
2. Its `value` is a real, physical top-level column on `employee_master_data`
   → safe (e.g. `job_title_code`, `educ_attain`, `employment_type`).
3. Otherwise it's **unsafe** — will throw `Unknown column '<value>' in
   'where clause'` (SQLSTATE 42S22) the moment it's selected, identical to
   the Promodizer Brand bug.

**Confirmed unsafe, do not add without a backend fix first**: "Length of
Service" — vueportal's own `EmployeeInformationTabs.vue`/`EmployeeMasterData2.vue`
header list includes it (`value: "length_of_service"`), but it's a
computed `TIMESTAMPDIFF(...) AS length_of_service` SQL alias in
`getEmployees()`'s `SELECT`, not a real column — MySQL doesn't allow
referencing a `SELECT`-list alias from `WHERE`. **This is a real,
currently-unfixed bug in the Vue reference itself**, never triggered
there either. Deliberately left out of this repo's `headers` array (see
the comment at its would-be position in `EmployeeMasterData.jsx`). Fix
needs a `$table_fields` entry mapping `'Length of Service'` to a valid SQL
expression (or a repeated `TIMESTAMPDIFF` subexpression usable in `WHERE`)
in `vueportal`, following the exact pattern used for the Promodizer Brand
fix, before this column can be added anywhere.

**Confirmed a Vue-only bug, don't copy its value**: "Birthday" — Vue
sends `value: "birth_date"`, but the real column is `dob` (confirmed in
the `2024_07_17_170443_create_employee_master_data_table` migration);
`birth_date` is only the *validated request field name* on create/update,
never a queryable column (see "Important Business Rules" above, item 1).
Selecting Birthday in Vue's own column picker would throw the same class
of error. This repo's "Birthday" column already correctly uses
`dataIndex`/`value: "dob"` — confirmed correct 2026-09-16 while comparing
header lists; do not "fix" it to match Vue's `birth_date`.

**Verified safe and added 2026-09-16** (previously missing from this
repo's list, present in Vue's): Job Title Code, Educ. Attainment, School
Attended, Course, Employment Type, Status (the last one uses the
whitelist-by-title path, not a raw column match — `value: "active"` alone
wouldn't need to be correct for it to work, but it happens to be anyway).

## Roadmap

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

**Deferred, in rough priority order:**
1. **Offboarding tab** — blocked on a product decision (see "Important
   Business Rules" below), not just unbuilt.
2. **Performance Management tab** (7 sub-features: Evaluation &
   Regularization, Monthly Key Performance, Classroom/OJT Performance
   Rating, Branch Assignment & Positions, Merit History, Training) — each
   its own small CRUD module against its own vueportal route group.
3. **Disciplinary Measures & Penalties tab** (Issued NTE, Disciplinary
   Actions) — same shape as above.
4. **Attendance tab** — read-only, joined server-side against a separate
   BioBridge biometric system.
5. Excel Export + Template Download (Import exists; these two are its
   natural companions on the same vueportal route group
   `employee_master_data/export` and `/template/download`, and vueportal's
   own UI groups all three together — add following `ImportEmployeesModal.jsx`'s
   pattern, downloading via a blob response like `FilesRequirements.jsx`'s
   `handleDownload`).
6. Profile picture upload/display.
7. Resign/rehire quick actions, new-hire sync from Careers Portal,
   dashboard counters (new-hired/for-regularization/NTE-open/
   disciplinary-open) — all present in the Vue reference, not ported.
8. Promodizer Brand **form** field (see "Decisions" item 4 above — the
   list column is done, the form field is not).
9. "Length of Service" list column — blocked on a backend fix (a
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

## Referral Code Field (added 2026-09-16)

A read-only display field on `EmployeeDetailsTab.jsx`, shown only in
edit/view mode and only when `initialData.referral?.referral_code` is
present (an employee with no referral row yet — e.g. never active —
simply shows nothing, matching vueportal's `EmployeeMasterData::referral()`
`hasOne` relation, which can be null). A "copy" button next to it builds
`https://recruitment.addessa.com/careers?ref=<code>` (matching
`EmployeeInformationTabs.vue`'s `referralLink` computed property exactly —
keep in sync if that URL/query param ever changes) and copies it via
`navigator.clipboard.writeText`. The code itself is generated/synced
entirely server-side (on hire/rehire/resign, via
`EmployeeMasterDataController::applyReferralCode()`) — this field never
appears in `buildPayload()`, it's display-only.

## Employee Acknowledgment Report (added 2026-09-16)

A **separate sub-feature**, not a tab on the Employee record — its own
list page (`/acknowledgment-reports`), its own view page
(`/acknowledgment-reports/:id`), and a submit action reached from the
Employee Master Data list's bulk-action bar.

**Naming note, worth understanding before touching this again**: vueportal's
Vue UI labels the button that creates one of these "Upload Employee
Report" (upload icon). It does **not** upload a file — clicking it takes
the current row selection (with each row's active/inactive status,
adjustable via a tri-state marker in Vue, a `Switch` here) and submits it
as a new report scoped to one branch. This was initially misread as a
request for a generic file-upload/import feature — that's a real,
separate, already-built feature (`ImportEmployeesModal.jsx`,
`employeeApi.import`) and is **not** the same thing as this one. Don't
conflate the two again: "Import" creates/updates employee records from a
spreadsheet; "Acknowledgment Report" snapshots an existing selection's
active/inactive status into a dated, branch-scoped, exportable record.

**Backend** (`vueportal`, `EmployeeAcknowledgmentReportController`,
confirmed directly from source):
- `GET /employee_master_data/acknowledgment_reports` (`index`) — returns
  `{ branches: [...] }`, each branch carrying a nested
  `acknowledgment_reports` array (with `user` eager-loaded). Scoped
  server-side to the caller's own branch unless they hold
  `employee-acknowledgment-reports-all` — this repo doesn't yet expose
  any UI distinction for that permission (both cases just render whatever
  the API returns), which is fine since the scoping is enforced
  server-side either way.
- `POST .../acknowledgment_reports/store` — `{ branch_id, employees:
  [{ employee_id, is_active }] }`. `is_active` is a **snapshot at
  submission time**, not a live status — it does not update the
  employee's actual `active` column.
- `POST .../acknowledgment_reports/view` — `{ acknowledgment_id }` →
  full report with every item's nested `employee` (and *its* nested
  branch/department/position) — a genuine single-record fetch, unlike the
  core Employee Master Data record (see "Decisions" item 1 above). This
  is why `AcknowledgmentReportView.jsx` fetches by the `:id` route param
  directly instead of depending on router state — it works on a direct
  link or refresh, which `ViewEmployee.jsx`/`EditEmployee.jsx` can't.
- `POST .../acknowledgment_reports/export` — `{ acknowledgment_id }` →
  `.xlsx` blob download (`Employee_Branch_Report.xlsx`), same
  blob-download pattern as `FilesRequirements.jsx`'s `handleDownload`.
- `POST .../acknowledgment_reports/delete` — `{ acknowledgment_id }`.

**Permissions**: `employee-acknowledgment-reports` (list/view/submit — the
backend uses one permission for all three, no separate `-create`),
`employee-acknowledgment-reports-export`, `employee-acknowledgment-reports-delete`,
`employee-acknowledgment-reports-all` (cross-branch visibility, checked
only server-side in `index()`, not client-side).

**Files**: `src/services/employee/employeeAcknowledgmentReportApi.js`,
`src/store/acknowledgmentReportStore.js`,
`src/hooks/useAcknowledgmentReports.js`,
`src/pages/employee_master_data/acknowledgment_report/{Index,View}.jsx`,
`src/pages/employee_master_data/components/SubmitAcknowledgmentReportModal.jsx`
(opened from `EmployeeMasterData.jsx`'s bulk-action bar, alongside Delete
Selected). Routes registered in `AppRoutes.jsx` and `MainLayout.jsx`
(`menuData` under Employee, `titleMap`/`getPageMeta`).

**Unconfirmed**: the submitting user's display field on the `user`
relation (tried `name`/`full_name`/`email` in that order — the User model's
actual name field wasn't checked directly for this pass). Verify against
a real response and simplify.

**Not built**: no UI distinguishes `employee-acknowledgment-reports-all`
from plain `employee-acknowledgment-reports` (not necessary — the backend
scoping handles it transparently); the submit modal doesn't validate that
selected employees actually belong to the chosen branch (the backend's
`store()` doesn't either, so this matches server behavior, not a gap
unique to the frontend).

## Important Business Rules Discovered From vueportal's Code

(See vueportal's own `EmployeeMasterDataController`/`EmployeeMasterData`
model directly for anything not covered here — this is what was
confirmed while building the frontend, not a full backend audit.)

1. The validated request field is `birth_date`, but the underlying schema
   column is `dob` — don't assume they're the same key when reading a
   record back from an API response; `EmployeeForm.jsx`'s pre-fill checks
   both.
2. `employee_code` has **no uniqueness validation** server-side despite
   functioning as the business key (and the join key to attendance data)
   — a pre-existing gap in the reference app, not something this frontend
   can fix. Don't assume a duplicate `employee_code` will be rejected.
3. Civil Status backend-valid values are `Single`, `Married`, `Widowed`,
   `Legally Separated` (plus uppercase variants, not used here) — see
   "Decisions" above.
4. Offboarding-related fields exist in **two places** in vueportal: as
   columns directly on `employee_master_data`, and as a full separate
   record in `employee_offboardings` with its own controller/routes.
   Which one is authoritative could not be determined from the code —
   resolve this with a product decision before building the Offboarding
   tab, don't guess.
5. `store()`/`update()` on the backend are **not** wrapped in
   `DB::transaction()` despite writing to multiple tables on create — a
   partial failure partway through could leave an employee record without
   some of its dependent rows. Not something the frontend can fix, but
   don't assume server-side atomicity that isn't actually there if
   building retry/recovery logic later.

## Common Mistakes To Avoid

- Adding a fetch-by-id call to `employeeApi.js` because it "should" exist
  like Manpower Request's `getById` — it doesn't exist on the backend; see
  "Decisions" item 1.
- Wrapping a tab's fields in their own `<Form>`/`useForm()` instead of
  bare `Form.Item`s relying on `EmployeeForm.jsx`'s shared Form context —
  breaks `validateFields()` and the view-mode `disabled` cascade silently
  (no error, just fields that don't validate or save).
- Restoring `Divorced` to the Civil Status options, or otherwise
  "matching Vue exactly" on a field where Vue and its own backend already
  disagree — check the backend validator, not just the reference UI.
- Treating any of the "Unconfirmed Backend Contracts" items above as
  settled without checking a real request/response first.
- Building the Offboarding tab against just one of the two data sources
  without resolving which is authoritative first.
- Switching this module's API calls from POST to REST verbs "for
  consistency" with KPI — matches Manpower Request's reasoning: different
  backend controllers, intentionally different conventions.
