---
name: manpower-request
description: Established architecture, files, and conventions for the Manpower Request (MRF) module in this HRIS app. Use for any task that adds, fixes, or extends Manpower Request pages, forms, approval workflow, print layout, or related state/API code.
---

# Manpower Request (MRF) Module

**Status:** fully built and in active use — list, create/edit, detail with
the full approval action set, print layout, Record Hires (multi-hire per
line), line attachments, per-line Status/Aging, and the dashboard Time to
Fill widget.

This file describes the **current** state only. The dated history (how
each piece was built, bugs found, verification) is in
`docs/manpower-request-history.md` — read it only for the *why/when*.

The backend is `vueportal` (`ManpowerRequestController` /
`ManpowerRequestService`); its own `manpower-request` skill is the
canonical source for the status machine, validation and service rules.
This repo can't see it when run on its own, so the backend facts the
frontend depends on are summarized in "Backend Contract" below.

## Architecture / File Map

```
src/pages/manpower_request/request/
  ManpowerRequestIndex.jsx    list/table page
  CreateManpowerRequest.jsx   thin wrapper → ManpowerRequestForm mode="create"
  EditManpowerRequest.jsx     fetches record, guards editability, → ManpowerRequestForm mode="edit"
  ManpowerRequestForm.jsx     shared create/edit form (Form.List for position line items)
  EmployeeSelect.jsx          async searchable employee picker (Replacement Employee + Record Hires)
  ViewManpowerRequest.jsx     detail page: record + approve/disapprove/return/cancel/delete,
                              Approval History, Record Hires, per-line attachment controls
  ManpowerRequestPrint.jsx    print view (+ ManpowerRequestPrint.css)

src/store/manpowerRequestStore.js
src/services/manpower_request/manpowerRequestApi.js
src/hooks/useManpowerRequests.js
src/pages/dashboard/DashboardPage.jsx   "Manpower Request — Time to Fill" section
```

## Routes

Registered in both `AppRoutes.jsx` (`permissionRoutes`) and
`MainLayout.jsx` (`menuData` + `getPageMeta` regex cases for `:id` paths):

```
/manpower-requests            → ManpowerRequestIndex     (manpower-request-list OR -list-all)
/manpower-requests/create     → CreateManpowerRequest    (manpower-request-create)
/manpower-requests/:id        → ViewManpowerRequest      (manpower-request-list OR -list-all + action perms)
/manpower-requests/:id/edit   → EditManpowerRequest      (manpower-request-create/-edit)
/manpower-requests/:id/print  → ManpowerRequestPrint     (manpower-request-print)
```

`-list-all` must stay accepted alongside `-list` in `AppRoutes.jsx` and the
"All Requests" `menuData` entry, or a role holding only `-list-all` is
blocked client-side. The print route is opened via `window.open(...,
'_blank')` from a Print button (no `menuData` entry) but has its own
`getPageMeta` case.

## API / Service Pattern

`manpowerRequestApi.js` — **all endpoints are POST**, including reads
(unlike KPI). Keep new MRF endpoints POST:

```js
getAll:             () => POST '/manpower_request/index'
getCreate:          () => POST '/manpower_request/create'          // form reference data
getById:            (id) => POST `/manpower_request/edit/${id}`    // → { manpower_request, approval_status }
create:             (payload) => POST '/manpower_request/store'     // JSON or FormData
update:             (id, payload) => POST `/manpower_request/update/${id}`  // JSON or FormData
submit/approve/cancel/delete: (id) => POST `/manpower_request/<action>/${id}`
reject:             (id, remarks) => POST `/manpower_request/reject/${id}`
returnForRevision:  (id, remarks) => POST `/manpower_request/return/${id}`
approvalHistory:    (id) => POST `/manpower_request/approval_history/${id}`
recordHire:         (id, hires) => POST `/manpower_request/record_hire/${id}`, { hires }
detailFileUpload:   (detailId, file) => multipart POST `/manpower_request/detail/${detailId}/file_upload`
detailFileDownload: (detailId) => POST '/manpower_request/detail/file_download' { detail_id } (blob)
detailFileDelete:   (detailId) => POST '/manpower_request/detail/file_delete' { detail_id }
```

`create`/`update` detect a `FormData` payload and set explicit multipart
headers — `axiosInstance` hard-codes `Content-Type: application/json`, so
don't rely on axios auto-switching.

## State Management

`manpowerRequestStore.js`:
- `items` — list, from `fetchItems()`.
- `current`, `approvalStatus` — from `fetchById(id)`, which **returns
  `{ manpower_request, approval_status }`** (destructure both).
- `branches`, `positions`, `isFormDataLoaded` — form reference data loaded
  once via `fetchFormData()` (`manpower_request/create`). **Don't** use
  `positionStore`/`branchStore`/`usePositions`/`useBranches` in MRF form
  code — different endpoints, different data.
