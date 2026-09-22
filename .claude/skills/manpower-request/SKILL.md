---
name: manpower-request
description: Established architecture, files, and conventions for the Manpower Request (MRF) module in this HRIS app. Use for any task that adds, fixes, or extends Manpower Request pages, forms, approval workflow, print layout, or related state/API code.
---

# Manpower Request (MRF) Module

Status (2026-09-14): **fully wired up and in active use**, including a
working approval workflow and a print layout. This file was previously
badly out of date (it described `ViewManpowerRequest.jsx` as an empty
file and MRF routes as unregistered — neither has been true for a while).
The root `CLAUDE.md`'s own "Manpower Request Conventions" section is kept
in sync with real code and is the fastest place to check current state;
this file adds detail beyond what's there. The backend's own
`manpower-request` skill (in `vueportal`) is the canonical source for
approval-workflow/status-machine/validation behavior — read that first
for anything backend-shaped; this file only covers frontend-specific
conventions.

## Architecture / File Map

```
src/pages/manpower_request/request/
  ManpowerRequestIndex.jsx    list/table page
  CreateManpowerRequest.jsx   thin wrapper → ManpowerRequestForm mode="create"
  EditManpowerRequest.jsx     fetches record, guards editability, → ManpowerRequestForm mode="edit"
  ManpowerRequestForm.jsx     shared create/edit form (Form.List for position line items)
  EmployeeSelect.jsx          async searchable Select, reused for both "replacement employee" and "hired employee" (activeOnly prop)
  ViewManpowerRequest.jsx     detail page: full record + approve/disapprove/return/cancel/delete + Approval History + Record Hires modals
  ManpowerRequestPrint.jsx    standalone print view (see "Print Layout" below)
  ManpowerRequestPrint.css    companion stylesheet for the print view

src/store/manpowerRequestStore.js          zustand store
src/services/manpower_request/manpowerRequestApi.js  axios service
src/hooks/useManpowerRequests.js           list hook (wraps store.fetchItems)
```

Reference/lookup data used by the form comes from the store's own
`fetchFormData()` action (branches + positions), **not** from
`positionStore`/`branchStore`/`usePositions` directly — see State section.

`EmployeeSelect.jsx` deliberately includes **inactive** employees (tagged
"— Inactive" in the label) because replacement-hire lookups often target
someone who already resigned. Do not "fix" this to filter to active-only.

`EmployeeSelect` also takes optional `branchId`/`positionId`/
`hiredOnOrAfter` props (2026-09-21). `branchId`/`positionId` are passed by
**both** the Replacement Employee field in `ManpowerRequestForm.jsx` (as
`getFieldValue('branch_id')`/`getFieldValue(['details', name, 'position_id'])`,
that line item's own Position) **and** every slot in the Record Hires
modal in `ViewManpowerRequest.jsx` (as `record.branch_id`/
`row.position_id`) — scopes the picker to a same-branch, same-position
candidate via the backend's `option_list` `branch_id`/`position_id`
filters (see the backend `manpower-request` skill). `hiredOnOrAfter` is
passed **only** by Record Hires, as `record.date_approved` — additionally
requires the candidate to have been hired or branch-assigned on/after the
MRF's own approval date (backend's `hired_on_or_after` filter, same skill
section); never passed for Replacement Employee, whose candidate is the
departing employee and has no such relationship to this MRF's dates. Any
of the three props left `undefined` (any other consumer) preserves the old
unfiltered-on-mount behavior for that dimension exactly; passing one (even
as `null`/unset) switches the component into filtered mode for that
dimension — it shows disabled with a "Select a branch/position/approved
date first" placeholder (naming whichever are still missing) and issues no
fetch until every filter it was given has a value, resetting/reloading
whenever any of them changes. Selecting a new branch or position does
**not** clear an already-picked `replacement_employee_id` that may no
longer match — not implemented, since it wasn't asked for; revisit if
stale mismatched selections turn out
to be a problem.

## Routes

Registered in both `AppRoutes.jsx` (`permissionRoutes`) and
`MainLayout.jsx` (`menuData` + a `getPageMeta` regex case for the `:id`
paths):

