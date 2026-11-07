---
name: payroll-run
description: Payroll processing — configurable cut-offs (Payroll Settings → Generate Year), Timekeeping (the DTR per cut-off: schedule, punches, time entries, leave, overtime, holidays), Payroll Runs (Draft → Approved / Cancelled, payslips), and the outputs — My Payslips, register / bank file, remittances, 13th month, year-end tax (2316 / alphalist), final pay. Use for src/pages/payroll/run/, timekeeping/, reports/, my_payslips/, the dtr / payroll_run / payroll_report / thirteenth_month / my_payslip endpoints, or any pay rule (holiday, overtime, night differential, absences).
---

# Payroll Processing

User rules (2026-10-09): payroll follows the real-world PH process; a
holiday not worked (or on leave) is never deducted; overtime on a holiday
has its own % (the premium rates' overtime column per day type).

## Area files — read the one for the area you're changing

Sections in this file apply to every change in this module. Area-specific
rules live beside it; **read the matching file before touching that area**
(they are rules, not optional background).

| Touching | Read |
|---|---|
| finding a file | `areas/file-map.md` |
| attendance log import, Assigned Settings (Payroll Settings) | `areas/attendance-and-assigned-settings.md` |
| Generate Selected, roll back, partial regenerate, paid lock | `areas/generate-and-rollback.md` |
| Reports & Compliance: remittances, pay sheet, payslips, 13th month, year-end tax, final pay, alphalist, BIR | `areas/reports-and-compliance.md` |

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
  The punches between them are the breaks (as the Attendance tab reads
  them): break out = the last OUT, break in = the first IN among them
  (`break_out` / `break_in` on the day). Over-break (Payroll Settings
  `over_break_late`, default on, migration `2026_10_22_110000`): a paired
  break — break in after break out — longer than the shift's break adds to
  the day's late (`over_break_minutes`; payslip "09/15 6 min (over-break
  6)"); no pair, no over-break. A hand-typed Work Schedule (no shift) has
  break 0, so any paired break there is over-break — give the employee a
  Work Schedule with a shift. Late make-up (the shift's
  `makeup_work_minutes`): when last out − first in − the break taken reaches
  it, the day's late and over-break are 0 (remark "Late made up: worked
  8:00 …"); else they count as above. Flexible hours (the shift's
  `flexible`, the day's `work_minutes`): no late or over-break; worked =
  last out − first in − the break taken (punched pair, else the shift's
  break once half the day is worked); short of the required work =
  undertime (at most the paid day, which is the required work capped at
  `hours_per_day`); remark "Flexible: worked 7:00 of 8:00". The punch window
  of a flexible day is 04:00 to the next day's start, so a time out after
  04:00 the next day isn't matched (overnight flexible work — a known limit).
- Paid day = scheduled span − break, at most `hours_per_day` (hand-typed
  schedules have no break). Late (past grace, counted from the start),
  undertime, Absent (no punch, no leave), half-day leave 0.5 (a leave day
  without credit is split paid / unpaid — `unpaid_days`, the last days of the
  leave — and the unpaid part is deducted like an absence), Incomplete
  (one punch — flagged, not deducted), No Schedule (flagged).
- Holiday (not a Special Working Day) not worked = Holiday, never Absent,
  leave not used; worked = minutes worked, no late / undertime. Prior-day
  rule for unworked regular holiday pay = `holiday_pay_needs_prior_day`: the
  last scheduled work day before it (an unpaid holiday passes the absence on,
  so successive holidays are paid only if the first is; before the period's
  first work day it looks back up to 14 days into the previous cut-off).
- Rest day: punches alone pay nothing — rest-day work is paid through
  approved overtime.
- Today or later without punches = Upcoming (assumed worked, not deducted);
  a full-day approved leave is On Leave already (a half-day one stays Upcoming).
- Night minutes capped at worked minutes (break excluded).

## Pay rules (PayrollRunService)

- Monthly-paid: monthly ÷ the month's cut-offs (a salary change inside the
  cut-off prorated by days), less absences / unpaid leave / late /
  undertime at daily = monthly × 12 ÷ factor, hourly = daily ÷ hours per
  day; a worked holiday adds (holiday rate − 100%).
