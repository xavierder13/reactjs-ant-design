---
name: payroll-cutoff
description: Payroll cut-off periods (record management) and the filing switch that turns leave / manual time entry filing off for dates inside a period while payroll processes it. Use for src/pages/payroll_cutoff/ or the /payroll_cutoff endpoints, or when another filing (overtime, shifting) should respect cut-offs.
---

# Payroll Cut-offs

User rule (2026-10-09): a switch-like **function** (not the Switch
component) turns filing on / off for a cut-off period; the cut-offs are
their own record management, for payroll.

## Files

- vueportal: `PayrollCutoff`, `PayrollCutoffFilingLog`,
  `Services/PayrollCutoffService.php`, `PayrollCutoffController`,
  `PayrollCutoffMaintenance` (`payroll_cutoff.maintenance`, Administrator
  bypass), migration `2026_10_09_120000_create_payroll_cutoffs_table`.
- React: `src/pages/payroll_cutoff/PayrollCutoffIndex.jsx` (`/payroll-cutoffs`,
  Time & Leave → Setup → Payroll Cut-offs), `payrollCutoffApi.js` (contract
  in its header).

## Rules

- Periods: code (unique, upper-cased), date_from–date_to (no overlaps),
  optional pay date (≥ end), remarks. "Generate Year": semi-monthly (1–15,
  16–end; codes YYYY-MM-A/B) or monthly (YYYY-MM), pay date = end + N days;
  existing / overlapping periods are skipped.
- **The switch** (`filing_open`): `PayrollCutoffService::setFiling` — OFF
  needs a reason; every change logged (`payroll_cutoff_filing_logs`: on/off,
  reason, who, when; "Filing history"). While OFF, the period's dates can't
  change and it can't be deleted.
- While OFF, `assertFilingOpen($from, $to)` blocks — for any date inside —
  leave (`LeaveService::check`) and manual time entries
  (`TimeEntryService::check`): filing, editing **and approving** (approve
  re-runs check). Disapprove / cancel still work. The form previews show the
  message and keep Save off. New filings (overtime, …) should call it too.

## Permissions

`payroll-cutoff-list`, `-create` (incl. generate), `-edit`, `-delete`,
`-filing-toggle` (the switch).
