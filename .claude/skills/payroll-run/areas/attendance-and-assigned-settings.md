# Payroll processing — attendance logs and assigned settings

Part of the `payroll-run` skill; read `SKILL.md` first (cross-cutting rules).

## Attendance logs (imported)

For employees whose punches don't come from BioBridge, or to correct a day.
Files: `attendance_logs` (`AttendanceLog`, `AttendanceLogService`,
`AttendanceLogController`, `AttendanceLogMaintenance`, prefix
`attendance_log`; migration `2026_10_14_120000`); React
`attendanceLogApi.js` plus the "attendance_log" document type in
`importDocumentTypes.js`. It is reached from the Timekeeping page
(Attendance Template / Import Attendance) and from the EMD Generate
Template / Import Data dialogs.

- **Template** (`templateOptions.dateRange`, at most 31 days, plus status
  and branch / position / employees): one line per employee per date —
  `employee_code, employee_name, date, time_in, break_out, break_in,
  time_out, remarks` — prefilled with what is already imported. All cells
  are text.
- **Import:**
  - Times are HH:MM, 24-hour; any may be blank. A time earlier than the one
    before it is the next day. A line spans at most 24 hours.
  - A line replaces that employee's imported punches of that date; no
    times clears them.
  - Refused: future dates, dates inside an Approved or Pending payroll,
    duplicate employee + date lines, unknown codes.
  - All or nothing. One 'Attendance' audit entry per file (subject_type
    `App\AttendanceLog`, no subject_id).
- **Merge:** `DtrService::punches` → `AttendanceLogService::mergeInto`, and
  `getAttendanceLogs` (Attendance tab, time-entry preview) → `mergeRaw`.
  On a work date with imported punches, those replace that calendar date's
  BioBridge punches; every other date keeps BioBridge. BioBridge itself is
  never written.

## Assigned settings (Payroll Settings → Assigned Settings)

`payroll_setting_assignments` (`PayrollSettingAssignment`,
`PayrollSettingAssignmentService`, `PayrollSettingAssignmentController`,
`payroll_setting/assignments/*` under `payroll_setting.maintenance`:
index / options = payroll-setting-view, store / update / cancel =
payroll-setting-edit; migrations `2026_10_19_110000`, `2026_10_21_100000`
(night-diff hours)). React:
`settings/SettingAssignmentsTab` + `SettingAssignmentFormModal`
(`payrollSettingApi.assignment*`); `employee_master_data/option_list`
admits payroll-setting-edit for the employee picker.

- An employee / position / branch / company gets its own
  `daily_rate_factor`, `hours_per_day`, `night_diff_enabled`,
  `night_diff_from` / `night_diff_to`, `sss /
  philhealth / pagibig / tax_deduction` for a **coverage** (required):
  `cutoffs` (start..end cut-off; To follows From in the form, so one
  cut-off = that payroll only) or `dates` (a date range). Both are kept as
  `effective_date..end_date` and cover the cut-offs **ending** inside it
  (like the reports' date filter) — a cut-off whole or not at all; after it
  the next level applies again. Per field, the first set value wins:
  employee → current position → current branch → the branch's company →
  Payroll Settings. One target's coverages can't cover the same cut-off
  (a cut-off ending in the dates they share, or shared dates past the last
  cut-off made).
- `overridesFor(ids, date)` + `apply(setting, override)` (a copy, never
  saved) feed `DtrService::forEmployees` (hours per day and the
  night-differential hours `nightMinutes()` counts, by the range's end), `PayrollRunService::generate` / `payPeriod` and final pay (by the
  cut-off's `date_to` / the last day). A payslip with any keeps
  `summary.settings_from` (field → "Branch: X (from 2026-10-B)"), shown on
  the PayslipModal.
- The run's `settings` copy includes `assignments` (`snapshot()`: the
  Active ones in effect), so a change blocks a partial generate like a
  Payroll Settings change.
- Night differential Off (Payroll Settings `night_diff_enabled`, migration
  `2026_10_19_120000`, default On; or assigned) = no Night Differential
  line, regular or overtime hours; the DTR still counts night minutes. An
  assignment turning it Off needs a reason (law: exempt employees only).
- Assigned night-differential hours (`night_diff_from` / `night_diff_to`,
  `HH:MM` in, `HH:MM:SS` stored): both or neither, blank when the
  assignment turns it Off, and they must contain 10 PM – 6 AM (Labor Code
  Art. 86) — wider only (`checkNightDiffHours`). The rate stays the
  premium rates' `night_diff_rate`; there's no per-assignment rate.
- Rules: at least one field; the first cut-off covered not Approved /
  Pending (on update the current coverage's too); target fixed on update;
  cancel needs a reason, the row is kept; the list tags an Active one whose
  end_date has passed as Ended.
  No approval; audit trail 'Payroll'.
- Employees: One (`EmployeeSelect`) or **Bulk** like Group Shift
  Allocation — `candidates` (branch / search, active, ≤ 1000) → Transfer;
  `bulk_preview` names who can't take it (inactive, an overlapping
  coverage) and Save stays off; `bulk_store` (≤ 500) is all or nothing,
  one row per employee.
