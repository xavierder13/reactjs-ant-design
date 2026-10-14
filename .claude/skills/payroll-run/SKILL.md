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
  migrations `2026_10_13_100000` (old bank columns on contribution profiles
  — unused since `2026_10_17_100000–100400`: banks, employee_bank_accounts
  + the move, company_bank_accounts + payroll_settings.match_employee_bank,
  paid-from on payroll_runs / thirteenth_month_runs),
  `110000` (13th month), `120000` (employer on payroll_settings — unused
  since `2026_10_20_100000`), `130000` (13th-month approval),
  `2026_10_20_100000` (employer details on `companies`), `110000`
  (`company_id` on runs / 13th-month runs and their lines).
  React: `run/BankFileModal` (shared by runs and 13th month), PayslipModal
  Print (`utils/printDocument` + `reports/printTemplates`), `my_payslips/
  MyPayslipsIndex` (`/my-payslips`, open route, My Workspace + user menu;
  a date / cut-off range — the cut-offs of the employee's own payslips —
  narrows the list and drives Print Pay Sheet (one line per cut-off + total,
  `my_payslip/pay_sheet`), Export Pay Sheet (`/pay_sheet/download`, .xls) and
  Print Payslips (`my_payslip/payslips`, ≤ 100) — own data only, no permission),
  `my_attendance/MyAttendanceIndex` (`/my-attendance`, open route, My
  Workspace — vueportal `MyAttendanceController`: the linked employee's own
  DTR per cut-off, no permission), `timekeeping/DtrSummary` (the DTR banner,
  shared with `DtrModal`). Each DTR time in / out carries its source —
  `biometric` (Bio), `imported` (Attendance Logs import) or `time entry`
  (Manual) — shown as a tag in `DtrDaysTable`,
  `reports/RemittanceReport` (`/remittances`), `ThirteenthMonthIndex`
  (`/thirteenth-month`), `YearEndTaxReport` (`/year-end-tax`),
  `FinalPayReport` (`/final-pay`), `PaySheetReport` (`/pay-sheet`),
  `ContributionHistoryReport` (`/contribution-history`) — both on the shared
  `RangeFilters` + `rangeHelpers` — and `contribution/ContributionHistoryModal`
  (Contributions → History row action); `payrollReportApi`,
  `thirteenthMonthApi`, `myPayslipApi`. Menu: Payroll → Payroll Reports (Pay Sheet, Contribution History), Government Compliance (Remittances, Year-end Tax), Special Pay (13th Month Pay, Final Pay).

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

## Pay rules (PayrollRunService)

- Monthly-paid: monthly ÷ the month's cut-offs (a salary change inside the
  cut-off prorated by days), less absences / unpaid leave / late /
  undertime at daily = monthly × 12 ÷ factor, hourly = daily ÷ hours per
  day; a worked holiday adds (holiday rate − 100%).
- Daily-paid: hours worked × hourly (holiday worked × its regular rate),
  paid leave × daily, unworked holiday × its "paid if unworked" rate.
- Overtime counted (DtrService::payableOvertime, Payroll Settings →
  Overtime): a filing under `ot_minimum_minutes` (default 30) = 0, the rest
  rounded down to `ot_rounding_minutes` blocks (default 15); a DTR remark
  shows filed vs. counted. Pre-shift overtime counts when approved.
- Overtime: scheduled day → the day type's overtime rate; day off → first
  `hours_per_day` at its regular rate, beyond at its overtime rate. Night
  differential = night minutes × hourly × the hour's rate × night %.
