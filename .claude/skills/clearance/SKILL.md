---
name: clearance
description: Offboarding clearance module — departments sign off a separating employee (checklist, accountabilities, assets still assigned), final approval on the "Clearance" Access Chart, Deduct from Final Pay lines, bell items, print form, Clearance Setup. Use for any task that changes the Clearances pages, the clearance API (vueportal ClearanceService), or how clearance feeds Final Pay.
---

# Clearance (offboarding)

Backend: vueportal `EmployeeClearanceController` + `ClearanceService`,
`ClearanceMaintenance` (`clearance.maintenance`), prefix `clearance`, POST
only. API contract: header of `src/services/clearance/clearanceApi.js`.

## Flow (the company's process)

Statuses (stored → shown): `Draft` HR Verification → `In Progress`
Department Sign-off → `HR Review` → `Payroll Clearance` → `Pending` Final
Approval → `Cleared`; or `Cancelled`. `EmployeeClearance::STAGES` / `OPEN`;
`ClearanceService::stageLabel()`; React `statusLabel()` and
`ClearanceStageSteps` (the step tracker with who / when per checkpoint).

1. **Start** (`clearance-create`) → **Draft**. Pick a recent separation (an
   `employee_offboardings` row, last day within `CANDIDATE_DAYS` 120, no
   clearance) or "Not listed" → any employee. Number `CLR-<year>-<5
   digits>` (MAX under lock). One open clearance per employee, one
   non-cancelled per offboarding. Every active department gets a sign-off
   with its checklist copied (see Clearance Setup). Clear By defaults to
   the last day; separation type Other needs Specify.
2. **HR Verification** (`clearance-verify`): mark departments that don't
   apply **N/A** (`item/applicable`, status `Not Applicable`, skipped from
   then on) and assign an **in-charge** per department where needed
   (`item/assign`); **Submit to Departments** (`stage/submit`) is refused
   while every department is N/A or any applicable one has nobody able to
   sign. Stamps `hr_checked_by/at`.
3. **Department Sign-off** (`In Progress`), any order: checklist (Done /
   N/A / Charged), accountabilities, assets still assigned (see below).
   HR may reassign a still-pending department's in-charge. When every
   applicable department has signed → **HR Review**.
4. **HR Review** (`clearance-verify`): **Verify** (`stage/hr_verify`, stamps
   `hr_verified_by/at`) → Payroll Clearance; or **Return to Departments**
   (`stage/hr_return`, reason + the signed departments to redo) → back to
   Department Sign-off with those reopened.
5. **Payroll Clearance** (`clearance-payroll`; a sign-off, no computation):
   **Clear** (`stage/payroll_clear`, stamps `payroll_cleared_by/at`) →
   final approval, or Cleared at once with no chart; or **Return to HR**
   (`stage/payroll_return`, reason) → HR Review (HR verification reset).
6. **Final Approval** (`Pending`) on the **"Clearance" Access Chart**
   (`ApprovalProcedure`, module `Employee Clearance`, non-hierarchical —
   e.g. level 1 Lady, level 2 Malou): Approve → next level / **Cleared**;
   **Return to HR** (`act('return')`, reason, no departments) → HR Review
   with HR + Payroll checkpoints reset.
7. `Cancelled` (`clearance-cancel`, reason) at any open stage. **Revert**
   (Administrator, `item/revert`): one signed department back to Pending at
   any stage incl. Cleared → Department Sign-off (checkpoints and
   `cleared_at` reset; it goes through HR Review, Payroll and approval
   again). HR **Reopen** (`clearance-manage`) likewise while open.
   Every step is logged on the approval history (Submitted to Departments,
   HR Verified, Returned by HR / Payroll, Payroll Cleared, Disapproved,
   Approved, Reverted…). A new approval round never starts in the same
   second as the last logged step (`toFinalApproval` waits it out —
   `ApprovalProcedure` reads a round's logs by `created_at >= submitted_at`,
   to the second).

## Who signs a department