- Standard `isLoading`/`error`, `set()` in try/catch/finally.

`useManpowerRequests.js` auto-fetches on mount and returns `refetch`.
`ManpowerRequestPrint.jsx` deliberately bypasses the store and calls
`getById`/`approvalHistory` directly (standalone new-tab page, same as
`KpiEvaluationPrint.jsx`).

## Forms (`ManpowerRequestForm.jsx`)

- `Form layout="vertical"`: header `Card` (branch, request date, priority,
  target hiring date, reason), then `Form.List name="details"` of position
  lines, each its own small `Card` (`MinusCircleOutlined` remove, dashed
  `PlusOutlined` add, list-level "at least one" validator).
- `replacement_or_additional`: `Replacement`, `Additional`, `New Position`.
  All use the same fields; New Position still selects an existing
  `position_id` (not a free-text title).
- Conditional fields (`shouldUpdate` + `getFieldValue`):
  `replacement_employee_id`/`replacement_reason`/`replacement_reason_other`/
  `last_working_day` when Replacement; `experience_years` when
  `experience_required`; `prc_license_type` when PRC is Required;
  `drivers_license_code` when Professional/Non-Professional. Option
  constants (`REPLACEMENT_REASONS`, `DRIVERS_LICENSE_CODES`, …) must match
  the backend's `ManpowerRequestController` constants.
- **Required fields:** every field is client-side `required` except
  `experience` (free text) and `salary_grade`, including conditional fields
  while visible. `request_date` also blocks future dates
  (`disabledDate={(current) => current > dayjs().endOf('day')}`).
- **Branch lock:** when `hasRole('Manpower Requestor') &&
  !hasRole('Administrator')`, Branch is auto-filled from `user.branch_id`
  and locked — via `open={false}` + no `suffixIcon` + `tabIndex={-1}` +
  `pointerEvents: 'none'`, **not** AntD `disabled` (which darkens the field;
  the value still submits normally). Administrators keep full choice.
- **Replacement quantity lock:** a Replacement line's Quantity is set to
  `1` and made `readOnly` (not `disabled`) as soon as Replacement is chosen.
- `required_plantilla`/`existing_headcount` are server-computed — display
  only, never sent.
- `buildPayload(values)` builds the payload (dayjs → `'YYYY-MM-DD'`) —
  extend it, don't build payloads ad hoc. Edit mode pre-fills via
  `form.setFieldsValue` in a `useEffect` on `initialData`.

### Line attachments (form)

- Always available on each line in Create/Edit (not gated on a saved id).
  Required only for `Additional`/`New Position`, and only to **submit** —
  a Draft saves without it. Optional for Replacement.
- A newly picked `File` lives in local state `detailFiles`, keyed by the
  `Form.List` item's stable `field.key` (not array index), synced each
  render via `fieldKeysRef` — not in AntD Form state.
- An **existing** attachment is carried in the form as plain `file_name`/
  `file_path`/`file_type`/`file_date_upload` values and **must be re-sent on
  every update** — the backend deletes and recreates every line on save, so
  omitting them silently wipes the attachment. Remove clears them via
  `form.setFieldValue`.
- `saveRequest` sends plain JSON when no line has a new file, and switches
  to `FormData` (`details[i][field]` bracket notation) only when at least
  one does.
- `handleSaveAndSubmit` (not `handleSaveDraft`) runs
  `findMissingAttachmentLines` before calling the API, mirroring the
  backend check; the failure message shows the backend's error text when
  available.
- The nested multipart path has not been live-tested end-to-end.

## `EmployeeSelect.jsx`

Controlled async searchable/paginated picker (`value`/`onChange`,
`onSearch`, `onPopupScroll`). Reuse it for any employee field in this
module; don't build a new one.
- **Includes inactive employees by default** (labelled "— Inactive") — the
  replaced employee has usually left. Don't "fix" this.
- `activeOnly` (default `false`) → `employeeOptionApi.getActive` instead of
  `getAll`. Record Hires uses it; Replacement Employee doesn't.
