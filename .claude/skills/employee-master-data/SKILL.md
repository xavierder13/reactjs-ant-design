---
name: employee-master-data
description: Established architecture, files, and conventions for the Employee Master Data module in this HRIS app, plus what's deferred and why. Use for any task that adds, fixes, or extends Employee Master Data pages, forms, the core record's CRUD, or any of its sub-tabs (Performance Management, Disciplinary, Offboarding, Attendance).
---

# Employee Master Data Module

**Status:** complete relative to the vueportal reference — core record CRUD
(list with server-side search/pagination/column picker/status filter, bulk
delete, Excel import/export, template download, create, view, edit,
delete), the record tabs (Personal Data, Employee Details, Work Schedule,
Attendance, Performance Management, Disciplinary Measures & Penalties,
Training, Offboarding), Referral Code display + the Referral Codes list,
and the separate Employee Acknowledgment Report feature. Nothing in this module is blocked; see "Deferred" at the end.

This file describes the **current** state only. The dated history (how each
piece was built, bugs found, verification runs, corrections) is in
`docs/employee-master-data-history.md` — read it only when you need the
*why/when* behind a rule.

The backend is `vueportal` (`EmployeeMasterDataController`,
`EmployeeMasterData` model, and one controller per sub-module) — this repo
can't see it when run on its own. This file records what was confirmed from
that backend and flags what's unconfirmed; don't guess beyond it.

## Area files — read the one for the area you're changing

Everything above and below applies to every change in this module. Area-specific
rules live beside this file; **read the matching file before touching that area**
(they are rules, not optional background):

| Touching | Read |
|---|---|
| finding a file / route | `areas/file-map.md` |
| main list page (toolbar, filters, sort, bulk actions) | `areas/main-list.md` |
| a record tab: Performance Mgmt (incl. Branch Assignment, Regularization), Disciplinary/NTE, Training, Offboarding, Attendance | `areas/record-tabs.md` |
| Hired This Month, For Regularization, Synced from Careers, Resigned, Open NTE/Disciplinary lists | `areas/segment-lists.md` |
| Generate Template / Import Data / Export | `areas/import-export.md` |
| New Hired sync, Referral Codes | `areas/new-hired-and-referral.md` |
| Branch Manpower Fill Rate report | `areas/branch-manpower.md` |
| Acknowledgment Report | `areas/acknowledgment-report.md` |
| Employee Profile (`profile/`, My Profile) | `areas/profile.md` |

Key directories: pages `src/pages/employee_master_data/` (`components/`,
`components/tabs/`, `lists/`, `profile/`), services `src/services/employee/`,
store `src/store/employeeStore.js`, hooks `useEmployees.js`,
`useLatestEmployee.js`, `useEmployeeFormOptions`.

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

## API / Service Pattern

`employeeApi.js` — **all endpoints are POST** (same as Manpower Request,
unlike KPI's REST verbs; don't "unify"):

```js
getAll:           (payload) => axios.post('/employee_master_data/index', payload)
create:           (payload) => axios.post('/employee_master_data/store', payload)
update:           (id, payload) => axios.post(`/employee_master_data/update/${id}`, payload)
delete:           (id) => axios.post('/employee_master_data/delete', { employee_id: id })
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
`file_download` reads `file_id`, `file_delete` reads `id`. `delete` is
**confirmed**: it reads `employee_id`; an array deletes the employees but
clears the related records (files, NTEs, trainings, …) of the first id
only (Laravel 7 `where('employee_id', [..])` binds the first value), so
bulk delete sends one request per employee.
Create/update shapes are inferred — see "Unconfirmed Backend
Contracts".

`employeeOptionApi.js` is a **separate** lightweight dropdown service
(`/employee_master_data/option_list`) reused by Manpower Request's
`EmployeeSelect.jsx`. Don't merge it into `employeeApi.js`.

**Important backend fact:** `/employee_master_data/index` eager-loads every
sub-module relation onto every row — `monthly_key_performances`,
`classroom_performance_ratings`, `ojt_performance_ratings`,
`branch_assignment_positions`, `merit_histories`, `trainings`,
`training_programs` (+ `department`), `explanations` (NTE),
`disciplinaries`, `offboardings`. Since View/Edit
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
- `deleteEmployee(ids, refetchParams)` — deletes one employee per request,
  removes the deleted row(s), then refetches (also after a failure part-way)
  to reconcile pagination/total.
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
  `validateFields()` and the `disabled` cascade. AntD `Tabs` only mounts a
  pane the first time it's opened (then keeps it), so `validateFields()`
  returns just the opened tabs' fields — `handleSave` builds the payload
  from `form.getFieldsValue(true)` (the whole store, pre-filled for every
  tab) instead. update() answers validation failures with HTTP 200 and a
  bare error bag; `handleSave` shows the first error instead of "saved".
- `buildPayload(values)` maps form values (dayjs → `'YYYY-MM-DD'`, `active`
  → boolean) into the payload — extend it for new core fields (e.g.
  `regularization_date`), don't build payloads ad hoc.
- Edit/View pre-fill via `form.setFieldsValue` in a `useEffect` on
  `initialData`, converting dates with `toDayjs()` (`utils/formatDate.js`),
  never a bare `dayjs(...)`: 2,000+ legacy `regularization_date`/
  `date_resigned` rows (and ~350 offboarding dates) are MySQL zero dates
  (`0000-00-00`), which dayjs shows as 11/30/1899 and a save would write
  back. Falls back to
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
  `-training-program`, `-offboarding`, `-attendance`, `-work-schedule`,
  `-asset-assignment` (the Edit-only **Asset Assignment** tab; a
  TAB_PERMISSIONS value may also be a list = any of them; Administrator
  passes). Inner sub-tabs are filtered the same way
  by their own permission. A role can hold a sub-permission without the
  umbrella (e.g. Payroll Admin) — that must hide the whole tab.
- Sub-modules use `employee-master-data-<sub>-list/-create/-edit/-delete`
  for `key-performance`, `classroom-performance-rating`,
  `ojt-performance-rating`, `branch-assignment-position`, `merit-history`,
  `training` (the Performance Management ratings); the Training tab uses
  `employee-master-data-training-program-create/-edit/-delete`; `nte-*` and `disciplinary-*` add `-file-download`/
  `-file-delete`; offboarding uses `-offboarding` (tab) +
  `-offboarding-create/-edit/-delete/-file-download/-file-delete`;
  Evaluation & Regularization uses `-evaluation-regularization` only.
  `-import`/`-template-download` variants per sub-module gate the Generate
  Template / Import Data document types (`importDocumentTypes.js`).
- **Rule for any new permission check: confirm the string against the
  live database and the code path the Vue reference actually renders**,
  not `PermissionSeeder.php` or a commented-out lookalike. Both were wrong
  here before (e.g. `employee-master-data-offboarding-list` doesn't exist
  in the live DB at all; `-offboarding-add` is a legacy duplicate —
  `-create` is the live one).

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

1. Resign/rehire quick actions; the Employee Master Data index's mini cards
   (the lists exist and are reachable from the sidebar and the Workforce
   Dashboard cards).
2. Promodizer Brand form field (needs a lookup source — "Decisions" #4).
3. "Length of Service" column (needs a vueportal whitelist fix first).
4. Sub-module import/export/template tooling (Performance, NTE,
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

After changing this module, **edit the relevant section in place** (here or in its `areas/` file)
so it describes the new current state, and delete anything the change made
untrue. Don't append dated "Done, added YYYY-MM-DD" entries; put the
narrative (what changed, why, bugs found, how it was verified) in the
commit message and, if worth keeping, `docs/employee-master-data-history.md`.
