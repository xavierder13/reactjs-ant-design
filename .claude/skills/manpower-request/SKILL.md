---
name: manpower-request
description: Established architecture, files, and conventions for the Manpower Request (MRF) module in this HRIS app. Use for any task that adds, fixes, or extends Manpower Request pages, forms, approval workflow, or related state/API code.
---

# Manpower Request (MRF) Module

Status: **in progress, not fully wired into the app.** Verify current state
before assuming anything below still matches — this module is actively
changing.

## Architecture / File Map

```
src/pages/manpower_request/request/
  ManpowerRequestIndex.jsx    list/table page
  CreateManpowerRequest.jsx   thin wrapper → ManpowerRequestForm mode="create"
  EditManpowerRequest.jsx     fetches record, guards editability, → ManpowerRequestForm mode="edit"
  ManpowerRequestForm.jsx     shared create/edit form (Form.List for position line items)
  EmployeeSelect.jsx          async searchable Select for "replacement employee"
  ViewManpowerRequest.jsx     EMPTY FILE — detail/approval page not yet implemented

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

## Routes

**Not currently registered anywhere.** `AppRoutes.jsx` has no import or
`permissionRoutes` entry for any MRF page, and `MainLayout.jsx` has no
`menuData`/`titleMap` entry either. The pages internally link to and expect:

```
/manpower-requests            → ManpowerRequestIndex
/manpower-requests/create     → CreateManpowerRequest
/manpower-requests/:id        → ViewManpowerRequest (not implemented)
/manpower-requests/:id/edit   → EditManpowerRequest
```

Any task that should make MRF usable in the running app must add these to
**both** `AppRoutes.jsx` (`permissionRoutes` array) and `MainLayout.jsx`
(`menuData` entry + `titleMap` or a regex case in `getPageMeta` for the
`:id` and `:id/edit` paths) — follow the same shape as the KPI Evaluations
entries in those two files.

## API / Service Pattern

`src/services/manpower_request/manpowerRequestApi.js` — **all endpoints are
POST**, including reads (this module does not use REST verbs, unlike KPI's
service). Keep new endpoints POST-based for consistency with this module's
backend controller:

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
approvalHistory:    (id) => axios.post(`/manpower_request/approval_history/${id}`)
```

`approve`, `reject`, `returnForRevision`, and `approvalHistory` exist in
the service but have **no UI caller yet** — they're expected to be used by
`ViewManpowerRequest.jsx` once built.

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

## Forms

`ManpowerRequestForm.jsx` is shared between create and edit (`mode` prop).
- `Form layout="vertical"`, header fields (branch, request date, priority,
  target hiring date, reason) in a `Card`, then a `Form.List name="details"`
  of position line items in a second `Card`.
- Each line-item row is its own small `Card` with `MinusCircleOutlined` to
  remove and a dashed `Button` + `PlusOutlined` to add another; `Form.List`
  has a `rules` validator requiring at least one item.
- Conditional field: `replacement_employee_id` (via `EmployeeSelect`) only
  renders/required when `replacement_or_additional === 'Replacement'` for
  that row — implemented with `Form.Item shouldUpdate` + `getFieldValue`.
- `buildPayload(values)` maps form values (including `dayjs` dates →
  `'YYYY-MM-DD'` strings) into the API payload shape — extend this
  function, don't build payloads ad hoc elsewhere.
- Edit mode pre-fills via `form.setFieldsValue` in a `useEffect` keyed on
  `initialData`, converting date strings back to `dayjs`.

## Validation

- Client-side: AntD `rules={[{ required: true, message: '...' }]}` on
  required fields (branch, reason, position, quantity, and conditionally
  replacement employee).
- Server-side 422 errors are surfaced via the shared `handleApiError`
  util — no MRF-specific error handling exists or should be added.

## Permissions

Strings currently used: `manpower-request-create`, `manpower-request-edit`,
`manpower-request-cancel`. No `manpower-request-list`/`-approve`/`-print`
etc. exist in the code yet — **do not assume a permission string exists**;
grep for it first, and check with the user/backend before introducing a
new one.

Checks are done with `useAuth()`'s `hasPermission`/`hasAnyPermission`,
combined with status and ownership, e.g.:

```js
const canEdit = (record) =>
  hasAnyPermission('manpower-request-create', 'manpower-request-edit') &&
  ['Draft', 'Returned'].includes(record.status) &&
  record.user_id === user.id;
```

Ownership (`record.user_id === user.id`) is required in addition to the
permission check for edit/submit/cancel — permission alone is not
sufficient in this module's authorization logic.

## Approval Workflow / Status Handling

Statuses seen in code: `Draft`, `Submitted`, `Pending Approval`, `Approved`,
`Rejected`, `Returned`, `Cancelled`. Rendered via a `STATUS_COLORS` map →
AntD `Tag` (`Draft`/`Cancelled` = default/grey, `Pending Approval` = gold,
`Approved` = green, `Rejected` = red, `Returned` = orange).

The record also carries a `current_level` field, implying a multi-level
approval chain — the frontend does not compute approval eligibility
itself; treat `approval_status`/level data returned by the API as the
source of truth (mirrors how KPI's `can_approve` flag works — don't
re-derive "can this user approve" from role/permission checks alone).

Allowed transitions inferred from the Index page's guard functions:
- Edit / Submit: only from `Draft` or `Returned`, owner only
- Cancel: from `Draft`, `Submitted`, `Pending Approval`, or `Returned`,
  owner only
- Approve / Reject / Return: no UI yet; build against
  `KpiEvaluationView.jsx`'s pattern (Popconfirm for approve, a Modal with
  a required reason `Input.TextArea` for reject/return) when implementing
  `ViewManpowerRequest.jsx`.

## Reusable Components

- `EmployeeSelect.jsx` — controlled async searchable/paginated employee
  picker (`value`/`onChange`, `onSearch`, `onPopupScroll`). Reuse as-is for
  any other employee-picking field in this module; don't build a new one.
- Everything else (form, index, create/edit wrappers) is MRF-specific and
  not designed for reuse elsewhere.

## Existing Conventions To Match

- Notification pattern in this module uses
  `const [messageApi, contextHolder] = message.useMessage()` (not
  `App.useApp()`, which KPI pages use instead) — match whichever page
  you're editing; don't mix patterns within one file.
- All mutations go through `handleApiError(error, messageApi)` in the
  `catch` block.
- Dates: `dayjs`, displayed as `MM-DD-YYYY`, sent to the API as
  `YYYY-MM-DD`.
- Table page follows the shared list pattern: `rowKey="id"`, in-memory
  filtering over the store's `items` (search text / status / date range),
  `pagination={{ pageSize: 10, showSizeChanger: true }}`, permission- and
  status-gated row actions wrapped in `Popconfirm`.

## Important Business Rules Discovered From The Code

1. A request is only editable by its **owner**, and only while
   `Draft`/`Returned` — enforce both conditions, not just status.
2. `EmployeeSelect` must include inactive employees for the replacement
   field — this is intentional, not a bug.
3. `replacement_employee_id` is required only when
   `replacement_or_additional === 'Replacement'` for that line item —
   it's per-row, not per-request.
4. `fetchById` returns an object with **two** keys
   (`manpower_request`, `approval_status`) — code that destructures it as
   the record directly will break.
5. Reference data (branches/positions) for the form is fetched via
   `manpowerRequestApi.getCreate()` / `store.fetchFormData()`, cached with
   `isFormDataLoaded` — do not call `positionStore`/`branchStore` inside
   MRF form code; that would fetch different/duplicate data through a
   different endpoint (`/position/get-all`, `/branch/index`) than what
   `manpower_request/create` returns.

## Common Mistakes To Avoid

- Assuming MRF routes work without checking `AppRoutes.jsx` /
  `MainLayout.jsx` first — they currently don't.
- Treating `ViewManpowerRequest.jsx` as already implemented — it's empty.
- Switching MRF's API calls from POST to REST verbs "for consistency" with
  KPI — the two modules intentionally differ because they hit different
  backend controllers.
- Introducing a new `manpower-request-*` permission string without
  confirming it's seeded on the backend.
- Checking only `hasPermission(...)` and forgetting the ownership
  (`record.user_id === user.id`) and status checks that this module always
  pairs with it.
- Using `positionStore`/`branchStore`/`usePositions`/`useBranches` inside
  MRF form code instead of `manpowerRequestStore`'s own
  `fetchFormData`/`branches`/`positions`.