```
/manpower-requests            → ManpowerRequestIndex     (manpower-request-list)
/manpower-requests/create     → CreateManpowerRequest    (manpower-request-create)
/manpower-requests/:id        → ViewManpowerRequest      (manpower-request-list + several action perms)
/manpower-requests/:id/edit   → EditManpowerRequest      (manpower-request-create/-edit)
/manpower-requests/:id/print  → ManpowerRequestPrint     (manpower-request-print)
```

`/manpower-requests/:id/print` follows `kpi-evaluations/:id/print`'s exact
pattern: opened via `window.open(..., '_blank')` from a Print button (not
sidebar nav), so it has no `menuData` entry, but — unlike the KPI
precedent, which left this gap — it DOES have its own `getPageMeta` regex
case so the breadcrumb/title are correct before print CSS hides the app
chrome.

## API / Service Pattern

`src/services/manpower_request/manpowerRequestApi.js` — **all endpoints
are POST**, including reads (this module does not use REST verbs, unlike
KPI's service). Keep new endpoints POST-based for consistency with this
module's backend controller:

```js
getAll:            () => axios.post('/manpower_request/index')
getCreate:          () => axios.post('/manpower_request/create')          // form reference data
getById:            (id) => axios.post(`/manpower_request/edit/${id}`)
create:             (payload) => axios.post('/manpower_request/store', payload)
update:             (id, payload) => axios.post(`/manpower_request/update/${id}`, payload)
submit:             (id) => axios.post(`/manpower_request/submit/${id}`)
approve:            (id) => axios.post(`/manpower_request/approve/${id}`)
reject:             (id, remarks) => axios.post(`/manpower_request/reject/${id}`, { remarks })
returnForRevision:  (id, remarks) => axios.post(`/manpower_request/return/${id}`, { remarks })
cancel:             (id) => axios.post(`/manpower_request/cancel/${id}`)
delete:             (id) => axios.post(`/manpower_request/delete/${id}`)
approvalHistory:    (id) => axios.post(`/manpower_request/approval_history/${id}`)
recordHire:         (id, hires) => axios.post(`/manpower_request/record_hire/${id}`, { hires })
```

Every one of these has a real UI caller now (`approve`/`reject`/
`returnForRevision`/`approvalHistory`/`recordHire` are used from
`ViewManpowerRequest.jsx`; `getById` + `approvalHistory` are also both
used from `ManpowerRequestPrint.jsx`). `recordHire` (added 2026-09-14)
takes `hires: [{ detail_id, hired_employee_ids }]` — one entry per position
line, `hired_employee_ids` a **plural array** (2026-09-21, replaces the old
singular `hired_employee_id` — a line can now record more than one hire,
up to its own `quantity`, see Record Hires section below), only meaningful
once the record's `status === 'Approved'` (the backend rejects it
otherwise). **No `date_hired` field** — that's always derived server-side
(`ManpowerRequestService::resolveHireDate()`) and is read-only; don't add
it back to this payload.

## State Management

`src/store/manpowerRequestStore.js` (zustand):

- `items` — list, populated by `fetchItems()`
- `current`, `approvalStatus` — populated by `fetchById(id)`, which
  **returns `{ manpower_request, approval_status }`** (destructure both;
  do not assume it returns the record directly)
- `branches`, `positions`, `isFormDataLoaded` — form reference data,
  loaded once via `fetchFormData()` (guarded by `isFormDataLoaded`, same
  `isLoaded`-guard pattern as other stores in this repo)
- Standard `isLoading`/`error` fields, `set()` inside try/catch/finally

`useManpowerRequests.js` hook wraps `items`/`isLoading`/`error` +
auto-fetches `fetchItems()` on mount, returns `refetch`.

`ManpowerRequestPrint.jsx` deliberately does **not** go through the store
— it calls `manpowerRequestApi.getById`/`approvalHistory` directly in its
own `useEffect`, since a print view opened in a new tab doesn't benefit
from the store's shared state and this keeps it a fully standalone page
(same reasoning `KpiEvaluationPrint.jsx` uses).

## Forms

`ManpowerRequestForm.jsx` is shared between create and edit (`mode` prop).
- `Form layout="vertical"`, header fields (branch, request date, priority,
  target hiring date, reason) in a `Card`, then a `Form.List name="details"`
  of position line items in a second `Card`.
- Each line-item row is its own small `Card` with `MinusCircleOutlined` to
  remove and a dashed `Button` + `PlusOutlined` to add another; `Form.List`
  has a `rules` validator requiring at least one item.
