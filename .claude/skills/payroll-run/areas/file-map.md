# Payroll processing — files

Part of the `payroll-run` skill; read `SKILL.md` first (cross-cutting rules).

## Files

- vueportal: `Services/DtrService.php`, `Services/PayrollRunService.php`,
  `PayrollRun`, `PayrollRunEmployee`; `DtrController`, `PayrollRunController`;
  `DtrMaintenance` (`dtr-list`), `PayrollRunMaintenance`
  (`payroll-run-list/-generate/-approve/-cancel/-rollback`, and the
  Administrator-only `-delete` / `-rollback-paid`), Administrator bypass;
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
  DTR per cut-off or for a date range of up to 93 days — `{ date_from,
  date_to }`, `cutoff` null, `period` set — no permission),
  `timekeeping/DtrSummary` (the DTR banner, shared with `DtrModal`; Period
  instead of Cut-off for a range). Each DTR time in / out carries its source —
  `biometric` (Bio), `imported` (Attendance Logs import) or `time entry`
  (Manual) — shown as a tag in `DtrDaysTable`,
  `reports/RemittanceReport` (`/remittances`), `ThirteenthMonthIndex`
  (`/thirteenth-month`), `YearEndTaxReport` (`/year-end-tax`),
  `FinalPayReport` (`/final-pay`), `PaySheetReport` (`/pay-sheet`),
  `ContributionHistoryReport` (`/contribution-history`) — both on the shared
  `RangeFilters` + `rangeHelpers` — and `contribution/ContributionHistoryModal`
  (Contributions → History row action); `payrollReportApi`,
  `thirteenthMonthApi`, `myPayslipApi`. Menu: Payroll → Payroll Reports (Pay Sheet, Contribution History), Government Compliance (Remittances, Year-end Tax), Special Pay (13th Month Pay, Final Pay).