- Allowances prorated by days covered (per cut-off / per week × 52 ÷ 12 ÷
  cut-offs / per month ÷ cut-offs / per day worked); de minimis non-taxable
  (monthly excess over the limit taxable; a weekly one by its × 52 ÷ 12). Open payroll adjustments of the cut-off (Deduction ones negative,
  code `adjustment_<id>`, ids kept in `summary.adjustment_ids`), labelled
  with the type or, for an Other Adjustment, what it is for (+ the
  allowance, or the Others text); taxable per the adjustment's `taxable`
  (salary types always; Other: from `EmployeePayrollAdjustment::OTHER_TYPES`,
  the allowance type — taxable and not de minimis — or the form's switch).
- Contributions: ContributionService::compute on the month base (monthly
  rate; daily-paid: the month's basic earnings, later cut-offs projected),
  taken per settings (Every cut-off ÷ count, or all on the 1st / last).
  Tax: taxOn() monthly — every cut-off: (taxable × count − mandatory EE) ÷
  count; 2nd cut-off: the month's taxable less tax already withheld.
- Scheduled deductions due (DeductionService::dueOn skips a cut-off already
  paid; a One-time one is its whole total, from its start cut-off until taken;
  labelled "<type> — <description>" when the deduction has one) only while the net stays ≥ 0, else a warning. Lines rounded once.
- Run: per cut-off, for **all companies** (`company_id` null) or **one
  company** — one generation, one approval each; a cut-off has one
  All-companies run or runs per company, never both (`generate` 422s; the
  Generate modal's Company select shows it and disables Generate). Employees
  = active with a salary saved by the cut-off's end, of the company (their
  branch's), not already in another run of the cut-off; settings + rates
  copied onto it. Each payslip keeps `company_id` (its employer: payslip
  header, reports — `PayrollReportService::employer($companyId)`,
  `Company::employerDetails()`). Month order (submit / approve after the
  earlier cut-off, generate / roll back before the later one) and the 13th
  month guard only look at runs whose scope overlaps (same company or all
  companies). A return reopens filing only when no other run of the cut-off
  is Pending / Approved. `payroll_run/options` → cut-offs with `runs [{ id,
  company_id, status }]` + `companies`; `cutoff_candidates/{id} { company_id }`.

## Approval ("Payroll Run" Access Chart)

Draft → Submit for Approval (payroll-run-generate; turns the cut-off's filing
OFF — "Payroll X submitted for approval" — so nothing is filed, edited or
approved inside it while it waits) → Pending → the chart's
levels (local: level 1, 2 approvals, Lady Rose Lutrania + Marilou Baltazar,
role "Payroll Approver" = payroll-run-list + -approve) → Approved on the last
approval: Payroll payments posted (pay date), payroll adjustments Applied, filing OFF.
Disapprove (remarks required) → back to Draft with "Returned by …", filing ON
again when the submit had turned it off (not when Payroll had). An approved
leave / time entry / overtime inside a Pending or approved payslip can't be
cancelled (`PayrollRunService::assertNotLocked`; rows carry `pending_in` /
`paid_in`, `PaidTag`) — by anyone, Administrator included. Before that,
who cancels is `FilingAccess`: `*-cancel` (HR) any filing; `*-cancel-own`
their own or one they filed (`filed_by`), Pending or Approved. A scheduled deduction
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
correct it with a payroll adjustment on the next cut-off, or roll it back.
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
  - Refused when Payroll Settings (pay fields only — not `employer_*`), the
    assigned settings in effect, or the
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
- **Add employees / approval rounds** (payroll runs and 13th month alike):
  - Refused (and the button hidden / Generate disabled) on or after the pay
    date (13th month: its pay date, else Dec 24) — paid; a missed employee
    is paid with a payroll adjustment on a later cut-off.
  - Generate on an approved cut-off / year takes only employees not in it.
    It works through Selected employees only (All is refused) or the
    record's Add Employees button (`RegenerateEmployeesModal` mode `add`).
  - The added are computed now and the record goes back to Draft (approval
    fields cleared). Submit → the final approval posts only the unposted
    lines as the next round:
    - `payroll_run_employees.round` / `thirteenth_month_pays.round`.
    - `rounds` JSON on the run / batch, one entry per round: submitted /
      approved by / at, the paid-from account(s) kept for that round, and
      the 13th month's earned_through.
    - Migration `2026_10_18_110000` backfills approved lines as round 1.
  - Approved lines are never touched: same amounts, posted_at and round. No
    deduction payment is posted twice (finalize posts unposted rows only).
  - Submit is refused when nothing unposted is left.
  - `payroll_run/remove/{id}` and `thirteenth_month/remove/{id}`
    (`employee_ids`, -generate) take unposted lines out of a Draft. Only
    approved lines left → Approved again as the last round left it.
  - `show` returns `rounds` (live employees / totals per round + submitter
    / approver names) and `not_approved`; each line has `round`.
  - Pages:
    - An Approval Rounds panel when there is more than one round or
      additions are pending.
    - A round filter; the Register and Bank File follow it (`round`
      param). A round's CSV works while the record is Draft, using the
      account(s) that round kept (`BankAccountService::roundPaidFrom`).
    - Tags: "Approved · R1" / "R2" / "Added".
  - Guards:
    - Pay settings / premium rates changed since approval → adding refused.
    - A later cut-off in the same month approved or with posted payslips →
      refused (`laterLockedInMonth`).
    - An employee whose 13th month (posted, or Pending) already counts the
      cut-off (earned_through ≥ its end) can't be computed for it
      (`assertThirteenthOpen`).
    - 13th month: a batch with approved lines keeps its pay date (the field
      is locked).
- **Roll back** (payroll-run-rollback, reason, `employee_ids` or none = all
  approved):
  - On an Approved run, or a Draft that still has approved payslips.
  - Removes those employees' `source = Payroll` deduction payments of the
    cut-off (`DeductionService::removePayrollPayments`: Fully Paid → Active),
    reopens their Applied payroll adjustments and unposts them. The run goes back to Draft
    (submit and approve again); the other payslips stay approved.
  - Clears the approval and submission fields and sets `rolled_back_by /
    _at`, `rollback_reason` (migration `2026_10_14_110000`); the page shows
    "Rolled back … by …" until it is submitted again.
  - Refused while a later cut-off's run is Approved / Pending / keeps
    approved payslips, while the year's 13th month counts this cut-off
    (earned_through ≥ its end) and is Pending or has approved employees, and on
    or after the cut-off's pay date (paid — corrected by a payroll adjustment
    on a later cut-off; the page then shows "Paid on …" and no Roll Back).
    Cancel is refused while approved payslips remain.
  - The cut-off's filing stays off: reopen it on Payroll Cut-offs if late
    filings are needed.
  - UI: approved rows show an "Approved" lock tag on a Draft; ticking them
    gives Roll Back Selected (n); Roll Back All (Approved run) / Roll Back All
    Approved (n) (Draft). Cancel Payroll is hidden while any are approved.

## Reports & compliance rules

- Every report reads **approved** runs only (register / bank preview also
  show a Draft); the bank CSV is approved-only.
- Employer share on payslips: Payroll Settings → General → Payslip
  (`payroll_settings.payslip_show_employer_share`, migration
  `2026_10_20_140000`, default **off**; not a pay setting — doesn't block a
  partial generate). Off: `PayrollReportService::forEmployee` strips the
  payslip's `employer` lines / `employer_share` from what employees get —
  `my_payslip/show`, every printed payslip (`payroll_report/payslips`,
  `my_payslip/payslips`) — and `employeePaySheet` drops the ER / EC columns
  (JSON and the Excel). Payroll staff still see it on the run's payslip
  (`payroll_run/employee` → `show_employer_share`; PayslipModal tags it "Not
  on the employee's payslip" and its Print leaves it out), the register and
  the reports.
- Employers: Payroll Settings → Employers (`payroll_setting/employers/update/
  {companyId}`, payroll-setting-edit; registered name blank = the company
  name; audit 'Employer (company)'). Remittances and Year-end Tax have a
  Company select (`reports/CompanySelect`, `payroll_report/companies` —
  payroll-report-view, no company-list needed; `usePayrollCompanies`):
  that employer's payslips only, cleared = all companies (employer fields
  null, a warning to choose one). The 2316 defaults to the company of the
  employee's latest approved payslip that year; a transferred employee gets
  one per company. Range reports' company filter = the payslip's company.
  Printed payslips use each payslip's `employer`.
- Bank file (`PayrollReportService::bankLines($amounts, $creditDate,
  $paidFrom)`): credits each employee's account **in force on the pay
  date** (`BankAccountService::inForce` — latest `effective_from` on or
  before it; Payroll → Bank Accounts, `/payroll-bank-accounts`,
  `bank-account-*`; banks on Payroll → Setup → Banks, `/banks`, `bank-*` — View employees (`bank/BankEmployeesModal`, bank-account-list) lists a bank's accounts in force today / upcoming / history via `bank_account/index { bank_id, state }`),
  **one file per company account it is paid from** (`groups`, CSV per
  `source_id`). No account = `missing` (cash / check); a zero or negative
  net = `not_positive` (not credited, shown in red). The bell's
  `no_bank_account` (info) counts active salaried employees without one
  (`?state=missing`).
- Paid from (`BankAccountService::paidFrom` / `sourceFor`): payroll
  accounts (`company_bank_accounts`, `payroll_setting/accounts/*`,
  payroll-setting-edit) belong to a company (`company_id`, migration
  `2026_10_20_120000` — managed on Payroll Settings → Employers, a company's
  row expands to them) or are general (null — the General tab's Payroll
  Accounts card, the fallback). An employee is paid from their payslip's
  company's accounts — only when the company has a default for the pay date
  (its Default, or a default period covering it); a company with no account,
  or accounts but no such default, uses the general ones entirely (match-by-
  bank included). Within one owner: default for the pay date = the account whose
  default period covers it (periods can't overlap within the owner), else
  its Default (one per owner). `match_employee_bank` (Settings, overridable
  per payout): an employee whose bank has an active account of the same
  owner is paid from it. Only a **one-company** payroll run / 13th month can
  choose its account (its company's or a general one) on the Bank File until
  approved (`can_choose_account`; `payroll_run/paid_from`,
  `thirteenth_month/paid_from` — the generate permission); an all-companies
  one pays each employee from their company's account. Both may change the
  rule. **Approval keeps the result in `paid_from`** (with `companies {
  company_id: { default, by_bank } }`), so later account edits never change
  an approved payout (one kept before company accounts has no `companies` —
  the general accounts for everyone). Bank file groups show the account's
  company; CSV names add it.
- What each line was paid with: on approval every payslip / 13th-month line
  saves `bank_credit` (migration `2026_10_20_130000`; `PayrollReportService::
  recordCredits` — { status credited | no_account | not_positive, amount,
  the employee account credited, source = the company account }); a
  rollback clears it. `runCredits` / `thirteenthCredits` = the saved ones,
  the rest worked out now (per round with its kept accounts);
  `creditSummary` sums them per paying account. Shown as **Paid from** on
  the payroll page and 13th-month view (`run/PaidFromSummary`; "preview —
  final on approval" until all saved), a Paid From column on the Approval
  Rounds panel and the Payroll Runs list (saved credits only), and Credited
  To / Paid From columns in the payroll register Excel.
- Remittances: per calendar month (and company), all approved cut-offs
  ending in it; BIR taxable = taxable pay − mandatory EE contributions.
- 13th month (PD 851): basic pay + paid leave − absences / late / undertime /
  unpaid leave + salary differentials, ÷ 12; Draft projects the rest of the
  year at the monthly rate (daily-paid: earned only); one batch per year;
  over ₱90,000 is taxable. A batch is for all companies or one company like
  payroll runs (one All batch a year or one per company; lines keep
  `company_id`; earned through = the company's last approved cut-off; the
  basic earned counts every payslip of the year). Generate (and the Draft's Regenerate, which
  opens the same modal) = All employees or Selected employees, like Payroll
  Runs: `employee_ids` recomputes only those (a new batch gets just them;
  on a Draft the others keep their lines; an inactive / unsalaried /
  zero-amount one leaves), refused when payrolls were approved since the
  Draft was made and other lines would keep the old "earned through";
  `thirteenth_month/candidates { year }` feeds the shared
  `run/EmployeePickerTable`. Approved lines are posted
  (`thirteenth_month_pays.posted_at`, migration `2026_10_18_100000`, which
  backfills approved batches): locked, never recomputed (selecting one is
  refused, All skips them), and what the year-end tax / final pay read
  (`ThirteenthMonthPay::approved()`). Roll Back Selected / All
  (`thirteenth_month/rollback/{id}`, `thirteenth-month-rollback`, reason,
  `employee_ids` or none = all) unposts them, the batch goes back to Draft
  (`rolled_back_by / _at / rollback_reason`, logged) and through approval
  again — only before `paid_on` (pay date, else Dec 24); cancel is refused
  while posted lines remain. Approval = the payroll run's: Submit
  (thirteenth-month-generate) → Pending on the "13th Month Pay" Access Chart
  (`PayrollReportService::thirteenthProcedure()`, non-hierarchical; seeder
  `ThirteenthMonthApprovalProcedureSeeder` copies the Payroll Run chart;
  vueportal `ApproverRoleSeeder` gives "Payroll Approver" to both charts'
  approvers) →
  the last approval releases it; Disapprove (remarks) → Draft; Pending can't
  be regenerated / cancelled; the submitter can't decide their own.
- Year-end tax: (taxable − contributions + 13th month over ₱90k) ÷ 12 on the
  BIR monthly table × 12 vs. withheld; minimum wage earners exempt.
- Range reports (`payroll_report/contribution_history`, `pay_sheet`,
  `payslips`): `{ date_from, date_to }` = approved payslips whose cut-off
  ENDS in it (≤ 1 year; the cut-off range sends the first cut-off's start and
  the last one's end), filtered by company (the payslip's own `company_id`),
  branch / position (the employee's **current** ones — a payslip keeps no
  branch) and `employee_ids`. Contribution History: per employee SSS EE / ER / EC,
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

Posting final pay (marking loans paid); the payroll
bank's own upload format (generic CSV now); official BIR form layouts.