- `replacement_or_additional` select has three options as of 2026-09-14:
  `Replacement`, `Additional`, `New Position`. New Position reuses the
  same position/quantity/Job Specifications fields as the other two — no
  extra conditional fields exist for it (it does NOT mean an uncataloged
  job title; `position_id` still selects from the existing Positions
  list — see the backend `manpower-request` skill's Roadmap for the
  reasoning).
- Conditional fields per row (`shouldUpdate` + `getFieldValue`):
  `replacement_employee_id` (via `EmployeeSelect`), `replacement_reason`/
  `replacement_reason_other`/`last_working_day` when
  `replacement_or_additional === 'Replacement'`; `experience_years` when
  `experience_required` is true; `prc_license_type` when
  `prc_license_status === 'Required'`; `drivers_license_code` when
  `drivers_license_status` is Professional/Non-Professional. These option
  constants (`REPLACEMENT_REASONS`, `DRIVERS_LICENSE_CODES`, etc.) must
  stay in sync with the backend's
  `ManpowerRequestController::REPLACEMENT_REASONS`/`DRIVERS_LICENSE_CODES`.
- `required_plantilla`/`existing_headcount` are backend-computed and
  read-only on this side — display only (in `ViewManpowerRequest.jsx` and
  `ManpowerRequestPrint.jsx`), never sent from the form.
- `buildPayload(values)` maps form values (including `dayjs` dates →
  `'YYYY-MM-DD'` strings) into the API payload shape — extend this
  function, don't build payloads ad hoc elsewhere.
- Edit mode pre-fills via `form.setFieldsValue` in a `useEffect` keyed on
  `initialData`, converting date strings back to `dayjs`.

## Validation

- Client-side: AntD `rules={[{ required: true, message: '...' }]}` on
  required fields (branch, reason, position, quantity, and conditionally
  replacement employee / job-specification fields — see Forms above).
- Server-side 422 errors are surfaced via the shared `handleApiError`
  util — no MRF-specific error handling exists or should be added.

## Permissions

Strings currently in use: `manpower-request-list`, `-create`, `-edit`,
`-delete`, `-submit`, `-cancel`, `-approve`, `-disapprove`, `-reject`,
`-return`, `-print`, `-record-hire` (added 2026-09-14, `Manpower Request
Approver` role only — an HR/approver-side clerical step, not granted to
`Manpower Requestor`), `-list-all` (added 2026-09-14 — see below). All
seeded on the backend via `database/seeds/PermissionSeeder.php`;
role/permission subsets seeded via
`database/seeds/ManpowerRequestRoleSeeder.php`. Grep for a permission
string before assuming it exists if you're introducing a new action —
this list can still drift from the seeder.

**`-list-all` and list/detail visibility, added 2026-09-14 (tightened +
bug-fixed same day)**: without it, the backend now scopes both `index()`
and `edit()` to a user's own requests, plus requests that are **both**
`status = 'Pending Approval'` **and** at an approval level they
themselves are mapped to, **plus** any request they have a real
approval-log entry against (any level/action/status). That third clause
fixes a real reported bug: approving a document advances `current_level`,
and without it the approver who just approved immediately got a 404
trying to view the same document they'd just acted on. A document at
their level that they've genuinely never touched, and that's since moved
on or reached a terminal status, is still excluded — this isn't a
blanket relaxation (see the backend `manpower-request` skill's Roadmap
for the exact rule and how it was verified). This is entirely server-side
— no frontend
code changed for it, since `ManpowerRequestIndex.jsx`/
`ViewManpowerRequest.jsx` already just render whatever the API returns.
The only frontend touches were adding `manpower-request-list-all` as an
alternative permission (alongside plain `-list`) in `AppRoutes.jsx`'s
`permissionRoutes` for `/manpower-requests` and `/manpower-requests/:id`,
and in `MainLayout.jsx`'s `menuData` entry for "All Requests" — otherwise
a role holding only `-list-all` (no plain `-list`) would be blocked from
the page/menu client-side despite the backend granting it access. New
role **`Manpower Request Administrator`** (`-list`, `-list-all`,
`-record-hire`) bypasses the scoping entirely and can link a hired
employee to any document, but has no approve/edit/delete authority.

Checks are done with `useAuth()`'s `hasPermission`/`hasAnyPermission`/
`hasRole`, combined with status and ownership — see
`ViewManpowerRequest.jsx`'s `canEdit`/`canSubmit`/`canCancel`/`canDelete`
for the exact repeating shape:

```js
const canEdit =
  ['Draft', 'Disapproved', 'Cancelled', 'Returned'].includes(record.status) &&
  (hasRole('Administrator') ||
    (hasAnyPermission('manpower-request-create', 'manpower-request-edit') && record.user_id === user.id));
```

Administrators bypass the ownership check; everyone else needs both the
permission AND to be the requestor. Approve/Disapprove/Return additionally
require `approval_status.can_approve` from the backend, not just the
permission string. The Print button only checks
`hasPermission('manpower-request-print')` — no ownership/status gate,
since anyone who can already see the record's detail page can print it.

## Approval Workflow / Status Handling

Reachable statuses: `Draft`, `Pending Approval`, `Approved`, `Disapproved`,
`Returned`, `Cancelled`. (`Submitted` appears in code as dead/historical —
see the backend skill.) Rendered via `STATUS_COLORS` in both
`ManpowerRequestIndex.jsx` and `ViewManpowerRequest.jsx` → AntD `Tag`
(`Draft`/`Cancelled` = default/grey, `Pending Approval` = gold, `Approved`
= green, `Disapproved` = red, `Returned` = orange). Note the stored status
string is `Disapproved`, not `Rejected`, even though the route/permission/
button label still say "reject"/"disapprove" per the backend's naming.

The record also carries `current_level`; the frontend does not compute
approval eligibility itself — `approval_status.can_approve` (from
`fetchById`/`edit()`) is the source of truth for whether the current user
can act, mirroring KPI's `can_approve` flag.

Real transitions (from `ViewManpowerRequest.jsx`'s guard functions,
matching the backend service exactly):
- Edit / Submit: from `Draft`/`Disapproved`/`Cancelled`/`Returned`,
  Administrator-or-owner.
- Cancel: from `Draft`/`Pending Approval`/`Returned`, owner only (no
  Administrator bypass — cancel is a strict ID comparison on the backend).
- Delete: from `Draft`/`Cancelled` only, Administrator-or-owner.
- Approve / Disapprove / Return: from `Pending Approval` only, gated by
  `approval_status.can_approve` — implemented with `Popconfirm` for
  Approve, a shared remarks `Modal` (`Input.TextArea`, required) for
  Disapprove/Return.

## Print Layout

`ManpowerRequestPrint.jsx` + `ManpowerRequestPrint.css`, route
`/manpower-requests/:id/print`, permission `manpower-request-print`.
Follows `KpiEvaluationPrint.jsx`'s exact pattern — see that file before
changing this one, and see the backend `manpower-request` skill's Roadmap
for full rationale on what's rendered and why:

- Real page route, still wrapped in `MainLayout`/`ProtectedRoute` like any
  other page — NOT a layout-free route. `@media print` CSS does the work:
  `body * { visibility: hidden }`, then reveal only `.mrf-print` and force
  it to `position: absolute; top: 0; left: 0` so it escapes AntD's
  `Layout`/`Sider`/`Content` positioning.
- `.no-print` hides the on-screen Print button when printing.
- Tables use `page-break-inside: avoid` per row so a row never splits
  across a page, with `thead { display: table-header-group }` so headers
  repeat if a table spans multiple pages — same technique as the KPI print
  CSS, don't invent a different approach here.
- The header includes the real Addessa Corporation logo
  (`src/assets/addessa-logo.jpg`, extracted directly from the embedded
  image in the backend's `public/pdf/MANPOWER-REQUISITION-FORM-MRF-REVISED.pdf`
  — reuse this file, don't re-extract or substitute a different logo).
- Content is a **filled record**, not the blank paper template: approval
  signature lines are replaced with the real `approval_history` entries
  (actual approver names/actions/remarks/timestamps). "Reason for Request"
  prints once for the whole request, with each of the three columns
  (Replacement/Additional/New Position — all three request types are
  supported as of 2026-09-14) itemizing every line of that type, numbered
  when there's more than one — NOT once per line item (an earlier version
  of this did that and was corrected). "FOR HR USE ONLY" shows the real
  hired employee/date per hire once Record Hires (see below) has been
  used, blank otherwise. Always the itemized table (2026-09-21) — one row
  per (position line, hire) pair, a line with no hire yet still getting
  one blank row; the earlier plain single-row layout for a single-position
  MRF was removed since it could only ever show one hire and a line can
  now have several.
