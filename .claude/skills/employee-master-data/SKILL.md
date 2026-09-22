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
`-edit`, `-delete`, `-import`, `-export`, `-template-download` — all pre-existing on the backend side
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
   **Resolved 2026-09-22** (was previously flagged here as undeterminable
   from the code — a deeper look, reading `Offboarding.vue`'s actual
   axios calls rather than just the two schemas' existence, did resolve
   it): `employee_offboardings` is the live, authoritative one; the core
   table's columns are a superseded legacy holdover. See the "Offboarding
   tab" section in the Roadmap below for the full evidence.
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
- Assuming the two offboarding data sources are still an open question —
  they're not, as of 2026-09-22 (see "Important Business Rules" item 4
  and the Roadmap's "Offboarding tab" entry). Don't re-litigate it without
  new evidence.
- Switching this module's API calls from POST to REST verbs "for
  consistency" with KPI — matches Manpower Request's reasoning: different
  backend controllers, intentionally different conventions.
