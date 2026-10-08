---
name: leave-management
description: Leave Management (Time & Leave menu) — leave types and rules, leave applications (HR files, HR approves), balances and per-employee credits, how leave days are counted from the Work Schedule and Holiday Calendar. Covers the vueportal LeaveTypeController / EmployeeLeaveController / LeaveService contract. Use for any work under src/pages/leave/ or the /leave_type, /leave endpoints.
---

# Leave Management

HR files leave for an employee (no employee self-filing yet — few users
are linked to an employee); approval follows the **"Leave Application"
Access Chart**, the Manpower Request way. Contracts are in
`src/services/leave/leaveApi.js` and `leaveTypeApi.js` headers.

## Approval procedure (like MRF)

- `vueportal/app/Services/ApprovalProcedure.php` — the MRF rules made
  reusable (for overtime / manual time-in-out next): levels, required
  approvals per level and approvers per level from the Access Chart named
  `LeaveService::CHART_NAME`, maintained on vueportal's Access Chart screen
  (no React page); logs in `approved_logs` under the `Leave Application`
  module. `LeaveApprovalProcedureSeeder` creates the module, the chart and a
  `Leave Approver` role (leave-list, leave-approve, leave-balance-list) —
  approvers need it.
- **Level 1 is hierarchical**: an approver covers employees whose position
  is below their user `position_id` in `position_subs`, walked through
  positions held by other level-1 approvers (MRF `subordinatePositionIds`).
  An approver whose user branch isn't ADMINISTRATION only covers their own
  branch. Higher levels: every mapped approver.
- A level completes at its required approvals (an Administrator's one
  completes it); levels run in order; one action per approver per filing;
  nobody approves their own leave (users.employee_id). Approve re-checks
  every leave rule; Disapprove (remarks required) ends it at any level.
- Filing = submitting: Pending at the first level (`current_level`,
  `submitted_at`). No levels set up → `current_level` null and anyone with
  `leave-approve` decides in one step. Editing is refused once an approver
  has acted. Nobody covering an employee at level 1 strands the leave there
  (Administrator can approve) — the form warns.
- **Visibility** (`LeaveService::scopeVisible`, enforced on index / show /
  update / act — hidden = 404): `leave-list-all` (HR) sees all; others see
  what they filed, their own leave, leaves pending at their level (level 1:
  employees they cover) and leaves they acted on. `scope=for_approval` =
  waiting for this user's decision now.
- **Leave Balances** (`/leave/balances`): `leave-balance-list-all` = any
  employee (employee search); `leave-balance-list` = subordinates — the
  same coverage as level-1 approval (positions below the user's in
  `position_subs`, walked through level-1 approvers; own branch outside
  ADMINISTRATION) — picked from `/leave/balance_scope`; anyone: themself.
  Other employees → 403. The year's applications section needs
  `leave-list`. The File Leave preview gets the balance from `compute`, so
  filers need no balance permission.
- React: Leave Applications opens on **For My Approval**; the View dialog
  (`/leave/show/{id}`) shows the levels (Steps), who acted / who can act,
  and Approve / Disapprove only when `approval.can_approve`.

## Files

- `src/pages/leave/` — `LeaveApplicationIndex.jsx` (`/leave`),
  `LeaveFormModal.jsx` (file / edit with live preview),
  `LeaveDetailsModal.jsx` (view + Approve / Disapprove / Cancel),
  `LeaveBalances.jsx` (`/leave/balances`), `LeaveCreditModal.jsx`,
  `leaveHelpers.js`; `types/LeaveTypeIndex.jsx` + `LeaveTypeFormModal.jsx`
  (`/leave/types`). Store `leaveTypeStore` + `useLeaveTypes`.
- Menu Human Resource → **Time & Leave**: group Leave (Applications,
  Balances), group Setup (Leave Types, Holiday Calendar).
- vueportal: `LeaveType`, `EmployeeLeave`, `EmployeeLeaveCredit`,
  `Services/LeaveService.php`, `LeaveTypeController`,
  `EmployeeLeaveController`, `LeaveMaintenance` (`leave.maintenance`,
  Administrator bypass), migrations `2026_10_08_110000/110100/110200`,
  `LeaveTypeSeeder` (additive, by code).

## Rules (LeaveService — the backend is authoritative)

- **Days counted**: each date in the range, skipping the employee's day off
  under the schedule in force that day (`ScheduleService` — an active
  temporary shifting, else the Work Schedule rest day; see the
  shift-management skill) and active, non-Special-Working Holiday Calendar
  holidays observed by the employee's branch — unless the type
  `counts_calendar_days` (maternity). No schedule → no day skipped (the form
  warns). Half day (AM/PM) only on a one-day leave = 0.5.
- **Eligibility** (`ineligibility()`): type active, gender, employment
  types (comma list), `min_service_months` from `date_employed`.
- **Balance** per type and year (year of `date_from`): credits = the
  employee's `employee_leave_credits` row, else the type's
  `yearly_credits` (null = no yearly balance, nothing checked); used =
  Approved days, pending = Pending days (reserved); balance = credits −
  used − pending.
- **Save checks** (`check()`): active employee, no overlap with the
  employee's Pending/Approved leave, not all rest days/holidays, within
  `max_days_per_filing`, enough balance, not crossing a year. Approve
  re-runs them. Rule failures → 422 `{ message }`; field errors → 422 bag.
- **Status flow**: Pending (at a level) → … → Approved / Disapproved
  (remarks required); Pending/Approved → Cancelled (days return). Only
  Pending, not-yet-acted-on leave is editable; the employee can't change.
- Leave type delete is refused once applications use it (set inactive).

## Permissions

`leave-type-list/-create/-edit/-delete`, `leave-list` (applications,
balances, the list filters' `/leave/create` options), `leave-list-all`
(see every leave), `leave-balance-list` / `leave-balance-list-all`
(Leave Balances: subordinates / everyone), `leave-create`,
`leave-edit`, `leave-approve`, `leave-cancel`, `leave-credits-edit`
(PermissionSeeder → Administrator). `employee_master_data/option_list`
admits `leave-create` / `leave-list` for the employee picker.
`/leave/create` returns the branches for the filters (`/branch/index`
needs branch-list, which HR roles lack).

## UI conventions

Approve / Disapprove are in the View dialog's footer, not row actions
(the row-action colour table in `CLAUDE.md` has no approve entry): rows
carry View (blue), Edit (green, Pending) and Cancel (orange). The list
opens on Pending — the work queue. Save in the form stays disabled while
the preview shows a blocking rule.

## Next phases (not built)

Employee self-filing (My Profile), approval notifications (bell), leave
attachments, overtime and manual time-in / time-out filings on the same
`ApprovalProcedure`, a Leave tab on the employee profile, and the DTR /
timekeeping summary that combines leave with the biometric Attendance tab.
