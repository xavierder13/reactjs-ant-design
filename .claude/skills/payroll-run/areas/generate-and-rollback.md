# Payroll processing — generate selected / roll back

Part of the `payroll-run` skill; read `SKILL.md` first (cross-cutting rules).

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
    approved payslips, or while the year's 13th month counts this cut-off
    (earned_through ≥ its end) and is Pending or has approved employees
    (`assertUndoable`). On or after the cut-off's pay date (paid — corrected
    by a payroll adjustment on a later cut-off; the page then shows "Paid on
    …" and no Roll Back / Add Employees) only with `payroll-run-rollback-paid`
    (Administrator): it can then roll back, regenerate and add employees; the
    audit entry notes "after the pay date".
    Cancel is refused while approved payslips remain.
- **Delete Payroll** (`payroll-run-delete`, Administrator; `payroll_run/delete/{id}`,
  reason): any status and period. Approved payslips are undone first like a
  rollback (`unpost`: deduction payments removed, adjustments Open again) —
  refused by `assertUndoable` like a rollback, never for the pay date — then
  the run, its payslips and its "Payroll Run" `ApprovedLog` rows are
  deleted. The run's 'deleted' audit entry also carries `deleted payroll`
  (code), `reason`, `payslips deleted` and `undone` (`auditRelation`). The
  cut-off and its filing switch stay as they are; the page goes back to the list.
  - The cut-off's filing stays off: reopen it on Payroll Cut-offs if late
    filings are needed.
  - UI: approved rows show an "Approved" lock tag on a Draft; ticking them
    gives Roll Back Selected (n); Roll Back All (Approved run) / Roll Back All
    Approved (n) (Draft). Cancel Payroll is hidden while any are approved.
