# Manpower Request (MRF) — frontend change history

Archive of how the Manpower Request frontend module evolved: dated entries,
bugs found and fixed, verification notes. **Not loaded by Claude by
default** — the current rules and facts live in
`.claude/skills/manpower-request/SKILL.md`. Read this only when you need the
*why/when* behind a current rule. The backend's own history lives in the
`vueportal` repo (`docs/manpower-request-history.md`).

Moved here verbatim on 2026-09-26: the full previous version of the skill,
and the former "Manpower Request Conventions" section of `CLAUDE.md`. Some
entries describe states later superseded (e.g. `-record-hire` on the
Approver role, a single hire per line); the skill is authoritative for the
current state.

---

## Former `CLAUDE.md` "Manpower Request Conventions" section


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


---

## Previous full version of `.claude/skills/manpower-request/SKILL.md`

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
