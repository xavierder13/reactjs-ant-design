---
name: payroll-run
description: Payroll processing — configurable cut-offs (Payroll Settings → Generate Year), Timekeeping (the DTR per cut-off: schedule, punches, time entries, leave, overtime, holidays), Payroll Runs (Draft → Approved / Cancelled, payslips), and the outputs — My Payslips, register / bank file, remittances, 13th month, year-end tax (2316 / alphalist), final pay. Use for src/pages/payroll/run/, timekeeping/, reports/, my_payslips/, the dtr / payroll_run / payroll_report / thirteenth_month / my_payslip endpoints, or any pay rule (holiday, overtime, night differential, absences).
---

# Payroll Processing

User rules (2026-10-09): payroll follows the real-world PH process; a
holiday not worked (or on leave) is never deducted; overtime on a holiday
has its own % (the premium rates' overtime column per day type).

## Files

- vueportal: `Services/DtrService.php`, `Services/PayrollRunService.php`,
  `PayrollRun`, `PayrollRunEmployee`; `DtrController`, `PayrollRunController`;
  `DtrMaintenance` (`dtr-list`), `PayrollRunMaintenance`
  (`payroll-run-list/-generate/-approve/-cancel`), Administrator bypass;
  migrations `2026_10_12_100000` (cut-off rules on payroll_settings),
  `110000/110100` (runs, run employees). Cut-off generator:
  `PayrollCutoffService::generate/periodsFor/payDate`.
- React: `src/pages/payroll/timekeeping/` (`TimekeepingIndex` `/timekeeping`,
  `DtrModal`), `src/pages/payroll/run/` (`PayrollRunIndex` `/payroll-runs`,
  `PayrollRunPage` `/payroll-runs/:id` — View: pay register, approval,
  Draft / Pending actions; `PayslipModal`,
  `DtrDaysTable` shared, `runHelpers`); `dtrApi.js`, `payrollRunApi.js`
  (contracts in headers). Menu: Payroll → Processing.
- Outputs — vueportal: `Services/PayrollReportService.php` (`figures()`
  normalizes a payslip's lines into SSS / PhilHealth / Pag-IBIG EE / ER / EC,
  tax, PD 851 basic …, reading older runs' labels too), `PayrollReportController`
  (`payroll_report.maintenance`: `payroll-report-view`; final pay
  `final-pay-view`), `ThirteenthMonthController` + `ThirteenthMonthRun/Pay`
  (`thirteenth-month-list/-generate/-approve/-cancel`), `MyPayslipController`
  (auth only, own approved payslips), `Exports/ReportSheet` / `ReportWorkbook`;
  migrations `2026_10_13_100000` (bank account on contribution profiles),
  `110000` (13th month), `120000` (employer on payroll_settings), `130000`
  (13th-month approval).
  React: `run/BankFileModal` (shared by runs and 13th month), PayslipModal
  Print (`utils/printDocument` + `reports/printTemplates`), `my_payslips/
  MyPayslipsIndex` (`/my-payslips`, open route, user menu),
  `reports/RemittanceReport` (`/remittances`), `ThirteenthMonthIndex`
  (`/thirteenth-month`), `YearEndTaxReport` (`/year-end-tax`),
  `FinalPayReport` (`/final-pay`); `payrollReportApi`, `thirteenthMonthApi`,
  `myPayslipApi`. Menu: Payroll → Reports & Compliance.

## Cut-offs (Payroll Settings → Cut-offs & Pay Days)

Two start days (1–28): 1 / 16 = 1–15, 16–end; 26 / 11 = 26–10 (from the month
before), 11–25. Pay day = the first date on or after the period's end with
that day of the month (0 = last day), moved off a Sunday / Regular or
Special holiday per `pay_day_adjust`. Generate Year can re-apply pay dates
to existing (filing on) cut-offs.

## DTR rules (DtrService)

- Punches: first IN / last OUT in the day's window (4 h before the
  scheduled in, else 04:00, to the next day's start) — night shifts keep
  their next-morning OUT. An approved manual time entry replaces in / out.
- Paid day = scheduled span − break, at most `hours_per_day` (hand-typed
  schedules have no break). Late (past grace, counted from the start),
  undertime, Absent (no punch, no leave), half-day leave 0.5, Incomplete
  (one punch — flagged, not deducted), No Schedule (flagged).
- Holiday (not a Special Working Day) not worked = Holiday, never Absent,
  leave not used; worked = minutes worked, no late / undertime. Prior-day
  rule for unworked regular holiday pay = `holiday_pay_needs_prior_day`.
- Rest day: punches alone pay nothing — rest-day work is paid through
  approved overtime.
- Today or later without punches = Upcoming (assumed worked, not deducted).
- Night minutes capped at worked minutes (break excluded).

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

## Pay rules (PayrollRunService)

- Monthly-paid: monthly ÷ the month's cut-offs (a salary change inside the
  cut-off prorated by days), less absences / unpaid leave / late /
  undertime at daily = monthly × 12 ÷ factor, hourly = daily ÷ hours per
  day; a worked holiday adds (holiday rate − 100%).
- Daily-paid: hours worked × hourly (holiday worked × its regular rate),
  paid leave × daily, unworked holiday × its "paid if unworked" rate.
- Overtime: scheduled day → the day type's overtime rate; day off → first
  `hours_per_day` at its regular rate, beyond at its overtime rate. Night
  differential = night minutes × hourly × the hour's rate × night %.
- Allowances prorated by days covered (per cut-off / per month ÷ cut-offs /
  per day worked); de minimis non-taxable (monthly excess over the limit
  taxable). Open retros of the cut-off (Deduction ones negative).
- Contributions: ContributionService::compute on the month base (monthly
  rate; daily-paid: the month's basic earnings, later cut-offs projected),
  taken per settings (Every cut-off ÷ count, or all on the 1st / last).
  Tax: taxOn() monthly — every cut-off: (taxable × count − mandatory EE) ÷
  count; 2nd cut-off: the month's taxable less tax already withheld.
- Scheduled deductions due (DeductionService::dueOn skips a cut-off already
  paid) only while the net stays ≥ 0, else a warning. Lines rounded once.
- Run: one non-cancelled per cut-off; employees = active with a salary
  saved by the cut-off's end; settings + rates copied onto it.

## Approval ("Payroll Run" Access Chart)

Draft → Submit for Approval (payroll-run-generate) → Pending → the chart's
levels (local: level 1, 2 approvals, Lady Rose Lutrania + Marilou Baltazar,
role "Payroll Approver" = payroll-run-list + -approve) → Approved on the last
approval: Payroll payments posted (pay date), retros Applied, filing OFF.
Disapprove (remarks required) → back to Draft with "Returned by …". Pending
can't be regenerated; the submitter can't approve their own; an
Administrator's approval completes a level (product rule); no levels =
payroll-run-approve decides in one step. Engine: `ApprovalProcedure` with
`$hierarchical = false` (every mapped approver of a level can act — a run
isn't one employee's filing). Approved can't be regenerated or cancelled:
correct it with a retro adjustment on the next cut-off, or roll it back.
Seeder `PayrollRunApprovalProcedureSeeder`.

## Generate selected / roll back

- **Generate Selected** (Draft, payroll-run-generate):
  - `generate` takes `employee_ids`. Only those employees are computed
    again; the others keep their lines, and the totals are re-summed from
    every line.
  - A selected employee who is no longer eligible (inactive, or no salary
    for the cut-off) leaves the run. An eligible one not in the run is
    added.
  - Refused when Payroll Settings (pay fields only — not `employer_*`) or
    the premium rates changed since the run was generated (stored
    `settings` / `rates`, compared recursively): then use Regenerate All.
  - `candidates/{id}` lists the employees in the run plus the eligible ones
    not in it.
  - Each partial generate adds an audit entry ('Payroll', attributes
    `regenerated` / `removed`).
  - UI: tick rows in the Pay Register, then Generate Selected
    (`RegenerateEmployeesModal`). Regenerate All asks for confirmation.
- **Roll Back to Draft** (Approved, payroll-run-rollback, reason):
  - `PayrollRunService::rollback` removes this cut-off's `source = Payroll`
    deduction payments (`DeductionService::removePayrollPayments` settles
    each one: Fully Paid → Active) and sets its Applied retros to Open.
  - It clears the approval and submission fields (the old ApprovedLog rows
    no longer count after a resubmit) and sets `rolled_back_by / _at`,
    `rollback_reason` (migration `2026_10_14_110000`).
  - Refused while a later cut-off's run is Approved or Pending (only the
    latest approved payroll can be rolled back), or while the year's 13th
    month is Approved or Pending.
  - The cut-off's filing stays off: reopen it on Payroll Cut-offs if late
    filings are needed.
  - The page shows "Rolled back … by …" until it is submitted again.

## Reports & compliance rules

- Every report reads **approved** runs only (register / bank preview also
  show a Draft); the bank CSV is approved-only; no payroll bank account =
  listed under "missing" (cash / check).
- Remittances: per calendar month, all approved cut-offs ending in it; BIR
  taxable = taxable pay − mandatory EE contributions.
- 13th month (PD 851): basic pay + paid leave − absences / late / undertime /
  unpaid leave + salary differentials, ÷ 12; Draft projects the rest of the
  year at the monthly rate (daily-paid: earned only); one batch per year;
  over ₱90,000 is taxable. Approval = the payroll run's: Submit
  (thirteenth-month-generate) → Pending on the "13th Month Pay" Access Chart
  (`PayrollReportService::thirteenthProcedure()`, non-hierarchical; seeder
  `ThirteenthMonthApprovalProcedureSeeder` copies the Payroll Run chart) →
  the last approval releases it; Disapprove (remarks) → Draft; Pending can't
  be regenerated / cancelled; the submitter can't decide their own.
- Year-end tax: (taxable − contributions + 13th month over ₱90k) ÷ 12 on the
  BIR monthly table × 12 vs. withheld; minimum wage earners exempt.
- Final pay: unpaid days split by the saved cut-offs and prorated against
  each full cut-off; SIL / VL balance × daily rate (VL over 10 days
  taxable); posts nothing.
- Printed documents open in their own window (`printDocument`), so no
  page-scoped print CSS is needed; the 2316 / alphalist are data layouts,
  not the official BIR forms.

## Not built yet

OT minimum / rounding; posting final pay (marking loans paid); the payroll
bank's own upload format (generic CSV now); official BIR form layouts.