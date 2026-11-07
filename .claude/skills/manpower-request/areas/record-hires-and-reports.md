# Manpower Request (frontend) — Record Hires, Excel reports and date filter

Part of the `manpower-request` skill; read `SKILL.md` first (cross-cutting rules).

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

## Excel reports + Date Filter (Index page)

- **Date Filter** `Select` (`DATE_FIELDS`: Date Created → `created_at`, Approved Date → `date_approved`; default `created_at`) sits next to the `RangePicker` and decides which field the range filters on — for the on-screen list (client-side; a record with no value for that field is excluded while a range is set) **and** both exports (sent as `date_field`/`date_from`/`date_to`, applied server-side).
- **Export Report** `Dropdown`, grouped menu, keys `<report>:<option>`:
  - *MRF Report (Approved only)* — `hiring:Open|Closed|Overall` → `exportReport()`. Always Approved-only regardless of Date Filter.
  - *Status Report (per position line)* — `status:All|<status>` → `exportStatusReport()`.
  - Saved via `downloadBlobResponse()`. Rows/columns are built server-side (vueportal `reportRows()`/`statusReportRows()`); search/status list filters are not sent.
- The hiring report's Status uses the same Open/Closed rule as below; its Aging counts from `date_approved` like the on-screen Aging.