- Daily-paid: hours worked × hourly (holiday worked × its regular rate),
  paid leave × daily, unworked holiday × its "paid if unworked" rate.
- Overtime counted (DtrService::payableOvertime, Payroll Settings →
  Overtime): a filing under `ot_minimum_minutes` (default 30) = 0, the rest
  rounded down to `ot_rounding_minutes` blocks (default 15), the dropped
  minutes taken off the end (night minutes count only on the rest); a DTR
  remark shows filed vs. counted. Pre-shift overtime counts when approved.
- Overtime: scheduled day → the day type's overtime rate; day off → first
  `hours_per_day` at its regular rate, beyond at its overtime rate. Night
  differential = night minutes × hourly × the hour's rate × night %.
- Allowances prorated by days covered (per cut-off / per week × 52 ÷ 12 ÷
  cut-offs / per month ÷ cut-offs / per day worked), labelled "<type> —
  <description>" for a Needs Description type (Other Allowance, the form's
  "Specify"); de minimis non-taxable
  (monthly excess over the limit taxable; a weekly one by its × 52 ÷ 12). Open payroll adjustments of the cut-off (Deduction ones negative,
  code `adjustment_<id>`, ids kept in `summary.adjustment_ids`), labelled
  with the type or, for an Other Adjustment, what it is for (+ the
  allowance, or the Others text); taxable per the adjustment's `taxable`
  (salary types always; Other: from `EmployeePayrollAdjustment::OTHER_TYPES`,
  the allowance type — taxable and not de minimis — or the form's switch).
- Contributions: ContributionService::compute on the month base (monthly
  rate; daily-paid: the month's basic earnings, later cut-offs projected),
  taken per settings (Every cut-off: the earlier cut-offs take the rounded
  share, the last one the rest — `partAmount`, so the month adds up to the
  centavo — or all on the 1st / last). Centavos per deduction (Payroll
  Settings `sss_ / philhealth_ / pagibig_ / tax_centavos`,
  `PayrollSetting::CENTAVO_RULES`, migration `2026_10_22_100000`;
  `ContributionService::shares()`): `Round` = each share rounded; `Cut` = EE
  cut to the centavo, ER = the exact premium − EE (333.4855 → EE 333.48, ER
  333.49), tax cut to the centavo; withholding tax also takes `Peso`
  (`PayrollSetting::TAX_CENTAVO_RULES`, `ContributionService::taxLine`):
  rounded to the whole peso, half up (919.53 → 920.00 — the old payroll's
  tax), for every tax table (semi-monthly, monthly, annual). Defaults:
  PhilHealth Cut (the old payroll's), the others Round. SSS table amounts
  are whole centavos, so its
  rule only matters if a future table has fractions.
  Tax base = taxable earnings − mandatory EE shares (SSS, PhilHealth,
  Pag-IBIG; not the voluntary Pag-IBIG, never loans) — not net pay. Three
  BIR tables (`ContributionTable::TAX_TABLES`, agencies `BIR Semi-monthly`,
  `BIR` = monthly, `BIR Annual`; `taxOn(id, taxable, date, period)`; a
  Fixed profile amount is monthly: ÷ 2 / × 12). Every cut-off with
  semi-monthly cut-offs: the semi-monthly table on that cut-off's own taxable
  pay less the EE shares deducted on it; every cut-off with monthly
  cut-offs: the monthly table; 1st / 2nd cut-off: the monthly table on the
  month's taxable (2nd: less tax already withheld). A missing table for the
  date is a payslip warning, never a fallback.
- Scheduled deductions due (DeductionService::dueOn: skipped on a cut-off a
  payroll already posted it for; manual (cash) payments tagged to the cut-off
  count toward its amount — covering it, not due; less, only the rest is
  deducted, with a payslip warning and "Scheduled … − … paid in cash" in the
  line's detail (the Record Payment form says which before saving); a
  One-time one is its whole total, from its start cut-off until taken;
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

## Not built yet

Posting final pay (marking loans paid); the payroll
bank's own upload format (generic CSV now); official BIR form layouts.