- **Immediate Head** department (`is_immediate_head`): active users whose
  position is directly above the employee's (`position_subs.position_sub_id =
  employee.position_id`) **in the employee's own branch** (e.g. the branch
  manager); only when that branch has none, the head-office
  (`ADMINISTRATION`) ones. Not the employee themself. Without this rule a
  branch employee got ~10 head-office "heads" from `position_subs`.
  `signatoryClearanceIds` (visibility, bell) reuses `immediateHeadIds`.
- Other departments: `clearance_department_signatories` (user, branch or
  every branch).
- **In-charge** (`employee_clearance_items.assigned_to`, set by HR during
  HR Verification or on a pending department at sign-off): replaces both
  of the above for that department on that clearance
  (`itemSignerIds()`); visibility / bell / To Sign follow it.
- Signing also needs `clearance-sign`. `clearance-manage` (HR) signs any
  department and reopens a cleared one (In Progress / Pending → back to In
  Progress). Nobody signs their own clearance (Administrator excepted).

## Final Pay

`PayrollReportService::finalPay` adds `ClearanceService::forFinalPay()`:
the latest non-cancelled clearance's `Deduct from Final Pay`
accountabilities as deduction lines `Clearance: <description>` (category
`Clearance`), a warning while it isn't Cleared (or none started), and
`clearance { id, clearance_no, status }` — the Final Pay page shows it as a
Clearance tag linking to the clearance. Final pay still posts nothing.

## Visibility

`clearance-list-all` / Administrator: all. Others: started by them, their
own (linked account), any with a department they sign
(`signatoryClearanceIds`), and Pending at / decided at their approval level.
List page permission: `clearance-list`, `-list-all` or `-sign`.

## Bell (`NotificationService::offboarding`, group `Offboarding`)

- `clearance_to_verify` (warning, `clearance-verify`): HR Verification +
  HR Review → `?scope=to_verify`; `clearance_payroll` (warning,
  `clearance-payroll`): Payroll Clearance → `?scope=payroll` (never the
  user's own).

- `clearance_to_sign` (warning, `clearance-sign`; not counted for
  Administrator / as HR): open clearances whose sign-off waits for the user
  → `/clearances?scope=to_sign`.
- `clearance_overdue` (warning, `clearance-list-all`) → `?scope=overdue`.
- `clearance_to_start` (info, `clearance-create`): candidates count (capped
  at the candidates list's 50) → `?new=1` opens Start Clearance.
- `clearance_approval` (For approval, `clearance-approve`): `forApprovalIds`
  (approval panel `can_approve`) → `?scope=for_approval`.

## Clearance Setup (record management)

`/clearances/setup`, `clearance-setup`, three tabs. **Order is by drag**
(the shared `src/components/SortableTable.jsx` — handle column, on
`@hello-pangea/dnd` like the KPI template items): dropping saves at once
(`setup/reorder { type, ids }` → sort_order 10, 20, 30…); no Order column /
field; a new department, category or item goes last (an item moved to
another department / category goes last there); editing keeps the order.
Items reorder only within their own department + category (a drop into
another group is refused with a warning; dragging is off while searching):
- **Departments** — signatories / Immediate Head, asset list, order, active;
  shows its active item count. Refused delete once used or holding items.
- **Checklist Items** (`clearance_items`) — name (unique per department),
  department, category, standard charge (optional), required, order,
  active. Delete refused once charged on a clearance (deactivate); a
  clearance keeps its own copy of the checklist, so edits / deletes never
  change clearances already started.
- **Categories** (`clearance_item_categories`) — name (unique), order,
  active (inactive: its items are left off new clearances); delete refused
  while it holds items.

Seeders: **`ClearanceModuleSeeder`** (required) adds the `Employee
Clearance` access module so Approvals → Access Charts can pick it for the
"Clearance" chart before any clearance is approved. **`ClearanceSetupSeeder`**
(start-up defaults) adds the six departments, five categories (Work
Turnover, Equipment & Property, Accounts & Access, Financial, Documents) and
20 items (11 required), no standard charges; only adds what's missing by
name, never overwrites HR's edits, and moves items out of the migration's
catch-all "General" category (then deletes it when empty).

## Files

```
src/services/clearance/clearanceApi.js
src/pages/clearance/
  ClearanceIndex.jsx        /clearances — To Sign / For My Approval / Past Due / All (?scope=)
  ClearanceFormModal.jsx    start (separation picker / any employee) or edit header
  ClearanceView.jsx         /clearances/:id — header, progress, totals, sign-off cards, approval
  ClearanceItemCard.jsx     one department: checklist, assets, accountabilities, Save / Sign Off / Reopen
  AccountabilityModal.jsx   add / edit (an asset prefills tag + book value)
  ClearancePrint.jsx/.css   /clearances/:id/print — form with a signature column per department and,
                            pinned to the page bottom (flex column, min-height 100vh in print), the
                            employee's Conforme and HR's Approved by (the latest round's final
                            approvers — after the last Reverted / Disapproved — else a blank line)
  clearanceHelpers.js       status colours, statusLabel ('Pending' → For Final Approval), isOverdue
  setup/ClearanceSetup.jsx  /clearances/setup — Tabs; loads setup options
  setup/ClearanceDepartmentsTab.jsx, ClearanceDepartmentModal.jsx
  setup/ClearanceItemsTab.jsx, ClearanceItemModal.jsx
  setup/ClearanceCategoriesTab.jsx (form inline)
