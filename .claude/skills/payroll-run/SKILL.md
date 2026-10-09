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
  `FinalPayReport` (`/final-pay`), `PaySheetReport` (`/pay-sheet`),
  `ContributionHistoryReport` (`/contribution-history`) — both on the shared
  `RangeFilters` + `rangeHelpers` — and `contribution/ContributionHistoryModal`
  (Contributions → History row action); `payrollReportApi`,
  `thirteenthMonthApi`, `myPayslipApi`. Menu: Payroll → Reports & Compliance.

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
  undertime, Absent (no punch, no leave), half-day leave 0.5 (a leave day
  without credit is split paid / unpaid — `unpaid_days`, the last days of the
  leave — and the unpaid part is deducted like an absence), Incomplete
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

Draft → Submit for Approval (payroll-run-generate; turns the cut-off's filing
OFF — "Payroll X submitted for approval" — so nothing is filed, edited or
approved inside it while it waits) → Pending → the chart's
levels (local: level 1, 2 approvals, Lady Rose Lutrania + Marilou Baltazar,
role "Payroll Approver" = payroll-run-list + -approve) → Approved on the last
approval: Payroll payments posted (pay date), retros Applied, filing OFF.
Disapprove (remarks required) → back to Draft with "Returned by …", filing ON
again when the submit had turned it off (not when Payroll had). An approved
leave / time entry / overtime inside a Pending or approved payslip can't be
cancelled (`PayrollRunService::assertNotLocked`; rows carry `pending_in` /
`paid_in`, `PaidTag`) — except by an Administrator. A scheduled deduction
changed after generating (cancelled, paid manually) makes the approval fail
naming the employee: return it, generate that employee again. A month's
payrolls are approved in order (the later cut-off's tax true-up and
daily-paid contribution base read the earlier ones): submit / approve is
refused while an earlier cut-off of the same month is Draft / Pending, and
generating is refused while a later one of the month is Pending / Approved
(or keeps approved payslips). Pending
can't be regenerated; the submitter can't approve their own; an
Administrator's approval completes a level (product rule); no levels =
payroll-run-approve decides in one step. Engine: `ApprovalProcedure` with
`$hierarchical = false` (every mapped approver of a level can act — a run
isn't one employee's filing). Approved can't be regenerated or cancelled:
correct it with a retro adjustment on the next cut-off, or roll it back.
Seeder `PayrollRunApprovalProcedureSeeder`.

## Generate selected / roll back

A payslip is **approved** when `payroll_run_employees.posted_at` is set
(migration `2026_10_14_130000`, backfilled for approved runs).
`PayrollRunEmployee::approved()` (posted, run not Cancelled) is what reports,
My Payslips, 13th month and final pay read, so a payslip kept through a
rollback stays visible. Approval (`finalize`) posts only unposted rows, so
deduction payments are never duplicated.

- **Generate** (payroll-run-generate):
  - `generate` takes `employee_ids`: on a Draft only those are computed
    again (the others keep their lines, totals re-summed); on a cut-off with
    no run it makes a run with just those. A chosen employee no longer
    eligible (inactive / no salary) leaves the run; an eligible one not in it
    is added.
  - Approved (posted) employees are never recomputed: choosing one is
    refused ("roll their payslips back first"), Regenerate All skips them.
  - Refused when Payroll Settings (pay fields only — not `employer_*`) or the
    premium rates changed since the run was generated: then Regenerate All.
    With posted rows kept, such a change blocks generating.
  - `candidates/{runId}` (the run's employees + eligible not in it) and
    `cutoff_candidates/{cutoffId}` (the cut-off's run, or the eligible when
    there is none) rows carry `in_run`, `eligible`, `approved`.
  - Each partial generate adds an audit entry ('Payroll', `regenerated` /
    `removed`).
  - UI: Payroll Runs → Generate Payroll has All / Selected employees
    (`cutoff_candidates`, approved ones disabled). On the run page, tick
    rows then Generate Selected (`RegenerateEmployeesModal`, approved options
    disabled); Regenerate All asks for confirmation.
- **Roll back** (payroll-run-rollback, reason, `employee_ids` or none = all
  approved):
  - On an Approved run, or a Draft that still has approved payslips.
  - Removes those employees' `source = Payroll` deduction payments of the
    cut-off (`DeductionService::removePayrollPayments`: Fully Paid → Active),
    reopens their Applied retros and unposts them. The run goes back to Draft
    (submit and approve again); the other payslips stay approved.
  - Clears the approval and submission fields and sets `rolled_back_by /
    _at`, `rollback_reason` (migration `2026_10_14_110000`); the page shows
    "Rolled back … by …" until it is submitted again.
  - Refused while a later cut-off's run is Approved or Pending, or while the
    year's 13th month is Approved or Pending. Cancel is refused while
    approved payslips remain.
  - The cut-off's filing stays off: reopen it on Payroll Cut-offs if late
    filings are needed.
  - UI: approved rows show an "Approved" lock tag on a Draft; ticking them
    gives Roll Back Selected (n); Roll Back All (Approved run) / Roll Back All
    Approved (n) (Draft). Cancel Payroll is hidden while any are approved.

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
- Range reports (`payroll_report/contribution_history`, `pay_sheet`,
  `payslips`): `{ date_from, date_to }` = approved payslips whose cut-off
  ENDS in it (≤ 1 year; the cut-off range sends the first cut-off's start and
  the last one's end), filtered by company / branch / position (the
  employee's **current** ones — a payslip keeps no branch) and
  `employee_ids`. Contribution History: per employee SSS EE / ER / EC,
  PhilHealth EE / ER, Pag-IBIG EE / voluntary / ER, tax, EE / ER totals,
  expandable per cut-off; the Contributions page's History modal is the same
  endpoint with one employee (default this year). Pay Sheet: one line per
  employee summed over the cut-offs, tabs By Company / Branch / Position /
  Cut-off; Print Payslips joins `payslipHtml` with a page break (≤ 500, else
  422). Both download Excel.
- Final pay: unpaid days split by the saved cut-offs and prorated against
  each full cut-off; SIL / VL balance × daily rate (VL over 10 days
  taxable); posts nothing.
- Printed documents open in their own window (`printDocument`), so no
  page-scoped print CSS is needed; the 2316 / alphalist are data layouts,
  not the official BIR forms.

## Not built yet

OT minimum / rounding; posting final pay (marking loans paid); the payroll
bank's own upload format (generic CSV now); official BIR form layouts.