- `branchId`/`positionId`: passed by Replacement Employee (form's
  `branch_id` / that line's `position_id`) and by every Record Hires slot
  (`record.branch_id` / `row.position_id`). `hiredOnOrAfter`: **Record Hires
  only**, `record.date_approved`; never for Replacement Employee.
- Semantics: a prop left `undefined` = unfiltered for that dimension. A
  prop passed (even `null`) = filtered mode — the Select is disabled with a
  "Select a branch/position/approved date first" placeholder and doesn't
  fetch until every given filter has a value, reloading when any changes.
  Changing branch/position does **not** clear an already-picked
  `replacement_employee_id` (not implemented).
- `status` prop is forwarded to AntD `Select` (used for duplicate-hire
  errors). Options carry `date_employed` and `preview_hire_date`;
  `onChange(value, option)` passes the full option.

## Permissions

`manpower-request-list`, `-list-all`, `-create`, `-edit`, `-delete`,
`-submit`, `-cancel`, `-approve`, `-disapprove`, `-reject`, `-return`,
`-print`, `-record-hire`. Roles (backend-seeded):
`Manpower Requestor`, `Manpower Request Approver`, `Manpower Request
Administrator` (`-list`, `-list-all`, `-record-hire` only — no
approve/edit/delete). **`-record-hire` is Administrator-only**, not on the
Approver role. Confirm any new permission string is seeded before using it.

Gate shape (repeat it for any new action — `ViewManpowerRequest.jsx`'s
`canEdit`/`canSubmit`/`canDelete`, and `ManpowerRequestIndex.jsx`):

```js
const canEdit =
  ['Draft', 'Disapproved', 'Cancelled', 'Returned'].includes(record.status) &&
  (hasRole('Administrator') ||
    (hasAnyPermission('manpower-request-create', 'manpower-request-edit') && record.user_id === user.id));
```

- Administrator bypasses ownership; everyone else needs permission **and**
  ownership, plus the status condition.
- The editable-status list (`Draft`/`Disapproved`/`Cancelled`/`Returned`) is
  duplicated in `ManpowerRequestIndex.jsx`, `ViewManpowerRequest.jsx` and
  `EditManpowerRequest.jsx`'s route guard — keep all three in sync.
- Approve/Disapprove/Return additionally require
  `approval_status.can_approve` (`canActOnApproval`) — the frontend never
  computes eligibility itself.
- Print checks only `hasPermission('manpower-request-print')`.

## Approval Workflow / Status Handling

Statuses: `Draft`, `Pending Approval`, `Approved`, `Disapproved`,
`Returned`, `Cancelled` (stored string is `Disapproved`, though the
route/permission/button say reject/disapprove). `STATUS_COLORS` in Index
and View → `Tag`: Draft/Cancelled default, Pending Approval gold, Approved
green, Disapproved red, Returned orange.

Actions (from `ViewManpowerRequest.jsx`'s guards, matching the backend):
- Edit / Submit: `Draft`/`Disapproved`/`Cancelled`/`Returned`,
  Administrator-or-owner. Resubmitting from `Returned` resumes approval at
  the same `current_level` server-side.
- Cancel: `Draft`/`Pending Approval`/`Returned`, **owner only** (no
  Administrator bypass).
- Delete: `Draft`/`Cancelled`, Administrator-or-owner.
- Approve (`Popconfirm`) / Disapprove / Return (shared required-remarks
  `Modal` with `Input.TextArea`): `Pending Approval` + `can_approve`.

The header grid shows **Approved Date** (`record.date_approved`) next to
Current Level. Both Index and View have a manual Refresh (`ReloadOutlined`;
Index → `refetch()`, View → `loadRecord()` with its own `refreshing`
state) because visibility can change from other users' actions.

## Record Hires ("FOR HR USE ONLY")

- Button in `ViewManpowerRequest.jsx`'s header `extra`, visible when
  `hasPermission('manpower-request-record-hire') && record.status ===
  'Approved'` (no ownership check).
- Modal: one `Card` per line (`hireRows`, seeded from `record.details` on
  open), each with `slots` = `quantity`-many entries pre-filled from
  `d.hires`. Each slot: `EmployeeSelect` (`activeOnly`, `branchId`,
  `positionId`, `hiredOnOrAfter`) plus a **read-only** "Date Hired/Date
  Assigned" `Typography.Text` — never a `DatePicker`. Slots are labelled
  `Hired Employee #n` only when there's more than one. Employee and date
  each take a full-width row (`Col span={24}`). Updates go through
  `updateHireSlot(detailId, slotIndex, changes)`.
- The date shown on selection is `option.preview_hire_date` (**not**
  `date_employed`) — the same value the backend will persist (latest
  branch assignment date first, else `date_employed`).
- Save → `recordHire(record.id, hires)` with `hires: [{ detail_id,
  hired_employee_ids }]` (array, empties filtered). **No `date_hired` in
  the payload.** Then reload the record.
- Duplicates: the same employee can't be in two slots/lines of one
  request. Live feedback: duplicated slots get `status="error"` plus a red
  "This employee is already selected for another position." line. On save,
  `handleHireConfirm` blocks and names the employee (`hired_employee_label`
  from `onChange`'s option). The backend enforces this too and is the real
  authority; it also caps hires per line at `quantity`.
- Main detail view maps over `d.hires` — one read-only row per hire with
  its own Time to Fill.

## Per-line Status / Aging, Time to Fill

- Each detail line shows a derived `Status` tag: `Open` while it has no
  hires, `Closed` once it has at least one (user-confirmed direction).
  `Aging` (days from `record.date_approved` to today) shows only while
  `Open`.
- **Time to Fill** = `date_approved` → each hire's `date_hired`, one value
  per **hire**. Used per hire in `ViewManpowerRequest.jsx` and in
  `DashboardPage.jsx`'s section (average card, by-position chart,
  by-hire-month trend). MRFs without `date_approved` or hires without
  `date_hired` are excluded.

## Line attachments (View page)

`ViewManpowerRequest.jsx` also has a post-save attach/replace/remove/
download control per line (`detailFileUpload`/`detailFileDownload`/
`detailFileDelete`). Upload/delete gated on `canEdit`; download has no
extra gate. The backend only allows upload/delete in editable statuses.

## Print Layout

`ManpowerRequestPrint.jsx` + `.css`, route `/manpower-requests/:id/print`,
permission `manpower-request-print`. Follow `KpiEvaluationPrint.jsx`'s
pattern — don't invent a new print technique:
- A normal page route inside `MainLayout`/`ProtectedRoute`. `@media print`:
  `body * { visibility: hidden }`, reveal only `.mrf-print`, force it to
  `position: absolute; top: 0; left: 0`. `.no-print` hides the Print
  button.
- Rows use `page-break-inside: avoid`; `thead { display:
  table-header-group }` repeats headers.
- Header logo: `src/assets/addessa-logo.jpg` (extracted from the backend's
  MRF PDF) — reuse it.
- A **filled record**, not the blank template: approval signature lines are
  the real `approval_history` entries. "Reason for Request" prints once for
  the whole request, with the Replacement/Additional/New Position columns
  each itemizing their lines (numbered when more than one) — not once per
  line. "FOR HR USE ONLY" is always the itemized table: one row per (line,
  hire), a line with no hire gets one blank row. Its label stays "Date
  Hired".
- Header uses the branch name; Job Description uses the position name.
- Dates print as `MM/DD/YYYY`. Real paper/PDF pagination is unverified.

## Backend Contract (vueportal) the frontend depends on

- Visibility: without `-list-all`, `index()`/`edit()` return only the
  user's own requests, requests `Pending Approval` at a level they approve,
  and requests they have an approval-log entry on. Blocked `edit()` → 404.
  No frontend filtering logic — pages render whatever the API returns.
- `update()` replaces all detail lines (new ids every save) — always send
  the full line set.
- The backend does **not** enforce several frontend-only rules: Branch
  lock (a crafted call can file for another branch), Replacement quantity =
  1, most "required" fields (still `nullable` server-side), and no future
  `request_date`. Don't treat the UI rules as security.
- `EmployeeMasterDataMaintenance` must allow a permission through its
  `option_list` branch for `EmployeeSelect` to work — it allows
  `-create`, `-edit`, `-record-hire`. A new MRF role using the picker needs
  its permission added there (backend change).
- A new relation on detail lines must be added to the backend's shared
  `detailEagerLoads()` so `index`/`edit`/`record_hire` all return it.

## Existing Conventions To Match

- Notifications in this module use `const [messageApi, contextHolder] =
  message.useMessage()` — match the page you're editing; don't mix
  patterns in one file.
- All mutations `catch` → `handleApiError(error, messageApi)`.
- Dates: dayjs, displayed `MM-DD-YYYY` (`MM/DD/YYYY` in print), sent
  `YYYY-MM-DD`.
- List page: `rowKey="id"`, in-memory filtering over `items` (search /
  status / date range), `pagination={{ pageSize: 10, showSizeChanger:
  true }}`, permission+status-gated row actions in `Popconfirm`.

## Not Yet Built

In-app notifications; a "Pending My Approval"/"My Requests" filter view
(data is already scoped server-side).

## Common Mistakes To Avoid

- Switching MRF calls from POST to REST verbs.
- Checking only `hasPermission(...)` without the ownership and status
  conditions (Print is the one permission-only exception).
- Using `positionStore`/`branchStore`/`usePositions`/`useBranches` in MRF
  form code.
- Adding a `DatePicker` for Date Hired, sending `date_hired`, or using
  `option.date_employed` for the Record Hires preview.
- Not re-sending an existing attachment's file fields on update.
- Using AntD `disabled` for the Branch/Quantity locks.
- Updating one copy of the editable-status list without the other two.

## Keeping this file current

After changing this module, **edit the relevant section above in place**
so it describes the new current state, and delete anything the change made
untrue. Don't append dated "added YYYY-MM-DD" entries; put the narrative in
the commit message and, if worth keeping, `docs/manpower-request-history.md`.
