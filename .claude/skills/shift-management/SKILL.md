---
name: shift-management
description: Shifts and temporary shifting (relieving) — shift patterns, assigning a shift to an employee for a short period on top of their Work Schedule, the revision history kept for payroll, and ScheduleService (the schedule in force on a date, used by leave counting and next by attendance / DTR). Use for src/pages/shift/ or the /shift and /shift_assignment endpoints, or anything that needs an employee's schedule for a date.
---

# Shift Management

**User's model (2026-10-08):** the EMD **Work Schedule** stays the fixed
schedule from the approved memo (versioned by effective date — one rest
day, the same hours). **Shifting** is temporary — a short period, usually
to relieve another employee — and mainly for payroll. **No approval**: users
with the permission change it directly. The system keeps every change.

## Files

- vueportal: `Shift`, `ShiftDay`, `EmployeeShiftAssignment`,
  `EmployeeShiftAssignmentRevision`; `Services/ScheduleService.php`,
  `Services/ShiftAssignmentService.php`; `ShiftController`,
  `ShiftAssignmentController`; `ShiftMaintenance` (`shift.maintenance`,
  Administrator bypass); migrations `2026_10_09_100000/100100`.
- React: `src/pages/shift/` — `ShiftIndex` + `ShiftFormModal` (`/shifts`,
  Time & Leave → Setup → Shifts), `ShiftAssignmentIndex` +
  `ShiftAssignmentFormModal` + `ShiftHistoryModal` (`/shifting`, Time &
  Leave → Schedule → Shifting), `shiftHelpers.js`; `shiftApi.js`,
  `shiftAssignmentApi.js` (contracts in headers), `shiftStore`, `useShifts`.

## Rules

- **Shift**: code (unique, upper-cased), name, grace minutes, active; 7
  `shift_days` (Monday…Sunday): day off, or time in / out (both required,
  different; time out before time in = ends next day) + break minutes. A
  shift ever assigned can't be deleted (set inactive) and its days, hours
  and grace are locked (`ShiftController::patternChanged` → 422) —
  ScheduleService reads the live pattern for past dates too, so changing it
  would rewrite past schedules; a different pattern = a new shift. Code,
  name, description, active stay editable (index returns `assigned`).
- **Shifting** (`employee_shift_assignments`): employee, shift,
  date_from–date_to, reason, optional relieved employee (not themself),
  status Active / Cancelled. No overlapping Active shifting per employee.
  Over 31 days only warns; at most 366 days. Active only can be changed
  (reason required — stored on the revision; update is a full replace of
  shift / dates / reason / relieved); an assignment keeps its shift even if
  that shift was since made inactive; cancel needs a reason; rows are never
  deleted.
- **Revisions** (`employee_shift_assignment_revisions`): one per Created /
  Updated / Cancelled with a JSON snapshot of the state after it (period,
  status, relieved employee, shift code / name / grace and its 7 days) +
  who / when / remarks — the trail payroll needs. Period locking (payroll
  cutoffs) comes with the DTR phase.
- **ScheduleService::forRange / forDate** — the schedule in force: an
  Active shifting covering the date (its shift's day), else the Work
  Schedule version in effect (rest day ⇒ day off), else none. Per date:
  source (`shift` | `work_schedule` | null), shift_code, day_off, time_in,
  time_out, break_minutes, grace_minutes. **Use it for anything that needs
  "the employee's schedule on a date"** (LeaveService::countDays does).
- **Scope**: `shift-assignment-list-all` (or Administrator) = every
  employee; otherwise the user's **direct** subordinates (position_subs of
  their user position), own branch outside ADMINISTRATION. Enforced on
  index, preview, store, update, cancel, history (403/404 outside).

## Work Schedule picks a shift

- `employee_work_schedules.shift_id` — migration
  `2026_10_09_100200_rebuild_employee_work_schedules_table` rebuilds the
  table (user's choice — production had no rows): shift_id + index,
  rest_day / time_in / time_out nullable, index (employee_id,
  effective_date); existing rows are copied over. A new version (Work Schedule tab, Add
  Employee staged rows, import) **picks a shift** — the fixed schedule from
  the memo; `EmployeeWorkScheduleController::values()` also stores the
  shift's days off ("Saturday, Sunday") and first working day's hours in
  the old columns for vueportal's Vue screens. Versions typed in by hand
  before keep their values (React shows them as "Manual"; editing one makes
  it pick a shift). The backend still accepts hand-typed versions without a
  shift (the Vue form). A new pick must be an active shift; an edit may keep
  its now-inactive one.
- ScheduleService: a version with a shift follows that shift's day
  (source `work_schedule`, shift_code set); without, the old rest day.
- **Shifting never changes the Work Schedule history** — only adding /
  editing a version does.
- Import: template (`EmployeeWorkScheduleTemplate`, two sheets) — "Work
  Schedule" (`employee_code, effective_date, shift_code, remarks`; the only
  sheet the import reads) and "Shifts" (`ShiftReferenceSheet`: active
  codes, names and each weekday's hours). The older `rest_day, time_in,
  time_out` layout is still accepted.
- A shift picked by any Work Schedule version counts as used too (delete
  refused, pattern / grace locked). `/shift/options` (active shifts + days)
  feeds the Work Schedule / Add Employee pickers.

## Bulk shifting

"Group Shift Allocation" (`ShiftBulkAssignModal`): branch / search filter →
`/shift_assignment/candidates` (in scope, ≤ 1000; users who manage everyone
must filter) → Transfer; one shift + period + reason; `bulk_preview` names
each employee who can't take it (same rules + scope) and Save stays off
until removed; `bulk_store` is all or nothing — each employee gets their
own shifting and a Created revision ("Bulk assignment"). Max 500 at once.

## Permissions

`shift-list/-create/-edit/-delete` (Shifts), `shift-assignment-list`,
`-list-all`, `-create`, `-edit`, `-cancel` (Shifting; options also open to
create/edit). `employee_master_data/option_list` admits
shift-assignment-create/-edit (employee + relieved-employee pickers).
