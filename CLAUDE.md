# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Purpose

A ReactJS HRIS (Human Resource Information System) web application. It is the
frontend for a Laravel API backend (not in this repo). Existing modules
include: Authentication, User/Role/Permission management, Employee Master
Data, Recruitment, KPI Management (templates, evaluations, self-evaluations),
and Manpower Request (in progress).

## Tech Stack

- React 19 + Vite (`type: module`)
- Ant Design v6 (`antd`, `@ant-design/icons`)
- react-router-dom v7
- Zustand v5 for state management
- axios for HTTP
- dayjs for dates
- chart.js / react-chartjs-2 for charts
- @hello-pangea/dnd for drag-and-drop
- ESLint (flat config) — no Prettier config present
- No test framework is configured in this project

**Ant Design v6 is recent enough that training data frequently reflects
older (v4/v5) prop names that have since been renamed or deprecated** —
e.g. `Divider`'s `orientation` prop was renamed to `titlePlacement`, and
(confirmed 2026-09-16, same way — a runtime console warning reported back
manually) `Alert`'s `message` prop is now `@deprecated please use `title`
instead` in this installed version (6.4.3) — `<Alert message="...">` still
renders but should be written `<Alert title="...">` in any new/touched
code. Don't confuse this with the unrelated `message` from `App.useApp()`
(the toast/notification API, e.g. `messageApi.success(...)`) — that one is
not deprecated and shares nothing with `Alert`'s prop beyond the word.
Before
using an AntD prop/API from memory, especially anything touching
placement, sizing, or a prop that existed in earlier major versions,
check it against what's actually installed: grep
`node_modules/antd/es/<component>/index.js` (the runtime source, which
lists the real accepted values/prop names) or the adjacent `.d.ts`, rather
than trusting recalled API shape. This app has no browser automation
available in this environment — a console warning/error will not surface
on its own; it has to be reported back and then verified this way.

**2026-09-16**: every AntD component used in the Employee Master Data
module (Card, Select, Modal, Table, Breadcrumb, Pagination, Space, Input,
Tooltip, Spin, Tag, Empty, Tabs, Descriptions, DatePicker, Form, Switch,
Checkbox, List, Upload, Typography, Popconfirm) was checked against
`node_modules/antd/es/**/*.d.ts` for `@deprecated` props after the
`Alert.message` finding — no other usages in that module hit a deprecated
prop. Re-run the same check (`grep -A2 "@deprecated"` in each component's
`.d.ts`) for any *new* component this module starts using, rather than
assuming the audit still covers it.

## Project Architecture

This is an **existing production-oriented project**. Preserve existing
conventions; do not refactor or modernize unless explicitly asked.

Backend assumptions inferred from frontend code:
- Laravel API, JSON responses, `Accept: application/json` required
- Bearer token auth (`Authorization: Bearer <token>`)
- 422 responses used for validation errors (field-keyed or `{ message }`)
- Some modules use POST-only endpoints for all actions (Manpower Request),
  others use proper REST verbs (KPI). Follow whichever convention the
  specific module you're touching already uses — do not unify them.

## Important Directories

```
src/pages/<module>/...        Route-level pages, grouped by module
src/services/<module>/*Api.js Thin axios wrappers, one object per resource
src/store/*.js                One Zustand store per resource/domain
src/hooks/use*.js             Thin hook wrapping a store + auto-fetch effect
src/routes/                   AppRoutes.jsx, ProtectedRoute.jsx, GuestRoute.jsx
src/layouts/MainLayout.jsx    Sidebar menu, breadcrumbs, page titles
src/utils/                    handleApiError.js, tokenHelper.js
src/api/axiosInstance.js      Shared axios instance + interceptors
```

## Routing Conventions

- All routes are declared in `src/routes/AppRoutes.jsx`.
- Permission-gated pages go in the `permissionRoutes` array as
  `{ permissions: [...], path, element }` and are rendered through
  `<ProtectedRoute permissions={...}>` + `<MainLayout>`.
- `ProtectedRoute` redirects to `/login` if no token, shows a `Spin` while
  loading `/auth/init`, and redirects to `/unauthorize` if the user lacks
  any of the required permissions.
- `GuestRoute` redirects authenticated users away from guest-only pages
  (e.g. `/login`).
- Every real page must also be added to `MainLayout.jsx`:
  - `menuData` — sidebar entry with `permissions`
  - `titleMap` (or a regex case in `getPageMeta`) — page title + breadcrumb
- A page that exists under `src/pages` but is not registered in both
  `AppRoutes.jsx` and `MainLayout.jsx` is **not reachable in the app**.

## State Management Conventions (Zustand)

- One store per resource/domain in `src/store/`.
- Typical shape: `{ data, isLoading, isLoaded?, error }` plus async actions
  that `set()` inside try/catch/finally.
- Reference/lookup data stores (e.g. positions, branches) use an `isLoaded`
  guard so they only fetch once; expose a `refresh*` action that resets
  `isLoaded` and refetches.
- A matching `src/hooks/use<Resource>.js` hook wraps the store: selects
  state via selectors, auto-fetches in a `useEffect` on mount, returns a
  flat object.

## API/Service Conventions

- One file per resource in `src/services/<module>/<name>Api.js`, exporting
  a plain object of functions that call `axiosInstance` — no business logic.
- All requests go through the shared `axiosInstance` (`src/api/axiosInstance.js`),
  which attaches the bearer token and sets JSON headers.
- Handle errors with the shared `handleApiError(error, messageApi)` util in
  every `catch` block — it distinguishes 422 validation errors, AntD form
  validation errors, and generic failures.

## Authentication and Authorization Conventions

- `src/store/authStore.js` holds `user`, `roles`, `permissions`,
  `isAuthenticated`, `isLoaded`. Populated once via `GET /auth/init` in
  `ProtectedRoute`.
- `src/hooks/useAuth.js` exposes `hasRole`, `hasAnyRole`, `hasPermission`,
  `hasAnyPermission` — always check permissions client-side with these
  helpers; the backend is the source of truth and re-checks server-side.
- Tokens live in `localStorage` via `src/utils/tokenHelper.js`
  (`access_token`, `refresh_token`).
- Note: the 401 handling in `axiosInstance`'s response interceptor is
  currently commented out (no auto-redirect/clear on 401).

## Form and Validation Conventions

- AntD `Form` with `layout="vertical"`, one `Form` per page/feature.
- Repeatable line items use `Form.List` (e.g. Manpower Request position
  requirements, KPI template items): each row wrapped in a small `Card`,
  `MinusCircleOutlined` to remove a row, a dashed block `Button` with
  `PlusOutlined` to add one, and a list-level validator via `rules` on
  `Form.List` for "at least one item required".
- Conditional fields use `Form.Item` with `shouldUpdate`/`noStyle` plus
  `getFieldValue` (see the "Replacement Employee" field in
  `ManpowerRequestForm.jsx`).
- Async searchable pickers follow the `EmployeeSelect.jsx` pattern:
  controlled `value`/`onChange`, `onSearch` for server-side filtering,
  `onPopupScroll` for infinite-scroll pagination.
- Client-side `rules={[{ required: true, message: '...' }]}` for required
  fields; server-side 422 errors are surfaced via `handleApiError`.

## Table/List Conventions

- AntD `Table` with `rowKey="id"`, `loading={isLoading}`,
  `pagination={{ pageSize: 10, showSizeChanger: true }}`.
- Client-side filtering (search text, status, date range) is done in-memory
  over the store's `items` array, not via server query params.
- Status columns render an AntD `Tag` colored via a local
  `STATUS_COLORS`/`statusColors` map keyed by status string.
- Row actions are permission- and status-gated inline functions
  (e.g. `canEdit(record)`, `canSubmit(record)`, `canCancel(record)`)
  combining `hasPermission`/`hasAnyPermission`, allowed statuses, and
  ownership checks (`record.user_id === user.id`).
- Mutating actions (submit/cancel/approve/reject) are wrapped in
  `Popconfirm` before calling the API.

## Error / Loading / Notification Conventions

- Loading: AntD `Spin` for full-page/blocking loads; `loading` prop on
  `Table`/`Button` for scoped loading states.
- Errors: always route through `handleApiError(error, messageApi)`.
- Notifications: **two patterns currently coexist in the codebase** —
  - `const [messageApi, contextHolder] = message.useMessage()` (older,
    used in Manpower Request pages)
  - `const { message } = App.useApp()` (newer, used in KPI evaluation pages)
  When adding to an existing page, match that page's existing pattern.
  When starting a new page, prefer `App.useApp()` unless told otherwise.

## Important Development Commands

```
npm run dev       # start Vite dev server
npm run build     # production build
npm run preview   # preview a production build
```

## Testing / Lint / Build Commands

```
npm run lint       # ESLint (flat config, react-hooks + react-refresh rules)
```
No test framework/suite exists in this project. Do not assume Jest/Vitest
are available; do not add one unless explicitly requested.

## Employee Master Data Conventions

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

## Role & Permission Conventions

Module status (2026-09-22): **built this session** — `RoleIndex.jsx`/
`PermissionIndex.jsx` were previously literal one-line stub components
(`return "This is a role list page"`) despite `/roles` and `/permissions`
already being registered in `AppRoutes.jsx`/`MainLayout.jsx`. Recreated
from vueportal's embedded Vue2+Vuetify2 reference
(`resources/js/views/role/*.vue`, `resources/js/views/permission/*.vue`,
backed by `RoleController`/`PermissionController` +
`spatie/laravel-permission`) — see that repo's own `CLAUDE.md` for why it
also ships a local Vue frontend for non-HRIS-tagged modules.

- Files: `src/pages/permission/PermissionIndex.jsx` (list + create/edit
  modal, matching the Vue reference's dialog-based Permission page —
  permission is a single-field entity, a full routed page would be
  overkill), `src/pages/role/` — `RoleIndex.jsx` (list),
  `RoleForm.jsx` (shared form used by both `CreateRole.jsx` and
  `EditRole.jsx`, matching the `KpiTemplateForm`
  mode='create'/'edit' shared-component pattern) with an AntD `Transfer`
  for permission assignment in place of the Vue reference's
  filterable-checkbox `v-data-table` — same functionality (search,
  view-only-selected filter), idiomatic AntD component instead of a literal
  port. `src/services/role/roleApi.js`, `src/services/permission/permissionApi.js`,
  `src/store/roleStore.js`/`permissionStore.js`,
  `src/hooks/useRoles.js`/`usePermissions.js`.
- **Registered** in both `AppRoutes.jsx` and `MainLayout.jsx`: `/roles`,
  `/roles/create`, `/roles/:id/edit`, `/permissions` (Permission has no
  create/edit routes — it's modal-only on the list page).
- **Backend quirk — validation failures return HTTP 200, not 422**:
  `RoleController@store/update` and `PermissionController@store/update`
  return `response()->json($validator->errors(), 200)` on validation
  failure (e.g. duplicate name) — confirmed by reading the controllers
  directly, not assumed from the general "422" convention documented
  above. `data.success` (present only on success) is therefore the only
  reliable success/failure signal for these four endpoints — do **not**
  route their errors through `handleApiError` (which branches on
  `error.response.status === 422` and will never fire here). Both
  `PermissionIndex.jsx`'s and `RoleForm.jsx`'s save handlers instead check
  `data.success` and, on failure, map the first `{field: [messages]}` entry
  of the response body onto the AntD form via `form.setFields`.
- **`/permission/edit` and `/permission/create` are not wired** — the Vue
  reference never calls the former (it pre-fills its edit dialog from the
  already-fetched list row instead, which `PermissionIndex.jsx` also
  does), and the latter (`PermissionController@create`) returns a Blade
  view, not JSON, so it can't be called from an API client at all. Also
  observed in passing: `PermissionMaintenance` middleware gates edit on
  `request->is('api/permission/edit/*')` (a wildcard segment) but the
  actual route has no id segment (`POST /permission/edit`, id in the
  body) — looks like a pre-existing backend bug that would 401 that
  endpoint if anything ever called it; out of scope here since nothing
  does, not fixed (frontend-only task, `vueportal` owns that file).
- **Administrator role (id `1`) is read-only**, matching
  `RoleController@update/delete`'s `if ($roleid == 1) return abort(403)`
  guard: `RoleIndex.jsx` hides Edit/Delete and shows a View-only eye icon
  for it instead (gated on `record.id === 1`, not on the role's `name`,
  unlike the Vue reference which compares `item.name == 'Administrator'`
  — the id check is the actual backend rule and doesn't break if the role
  is ever renamed); `RoleForm.jsx` derives `readOnly` the same way and
  disables the name field, the permission `Transfer`, and hides the Save
  button entirely when true. This is frontend-only, same as every other
  such guard in this repo — the backend 403 is still the real
  enforcement.
- Permission strings in use: `role-list`, `role-create`, `role-edit`,
  `role-delete`, `permission-list`, `permission-create`, `permission-edit`,
  `permission-delete` — all pre-existing in `PermissionSeeder.php`, no
  backend changes were needed for this feature.
- **Not yet built / deferred**: no dedicated "view role" page distinct
  from the read-only edit state (matches the Vue reference, which also
  reuses its edit component for viewing); no assign-users-to-role UI (out
  of scope — the Vue reference doesn't have one either, role assignment
  happens on the User module, which is a separate, still-unbuilt page in
  this repo).

## Manpower Request Conventions

Module status: **fully wired up and in active use** — this section was
badly out of date (previously said `ViewManpowerRequest.jsx` was an empty
file and routes weren't registered; neither is true). The backend
(`vueportal`, same session's work) has its own much more detailed
`.claude/skills/manpower-request/SKILL.md` including a **Roadmap section —
read that first** for what's done/deferred/next; this section only covers
frontend-specific conventions.

- Files: `src/pages/manpower_request/request/` — `ManpowerRequestIndex.jsx`
  (list), `CreateManpowerRequest.jsx`/`EditManpowerRequest.jsx` (thin
  wrappers around the shared `ManpowerRequestForm.jsx`), `ViewManpowerRequest.jsx`
  (detail page with the full approve/disapprove/return/cancel/delete
  action set), `EmployeeSelect.jsx` (async searchable picker, reused for
  the Replacement Employee field). `src/store/manpowerRequestStore.js`,
  `src/hooks/useManpowerRequests.js`,
  `src/services/manpower_request/manpowerRequestApi.js`.
- **Registered** in both `AppRoutes.jsx` and `MainLayout.jsx` — reachable
  at `/manpower-requests`, `/manpower-requests/:id`,
  `/manpower-requests/create`, `/manpower-requests/:id/edit`.
- All service endpoints are POST-only (`/manpower_request/index`,
  `/create`, `/edit/{id}`, `/store`, `/update/{id}`, `/submit/{id}`,
  `/approve/{id}`, `/reject/{id}`, `/return/{id}`, `/cancel/{id}`,
  `/delete/{id}`, `/approval_history/{id}`, `/record_hire/{id}`) — follow
  this POST convention for any new Manpower Request endpoint, do not
  switch to REST verbs.
- Statuses: `Draft`, `Pending Approval`, `Approved`, `Disapproved`,
  `Returned`, `Cancelled`. `Draft`/`Disapproved`/`Cancelled`/`Returned` are
  all editable+resubmittable (`canEdit`/`canSubmit` in
  `ManpowerRequestIndex.jsx`/`ViewManpowerRequest.jsx`, and the route guard
  in `EditManpowerRequest.jsx`, all check this same 4-status list —
  keep them in sync if it ever changes again). Resubmitting from
  `Returned` resumes approval at the same `current_level` server-side
  (not a frontend concern, but affects what "Resubmit" means to the user).
- Edit/Submit/Delete are Administrator-or-owner: `hasRole('Administrator')`
  bypasses the ownership check (`record.user_id === user.id`), everyone
  else needs both the permission and to be the requestor — this exact
  pattern repeats across `canEdit`/`canSubmit`/`canDelete` in both
  `ManpowerRequestIndex.jsx` and `ViewManpowerRequest.jsx`; match it for
  any new action gate rather than inventing a new check shape.
  Approve/Disapprove/Return additionally require `approval_status.can_approve`
  from the backend (`ViewManpowerRequest.jsx`'s `canActOnApproval`), not
  just the permission string.
- `fetchById` in the store returns `{ manpower_request, approval_status }`.
- Permission strings in use: `manpower-request-list`, `-create`, `-edit`,
  `-delete`, `-submit`, `-cancel`, `-approve`, `-disapprove`, `-reject`,
  `-return`, `-print`, `-record-hire`, `-list-all`. All seeded on the
  backend via `database/seeds/PermissionSeeder.php`; `Manpower Requestor`,
  `Manpower Request Approver`, and `Manpower Request Administrator` roles
  (with the right subset of these — `-record-hire` is Approver/
  Administrator only; `-list-all` is Administrator only) are seeded via
  `database/seeds/ManpowerRequestRoleSeeder.php`.
- **List/detail visibility (added 2026-09-14, tightened + bug-fixed same
  day)**: without `manpower-request-list-all`, `index()`/`edit()` on the
  backend scope to a user's own requests, plus requests that are **both**
  `Pending Approval` **and** at an approval level they themselves are
  mapped to, **plus** any request they have a real approval-log entry
  against regardless of its current status/level — the last clause fixes
  a real reported bug where approving a document (which advances
  `current_level`) immediately made that same document a 404 for the
  approver who just approved it. Enforced server-side in both endpoints,
  not just the list, so a user can't bypass it by requesting a document's
  ID directly. No frontend logic change was needed for the
  scoping itself; `manpower-request-list-all` was just added as an
  alternative permission (alongside plain `-list`) in `AppRoutes.jsx` and
  `MainLayout.jsx`'s "All Requests" menu entry, so a role holding only
  `-list-all` isn't blocked client-side. See the `manpower-request` skill
  for the exact rule.
- The request form's line items now carry a full Job Specifications block
  (Gender, Age Range, Relevant Work Experience, PRC License, Driver's
  License) and Replacement-specific fields (reason from a fixed PH-scenario
  list + Others/specify, Last Working Day) — see `ManpowerRequestForm.jsx`'s
  option constants, which must stay in sync with the backend's
  `ManpowerRequestController::REPLACEMENT_REASONS`/`DRIVERS_LICENSE_CODES`.
  `required_plantilla`/`existing_headcount` are backend-computed and
  read-only on this side — display only, never send them.
- `replacement_or_additional` has three values as of 2026-09-14:
  `Replacement`, `Additional`, `New Position` — all three use the same
  fields; New Position still requires an existing `position_id`, it is
  not a free-text uncataloged job title.
- **Record Hires** ("FOR HR USE ONLY" step, added 2026-09-14): a button on
  `ViewManpowerRequest.jsx` visible only when `status === 'Approved'` and
  the user has `manpower-request-record-hire`, opening a modal with
  (2026-09-21) `quantity`-many `EmployeeSelect`(`activeOnly`) slots per
  position line — not just one — each with its own **read-only** Date
  Hired display (not a `DatePicker` — Date Hired is always
  server-derived, never user-entered), saved via
  `manpowerRequestApi.recordHire(id, hires)` where each entry is
  `{ detail_id, hired_employee_ids }` (array; payload has no `date_hired`
  field at all). Each slot's `EmployeeSelect` is filtered to that line's
  own branch+position (see the branch/position filter bullet below) for
  both Replacement and Additional/New Position lines. Recorded hires
  (`d.hires`, one row per hire) then show read-only in each position card
  and in the print layout's "FOR HR USE ONLY" section (always the
  itemized table now — see the `manpower-request` skill). One employee
  cannot be selected for more than one position/slot on the same
  request — checked both client-side (`handleHireConfirm`, immediate
  feedback) and server-side (`ManpowerRequestService::recordHires()`, the
  actual source of truth, which also caps a line's hire count at its own
  `quantity`). See the `manpower-request` skill for the full shape and the
  real bugs/gaps this feature has surfaced over time (an eager-loading gap
  across `edit()`/`index()`/`record_hire()`, a permission gap in
  `EmployeeMasterDataMaintenance` that blocked the Approver role from
  `option_list`, all fixed).
- **Record Hires date preview bug fix (2026-09-21)**: the modal's before-save
  Date Hired preview was reading raw `date_employed` regardless of branch
  assignment history, disagreeing with what actually gets persisted for an
  internal transfer/promotion — caught against a real record
  (MRF-2026-000015). Fixed by extracting the priority logic into
  `EmployeeMasterData::resolveEffectiveHireDate()` (`vueportal`, shared by
  both `ManpowerRequestService::resolveHireDate()` and a new
  `preview_hire_date` field on `employeeOptionList`, computed only for
  Record Hires calls); `EmployeeSelect.jsx`/`ViewManpowerRequest.jsx` now
  read `option.preview_hire_date` instead of `option.date_employed`.
  Verified live end-to-end with a fresh candidate whose two dates
  genuinely differ. Also relabeled "Date Hired" → **"Date Hired/Date
  Assigned"** in the Record Hires modal only (not the main per-line
  display or the print layout). See the `manpower-request` skill's
  Roadmap for the full writeup.
- **Multi-hire data model (2026-09-21)**: a position line's hires now live
  in a separate `manpower_request_detail_hires` child table
  (`ManpowerRequestDetail::hires()`, hasMany), **not** the old scalar
  `hired_employee_id`/`date_hired` columns (dropped from
  `manpower_request_details` in the same migration, after backfilling
  existing data). Driven by the requirement that an Additional/New
  Position line with `quantity` ≥ 2 needs that many hires recorded against
  it. See the backend `manpower-request` skill's Roadmap for the full
  change (new model, rewritten `recordHires()`, validation, eager-load
  collapse) — every frontend consumer of hire data (`ViewManpowerRequest.jsx`'s
  Record Hires modal and per-line display, `ManpowerRequestPrint.jsx`,
  `DashboardPage.jsx`'s Time to Fill) was updated in the same pass, listed
  individually below/above where each already had its own bullet.
- **Replacement quantity lock (2026-09-21)**: a Replacement line's
  Quantity field (`ManpowerRequestForm.jsx`) is locked to `1` and
  auto-defaults to it the moment `replacement_or_additional` is set to
  `Replacement` (`InputNumber`'s native `readOnly` prop — not `disabled`,
  same darken-avoidance reasoning as the Branch field lock above; a
  Replacement line is always for exactly the one departing employee).
  Frontend-only — the backend's `quantity` validation has no `in:1`-style
  constraint tying it to `replacement_or_additional`, so a direct API call
  could still submit a Replacement line with `quantity` > 1 (the service's
  per-line hire-count cap would then just allow more than one hire against
  it). Not closed server-side, since it wasn't asked for.
- **Time to Fill** (dashboard widget added pre-2026-09-15 as uncommitted
  local work, start-date field changed 2026-09-15): `DashboardPage.jsx`'s
  "Manpower Request — Time to Fill" section (avg. card, by-position chart,
  by-hire-month trend) and `ViewManpowerRequest.jsx`'s per-line "Time to
  Fill" field both measure `date_approved` (MRF's final-level approval
  timestamp, stamped by `ManpowerRequestService` when status flips to
  `Approved`) → each individual hire's own `date_hired` (2026-09-21: one
  row per **hire**, not per position line, now that a line can have more
  than one — see the multi-hire bullet above), not `request_date` →
  `date_hired` as originally implemented — start date is when HR was
  actually cleared to hire, not when the request was first raised.
  `date_approved` is a plain, always-present `ManpowerRequest` column (no
  Resource/transformer hides it), so no backend change was needed for
  that part. MRFs with no `date_approved`, or hires with no `date_hired`,
  are silently excluded from the dashboard aggregate. `ViewManpowerRequest.jsx`'s
  header grid also now shows a standalone **Approved Date** field
  (`record.date_approved`, next to Current Level) — previously this value
  was only visible inside the Approval History modal.
- **Print layout** (`src/pages/manpower_request/request/ManpowerRequestPrint.jsx`
  + `.css`, route `/manpower-requests/:id/print`, permission
  `manpower-request-print`): follows the exact pattern already established
  by `KpiEvaluationPrint.jsx` — a normal page route (still wrapped in
  `MainLayout`), a `window.print()` button, and `@media print` CSS that
  hides everything except `.mrf-print`. No backend change was needed
  beyond seeding the new permission; the page reuses the existing
  `getById`/`approvalHistory` calls. See the backend's `manpower-request`
  skill Roadmap for full detail on what it renders and what's still
  unverified (real paper/PDF pagination — no browser automation available
  in this environment to check that).
- **Branch field lock (2026-09-21)**: `ManpowerRequestForm.jsx`'s Branch
  `Select` (Create and Edit both use this shared component) is locked
  read-only and auto-filled to `user.branch_id` (from `/auth/init`'s
  eager-loaded `branch` relation) whenever
  `hasRole('Manpower Requestor') && !hasRole('Administrator')` — a Requestor
  can only ever file for their own branch; the platform `Administrator` role
  (the only other role with `manpower-request-create`, per
  `ManpowerRequestRoleSeeder.php`) keeps full branch choice. Deliberately
  **not** AntD's `disabled` prop (darkens the field) — instead `open={false}`
  + no `suffixIcon` + `tabIndex={-1}` + `pointerEvents: 'none'`, which keeps
  the field's normal enabled styling while still blocking interaction and
  submitting its value normally. Frontend-only as implemented — the backend
  does not independently enforce that a Requestor's submitted `branch_id`
  matches their own, so a crafted direct API call could still bypass this;
  revisit if that needs closing.
- **Required fields (2026-09-21)**: every field on `ManpowerRequestForm.jsx`
  is now client-side `required` (which also triggers AntD's default
  red-asterisk label mark — no separate styling needed, matches how
  `position_id`/`quantity`/`reason`/`branch_id` already behaved), in both
  the top-level Request Details card (`request_date`, `priority`,
  `target_hiring_date`, alongside the already-required `branch_id`/`reason`)
  and each `details` line item, **except** `experience` (free-text
  "Experience" field) and `salary_grade`, which stay optional per explicit
  instruction. This includes conditionally-rendered line-item fields when
  their trigger value makes them visible (e.g. `last_working_day` when
  `replacement_or_additional` is `Replacement`). Frontend-only, stricter
  than the backend: `request_date`, `priority`, `target_hiring_date`,
  `age_min`, `age_max`, `gender`, `employment_type`, `qualifications`,
  `education`, `experience_required`, `prc_license_status`,
  `drivers_license_status`, and `replacement_or_additional` itself are all
  still `nullable` in `ManpowerRequestController@store/update`
  (`vueportal`) — a direct API call can still submit them empty. Revisit if
  that gap needs closing. `request_date` additionally has a
  `disabledDate={(current) => current > dayjs().endOf('day')}` on its
  `DatePicker` blocking future dates in the UI — the backend's
  `request_date` rule is still just `nullable|date_format:Y-m-d` (no
  `before_or_equal:today`), same frontend-only gap.
- **Branch/position/date-filtered employee pickers (2026-09-21)**:
  `EmployeeSelect.jsx` gained optional `branchId`/`positionId`/
  `hiredOnOrAfter` props. `branchId`/`positionId`, used by both the
  Replacement Employee field (`ManpowerRequestForm.jsx`) and every slot in
  the Record Hires modal (`ViewManpowerRequest.jsx`), scope candidates to
  the relevant line's own `branch_id`/`position_id` via optional filters
  on the backend's `option_list` endpoint — same filtering for Replacement
  and Additional/New Position lines alike. `hiredOnOrAfter`, Record Hires
  only (`record.date_approved`), additionally requires the candidate's
  `date_employed` or branch-assignment `date_assigned` to be on/after the
  MRF's own approval date — never passed for Replacement Employee, whose
  candidate is the departing employee and has no such relationship to
  those dates. See the `manpower-request` skill for the exact
  undefined-vs-filtered-mode semantics — any other `EmployeeSelect`
  consumer that doesn't pass these props is unaffected.
- **Not yet built**: in-app notifications, a "Pending My Approval"/"My
  Requests" filtered view (the list is currently unfiltered).
- **Position line Status/Aging (added 2026-09-22)**:
  `ViewManpowerRequest.jsx` shows a frontend-only, derived `Status` Tag per
  detail line — `Open` while it has no recorded hires, `Closed` once it
  has at least one (user-confirmed direction; the intuitive-sounding
  opposite was explicitly checked against). `Aging` (days from
  `record.date_approved` to today) shows alongside it in the same row,
  only while a line is still `Open` — once a hire lands, the existing
  per-hire `Time to Fill` field is the relevant number instead, same
  `date_approved` basis just measured to the actual hire date.
- **Supporting Attachment (added 2026-09-22, revised same day)** — see
  vueportal's own CLAUDE.md MRF reference section for the full backend
  contract and why the design changed mid-build. User-requested revision:
  the attachment field is **always available directly on the Create/Edit
  form** (`ManpowerRequestForm.jsx`, inside each `Form.List` line item —
  not gated on the line already having a saved id), required only for
  `Additional`/`New Position` lines and only to *submit* (not to save a
  Draft), optional for `Replacement`.
  - A freshly-picked `File` object lives in local state
    (`detailFiles`, keyed by the `Form.List` item's stable `field.key` —
    not array index, which shifts when rows are added/removed — synced
    every render via `fieldKeysRef`), not in AntD's own Form state, same
    as every other file-picker in this app. An *existing* attachment
    (edit mode) is carried in the form itself as plain `file_name`/
    `file_path`/`file_type`/`file_date_upload` values instead — required
    so it survives `update()`'s delete-and-recreate of every line on
    every save (see the backend note) — cleared via `form.setFieldValue`
    when the user clicks Remove.
  - `saveRequest` sends plain JSON when no line has a newly-picked file
    (the common case, unchanged from before), and switches to `FormData`
    (`details[i][field]` bracket notation, matching PHP's nested-array
    multipart parsing) only when at least one line does — `manpowerRequestApi.create`/
    `update` now detect a `FormData` payload and set explicit multipart
    headers, since `axiosInstance`'s own defaults hard-code
    `Content-Type: application/json` and can't be relied on to
    auto-override for a `FormData` body.
  - `handleSaveAndSubmit` (not `handleSaveDraft`) runs a client-side
    `findMissingAttachmentLines` check before ever calling the API — a
    mirror of `ManpowerRequestService::submit()`'s own check, for
    immediate feedback; the backend remains the real enforcement (a direct
    API call could still skip this check). Its submit-failure fallback
    message now also surfaces the backend's actual error text when
    available, not just a generic "could not submit" message.
  - `ViewManpowerRequest.jsx` additionally keeps a **post-save** attachment
    control per line (attach/replace/remove/download without resubmitting
    the whole form) — gated on the existing `canEdit` (status +
    Administrator-or-owner + permission) for upload/delete, no extra gate
    for download beyond viewing the page. Uses
    `manpowerRequestApi.detailFileUpload/detailFileDownload/detailFileDelete`.
  - **Not live-tested end-to-end** — same caveat as every feature built
    this session (no browser automation available); the nested multipart
    array design is implemented per how Laravel/PHP are documented to
    parse `details[i][file]`-style fields, not verified against a real
    submitted form. `npm run lint`/`npm run build` are real and clean,
    that's the limit of what was actually executed.

## Important Rules for Modifying This Existing Project

- This is an existing, production-oriented codebase — preserve existing
  conventions and file/folder patterns rather than introducing new ones.
- Do not add new dependencies when an existing one already solves the
  problem (AntD, dayjs, zustand, axios cover most needs here).
- Do not unify the POST-only vs REST-verb API style differences between
  modules unless explicitly asked — each module currently matches its own
  backend controller conventions.
- Before implementing a new page/feature, check whether it needs to be
  registered in both `AppRoutes.jsx` (`permissionRoutes`) and
  `MainLayout.jsx` (`menuData` + `titleMap`/`getPageMeta`) — a page file
  alone is not enough to make it reachable.
- No test suite exists; do not claim tests pass or add test infrastructure
  without being asked. Verify changes via `npm run lint` and manual/dev
  server checks.
- Prefer the smallest change that follows an existing pattern over a new
  abstraction.
- Never expose, print, log, commit, or paste into a response any critical
  credential — API tokens, access/refresh tokens, passwords, `.env` secret
  values, database credentials, or third-party service/plugin API keys
  (payment gateways, cloud providers, etc.). Treat `.env` and any
  credential-bearing config file as sensitive: reading it to confirm a
  non-secret value (e.g. `VITE_API_BASE_URL`) is fine, but do not echo
  actual secret values back, write them into code, commit them, or include
  them in explanations/logs. If a task seems to require exposing a real
  credential, stop and ask the user first.
