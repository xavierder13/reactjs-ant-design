---
name: manual-time-entry
description: Manual time-in / time-out filings (field work, official business, missed punch, device problem) — the day's schedule and biometric punches shown with each filing, MRF-style approval through the "Manual Time Entry" Access Chart, visibility rules, and the shared ApprovalProcedure helpers (scopeForApproval / status / decide) new approval documents use. Use for src/pages/time_entry/ or the /time_entry endpoints, or when adding another approval document (e.g. overtime).
---

# Manual Time Entries

For days the biometric device couldn't record (field / outside work, an
office errand, a missed punch, a broken device). User's rule: approval like
MRF — viewing by subordinates, approver and permission.

## Files

- vueportal: `EmployeeTimeEntry` (TYPES), `Services/TimeEntryService.php`,
  `EmployeeTimeEntryController`, `TimeEntryMaintenance`
  (`time_entry.maintenance`, Administrator bypass), migration
  `2026_10_09_110000_create_employee_time_entries_table`,
  `TimeEntryApprovalProcedureSeeder` ("Manual Time Entry" module + Access
  Chart, "Time Entry Approver" role = time-entry-list + -approve).
- React: `src/pages/time_entry/` (`TimeEntryIndex` `/time-entries`, Time &
  Leave → Attendance → Manual Time Entries; `TimeEntryFormModal`,
  `TimeEntryDetailsModal`, `timeEntryHelpers`), `timeEntryApi.js` (contract
  in its header), shared `src/components/approval/ApprovalSteps.jsx`.

## Rules (TimeEntryService)

- Times follow the Attendance tab's structure: **Time In → Break Out
  (start of break) → Break In (back) → Time Out**. Break out / in are
  optional but come as a pair (and differ).
- One Pending / Approved entry per employee per date; today or past only;
  time in and/or time out (out before in = next day); active employee;
  type in TYPES; reason required. Warnings (not blocking): a date over 31
  days ago (payroll period), a day off in the schedule.
- `TimeComparison` shows Biometric vs Filed for the four times (the
  biometric reading = getAttendanceLogs' first IN, break out, break in,
  last OUT) plus all punches — in the form preview and the details dialog.
- Each filing shows that day's schedule (`ScheduleService::forDate` —
  shifting, else Work Schedule) and the **biometric punches** read from
  BioBridge (`EmployeeMasterDataController::getAttendanceLogs`, read-only;
  null when unreachable) — in the form preview and the details dialog.
- Approval / visibility / editing exactly like leave (see the
  leave-management skill): Pending at the first level, level 1 by
  subordinates, once per approver, no self-approval, approve re-checks the
  rules, Disapprove needs remarks, no edit after an approver acted, Cancel
  Pending / Approved (time-entry-cancel). No levels set up → time-entry-
  approve decides in one step.

## Shared approval helpers (for the next documents)

`ApprovalProcedure` now also has `scopeForApproval($query, $user, $table,
$fallbackPermission)`, `status($doc, $user, $fallbackPermission)` and
`decide($doc, $action, $remarks, $userId)` (status checks, self-approval,
current-level approver, logs, level advance; the caller locks employee →
document, re-checks its rules on approve, and saves). A document needs
`employee_id`, `status`, `current_level`, `submitted_at`, `acted_by`,
`acted_at`, `action_remarks` and an `employee` relation. LeaveService keeps
its own (older) copies of these. React: `ApprovalSteps` renders `status()`'s
levels (status, progress, who decided, who it waits for) and `FilingHistory`
the timeline (filed, each decision with time and remarks, cancellation;
falls back to the record's `acted_*` fields when there are no levels) — used
by the Leave, Time Entry and Overtime details modals.

## Permissions

`time-entry-list`, `-list-all`, `-create`, `-edit`, `-approve`, `-cancel`
(PermissionSeeder → Administrator). `option_list` admits time-entry-create.

## Next

Overtime filing is built on the same helpers (`src/pages/overtime/`,
vueportal `OvertimeService`, "Overtime" Access Chart). Next: the DTR —
schedule + punches + approved time entries / overtime + leave + holidays
per payroll cut-off.