- Not verified: actual paginated/printed visual output on real paper or a
  PDF export — no browser automation is available in this environment, so
  only the CSS technique (proven working in the KPI feature) and the
  underlying data (checked against live API responses) are confirmed.

## Record Hires ("FOR HR USE ONLY")

Added 2026-09-14. A "Record Hires" button on `ViewManpowerRequest.jsx`
(header `extra`, next to Print), visible only when
`hasPermission('manpower-request-record-hire') && record.status === 'Approved'`
— no ownership check, since this is an HR/approver-side step, not tied to
who created the request. Opens a `Modal` with one small `Card` per
position line (`hireRows` local state, seeded from `record.details` on
open), each with an `EmployeeSelect` (passed `activeOnly` — see below) for
the hired employee and a **read-only** "Date Hired" display (a plain
`Typography.Text`, not a `DatePicker` — see the next paragraph). Save
calls `manpowerRequestApi.recordHire(record.id, hires)`, then reloads the
record. Each position card in the main detail view also shows "Hired
Employee"/"Date Hired" read-only once set, mirroring how "Replacement
Employee" is shown.

**2026-09-21 — quantity-many hires per line, branch/position-filtered
picker.** A line can now record more than one hire (backed by the new
`manpower_request_detail_hires` table, see the backend skill's Roadmap
entry of the same date). Each `hireRows[i]` gained a `slots` array —
`Array.from({ length: d.quantity }, ...)`, pre-filled from `d.hires`,
padded with empty slots up to `quantity` — instead of a single
`hired_employee_id`/`hired_employee_label`/`date_hired` triple; the modal
renders one `EmployeeSelect` + Date Hired pair per slot (labeled
`Hired Employee #1`, `#2`, ... only when `slots.length > 1`, to avoid
relabeling the common single-slot case). `updateHireRow` was replaced by
`updateHireSlot(detailId, slotIndex, changes)`. The duplicate-employee
check (below) and the Save payload builder both now flatten across every
row's `slots` instead of reading one value per row; the payload itself
changed from `{ detail_id, hired_employee_id }` to
`{ detail_id, hired_employee_ids }` (array, empty entries filtered out —
see the API section above). Each `EmployeeSelect` slot also now passes
`branchId={record.branch_id}` and `positionId={row.position_id}` (that
line's own `position_id`, captured in `hireRows` at `openHireModal` time)
— same branch+position filtering as the Replacement Employee field (see
"Selecting the employee to be replaced" below), plus
`hiredOnOrAfter={record.date_approved}` (Record Hires only — a candidate
must have been hired or branch-assigned on/after the MRF's own approval
date; see the same backend section), so Record Hires candidates are scoped
the same way for both Replacement and Additional/New Position
lines. The per-line display in the main detail view (previously a single
"Hired Employee"/"Date Hired"/"Time to Fill" row gated on
`d.hired_employee || d.date_hired`) now maps over `d.hires`, one row per
hire, each with its own Time to Fill.

**Date Hired is not user-entered, added 2026-09-14** (previously it was a
`DatePicker` the user filled in; changed per instruction to be read-only
and derived). Labeled **"Date Hired/Date Assigned"** in the Record Hires
modal (2026-09-21, was plain "Date Hired") because the value isn't always
a hire date — see the priority order below.

The value shown **immediately on selection**, before saving, comes from
`option.preview_hire_date` (2026-09-21 — **not** `option.date_employed`,
which is a real bug that shipped and was caught against a live record,
see below). `EmployeeSelect`'s option objects carry both
`date_employed` (kept for back-compat, unused by this modal now) and
`preview_hire_date` (added to `employeeOptionApi`'s underlying
`/employee_master_data/option_list` response, only populated when the
request includes `hired_on_or_after` — i.e. only for Record Hires calls),
and the modal's `onChange(val, option)` handler reads
`option.preview_hire_date` into `hireRows[i].slots[j].date_hired`. This
now matches the **actual persisted value**: both are computed via the
same shared `EmployeeMasterData::resolveEffectiveHireDate()` model method
(`ManpowerRequestService::resolveHireDate()`, called from `recordHires()`,
now just delegates to it) — the employee's latest **Branch Assignment &
Position** date (`EmployeeBranchAssignmentPosition.date_assigned`) first,
falling back to `EmployeeMasterData.date_employed` only when no assignment
history exists.

**2026-09-21 — real bug found and fixed**: before this, the preview read
raw `option.date_employed` unconditionally, so an internal
transfer/promotion's preview and its actual saved value visibly
disagreed — caught against a real record (MRF-2026-000015, employee
125865311/Jomel Ventigan: `date_employed` 2021-01-16, but their persisted
hire was 2025-08-01 from a branch assignment, while the picker's live
preview for that same employee showed 2021-01-16). See the backend
`manpower-request` skill's Roadmap for the full fix and verification
(a genuinely different-dated fresh candidate was recorded live and the
persisted value matched the new preview). Don't add a `DatePicker` back
for this field, and don't send `date_hired` in the `recordHire` payload.

**Layout, per instruction (2026-09-14): Hired Employee and Date Hired
each get their own full-width row** (`<Col span={24}>` each, stacked),
not side-by-side columns — the employee option label is long
(`employee_code - full_name (position_name)`, plus an `— Inactive` suffix
when applicable) and was getting cramped in a narrower column.
`EmployeeSelect` also gained a `status` prop (forwarded straight to the
underlying AntD `Select`) for this reason — see the next paragraph.

**The same employee can't be selected for more than one position (or more
than one slot) on the same request** — enforced two ways in
`ViewManpowerRequest.jsx`:
1. **Live, per-slot visual feedback**: on every render, every row's
   `slots` are scanned (flattened) for `hired_employee_id` values that
   appear more than once; any slot whose selection is part of a duplicate
   gets `<EmployeeSelect status="error">` (renders the AntD `Select` with
   a red border) plus a small red "This employee is already selected for
   another position." line — this updates live as the user picks/changes
   employees, not just on Save.