```

Menu: Human Resource → Clearance (Process: Clearances; Setup: Clearance Setup).

Backend tables (`database/migrations/new/2026_10_25_1000{00..10}_*`, run by
file path; `100007` moves any old department checklist lines into items
under "General" and drops `clearance_departments.checklist`):
`clearance_departments` (name, sort_order, is_immediate_head,
asset_source 'Company Assets' | 'IT Assets', active), `clearance_item_categories`,
`clearance_items`,
`clearance_department_signatories`, `employee_clearances`,
`employee_clearance_items` (department_name snapshot, checklist JSON),
`employee_clearance_accountabilities` (status Unsettled / Returned / Paid /
Deduct from Final Pay / Waived, asset_type + asset_id, clearance_item_id). Clearance, sign-off
and accountability changes are audited (log `Clearance`).
Seeders: see Clearance Setup above.

## Permissions

`clearance-list`, `-list-all`, `-create`, `-edit`, `-cancel`, `-sign`,
`-manage`, `-approve`, `-setup`, **`-verify`** (HR checkpoints; sees all),
**`-payroll`** (Payroll Clearance; sees all) (PermissionSeeder). Role grants are not
seeded. Final approvers on the Access Chart also need `clearance-approve`.

## Rules / traps

- Asset lists read `company_assets` (Company Asset module, vueportal) and
  `it_assets` only when the table exists (`Schema::hasTable`) — a missing
  table lists nothing rather than failing.
- The setup's checklist edits apply to clearances started afterwards; the
  signatories are read live.
- A department used by any clearance can't be deleted (deactivate it).
- A re-submission after a Return sets `submitted_at` after the last
  approval log, or a Return logged the same second would count as the new
  round's decision ("already acted").
- The accountabilities `employee_clearance_item_id` index has a short
  explicit name (the default exceeds MySQL's 64 characters).
- `ClearanceItemCard` keeps unsaved checklist / remarks edits in local
  state; `ClearanceView` remounts a card only when its own server state
  changed (`itemKey`), so saving one department doesn't wipe another's edits.

## Verification

End-to-end HTTP flow (85 checks, React payloads: setup, start, branch-scoped
signatories, visibility / 401s, checklist / accountability / asset blocks,
reopen, return, two-level approval, Final Pay lines and warning, cancel,
numbering, filters) and a headless-Edge pass (To Sign list, sign-off and
asset refusal, Add as accountability modal, Setup, Start Clearance via
`?new=1`, print PDF, Final Pay tag); after the items / categories setup:
120 HTTP checks (category / item CRUD and guards, checklist built from
items, required vs N/A, Charge / un-charge / re-charge, the "Clearance"
chart created through Access Charts with the seeded module, Final Pay
lines), both seeders on an empty setup (rolled back) and a browser pass
(Setup tabs, grouped checklist, Charge) — run 2026-10-19; fixtures were
`CLRTEST`-named users / roles / chart and removed afterwards.