2. **On Save**: `handleHireConfirm` still checks for a duplicate (across
   all rows' slots) before calling the API and shows a `messageApi.error`
   naming the duplicated employee (via `hired_employee_label`, captured
   from `EmployeeSelect`'s `onChange(val, option)` second argument — AntD
   `Select` passes the full option object there), aborting the submit if
   found.

Both of these are client-side convenience only; `ManpowerRequestService::recordHires()`
enforces the same rule server-side (see the backend skill's Roadmap) and
is the actual source of truth — don't rely on the frontend checks alone if
extending this feature.

`EmployeeSelect.jsx` gained an `activeOnly` prop (default `false`,
preserving existing Replacement Employee behavior) — when true, it calls
`employeeOptionApi.getActive` (status=1) instead of `getAll` (status=-1,
all). Use `activeOnly` for any future employee picker where the person
should always be currently active; the Replacement Employee field stays
`activeOnly=false` on purpose (see "Important Business Rules" below). Its
`options` array also carries `date_employed` and `preview_hire_date`
(2026-09-21) per employee (forwarded straight from `employeeOptionApi`'s
response) so a consumer's `onChange(value, option)` can read either —
Record Hires above uses `option.preview_hire_date` (not `date_employed`,
see the correctness note above); neither is used by the Replacement
Employee field.

**Bug found and fixed while wiring this up**: `EmployeeMasterDataMaintenance`
(backend, `vueportal`) only allowed `manpower-request-create`/`-edit` (plus
some KPI permissions and two unseeded/phantom permission strings) through
its `option_list` branch — **not** `manpower-request-record-hire`. Since
the `Manpower Request Approver` role has `-record-hire` but not
`-create`/`-edit`, an Approver got a 401 trying to search for a hired
employee at all, before the backend fix. If a future permission is added
that needs `EmployeeSelect`, check this middleware branch explicitly —
don't assume having *some* manpower-request permission is enough.

## Reusable Components

- `EmployeeSelect.jsx` — controlled async searchable/paginated employee
  picker (`value`/`onChange`, `onSearch`, `onPopupScroll`, `activeOnly`).
  Reuse as-is for any other employee-picking field in this module; don't
  build a new one.
- Everything else (form, index, view, print, create/edit wrappers) is
  MRF-specific and not designed for reuse elsewhere.

## Existing Conventions To Match

- Notification pattern in this module uses
  `const [messageApi, contextHolder] = message.useMessage()` (not
  `App.useApp()`, which KPI pages use instead) — match whichever page
  you're editing; don't mix patterns within one file.
- All mutations go through `handleApiError(error, messageApi)` in the
  `catch` block.
- Dates: `dayjs`, displayed as `MM-DD-YYYY` (`MM/DD/YYYY` in the print
  view, matching the paper form), sent to the API as `YYYY-MM-DD`.
- Table page follows the shared list pattern: `rowKey="id"`, in-memory
  filtering over the store's `items` (search text / status / date range),
  `pagination={{ pageSize: 10, showSizeChanger: true }}`, permission- and
  status-gated row actions wrapped in `Popconfirm`.
- **Manual Refresh buttons (added 2026-09-14)**: `ManpowerRequestIndex.jsx`
  has one in the search/filter toolbar calling `refetch()` (from
  `useManpowerRequests`), tied to the same `isLoading` the `Table` already
  uses. `ViewManpowerRequest.jsx` has one in the header `extra` calling
  `loadRecord()` again, with its own `refreshing` state (kept separate
  from the initial-mount `loading` spinner). Relevant given the
  server-side visibility scoping above — a document can leave an
  approver's view (or a list can gain new entries) from another user's
  action without any client-side signal, so a manual way to re-pull the
  current state is useful. Use `<ReloadOutlined />` for this affordance if
  adding it to another module's list/view page, for consistency.

## Important Business Rules Discovered From The Code

1. A request is editable/submittable by its owner (or an Administrator)
   only while `Draft`/`Disapproved`/`Cancelled`/`Returned` — enforce both
   the role-or-ownership condition and the status condition, not just one.
2. `EmployeeSelect` must include inactive employees for the replacement
   field — this is intentional, not a bug.
3. `replacement_employee_id`/`replacement_reason`/`last_working_day` are
   required only when `replacement_or_additional === 'Replacement'` for
   that line item — it's per-row, not per-request.
4. `fetchById` (store) / `getById` (api) return an object with **two**
   keys (`manpower_request`, `approval_status`) — code that destructures
   it as the record directly will break.
5. Reference data (branches/positions) for the form is fetched via
   `manpowerRequestApi.getCreate()` / `store.fetchFormData()`, cached with
   `isFormDataLoaded` — do not call `positionStore`/`branchStore` inside
   MRF form code; that would fetch different/duplicate data through a
   different endpoint (`/position/get-all`, `/branch/index`) than what
   `manpower_request/create` returns.
6. `required_plantilla`/`existing_headcount` are server-computed
   snapshots, not live values — never send them from the client, and
   don't expect them to update if headcount changes after the MRF was
   saved.

## Common Mistakes To Avoid

- Trusting this file's description of routes/permissions/statuses without
  cross-checking the root `CLAUDE.md`'s "Manpower Request Conventions"
  section and the backend's `manpower-request` skill first — this file
  was badly stale once already (described `ViewManpowerRequest.jsx` as
  empty and routes as unregistered well after both were built) and could
  drift again.
- Switching MRF's API calls from POST to REST verbs "for consistency" with
  KPI — the two modules intentionally differ because they hit different
  backend controllers.
- Introducing a new `manpower-request-*` permission string without
  confirming it's seeded on the backend (`PermissionSeeder.php` +
  `ManpowerRequestRoleSeeder.php`).
- Checking only `hasPermission(...)` and forgetting the ownership
  (`record.user_id === user.id`) and status checks that this module always
  pairs with it (Print is the one exception — permission-only, by design).
- Using `positionStore`/`branchStore`/`usePositions`/`useBranches` inside
  MRF form code instead of `manpowerRequestStore`'s own
  `fetchFormData`/`branches`/`positions`.
- Building a new print/export feature for another module by inventing a
  new CSS technique instead of reusing the hide-all/show-one `@media
  print` pattern both `KpiEvaluationPrint.css` and
  `ManpowerRequestPrint.css` already use.
- Assuming a field returned correctly by one backend endpoint will also
  come back correctly from the other two — `record_hire()`'s response,
  `edit()`, and `index()` each used to hand-roll their own **separate**
  `with()` eager-load chain, so a new relation had to be added to all
  three individually (this exact bug was hit and fixed when
  `hired_employee` was added). Fixed 2026-09-21: all three now share
  `ManpowerRequestService::detailEagerLoads()` — see the backend
  `manpower-request` skill's Roadmap — but don't reintroduce a
  hand-rolled fourth copy for a new endpoint; extend that shared method
  instead.
