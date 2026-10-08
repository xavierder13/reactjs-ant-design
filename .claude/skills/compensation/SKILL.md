---
name: compensation
description: Salary history (Compensation) — each employee's basic rate as versions by effective date, no approval, visible only by permission, bulk changes by Generate Template → Import. Use for src/pages/compensation/, the /compensation endpoints, or anything payroll reads a salary from (DTR, payroll run).
---

# Salary History (Compensation)

User rules (2026-10-08): **no approval** of a salary change (saved directly
by permission); history kept with effective dates; the salary and its
history are **shown only by permission**; bulk updates go through the
user's Generate Template → fill → Import Data process.

## Files

- vueportal: `EmployeeCompensation` (table `employee_compensations` — set
  explicitly, "compensation" is uncountable to Laravel), `PAY_BASES`,
  `CHANGE_TYPES`; `Services/CompensationService.php` (`rateOn`, `check`,
  create / update / delete, `import`); `EmployeeCompensationController`
  (index, options, history, store, update, destroy, template_download,
  import); `CompensationMaintenance` (`compensation.maintenance`,
  Administrator bypass); exports `EmployeeCompensationTemplate` (+ `…Sheet`,
  `CompensationReferenceSheet`), import `EmployeeCompensationImport`;
  migration `2026_10_09_140000_create_employee_compensations_table`.
- React: `src/pages/compensation/` — `CompensationIndex.jsx` (`/compensation`,
  Human Resource → Payroll → Salary History), `CompensationHistoryModal.jsx`,
  `CompensationFormModal.jsx`, `compensationHelpers.js` (peso format, change
  type colours); `src/services/compensation/compensationApi.js` (contract in
  its header). The shared `GenerateTemplateModal` / `ImportDataModal` take
  `types={['compensation']}` here; the type is also in `importDocumentTypes.js`.

## Rules

- A version = employee, effective_date, pay_basis (Monthly | Daily),
  basic_rate (> 0, 2 decimals), change_type (New Hire, Regularization, Merit
  Increase, Promotion, Salary Adjustment, Correction), reason. One version
  per employee per date (unique; 422 "already has a salary effective on …").
  Not before the employee's date employed.
- The salary in force on a date = the latest version effective on or before
  it (`CompensationService::rateOn`) — payroll must use this, never "the
  newest row". Future-dated versions are allowed (list: "Change on …" tag;
  history: Upcoming).
- A real raise is a **new version**; edit / delete are for wrong entries.
  Both are audited (Audit Trail, module "Compensation", record "Salary").
- Permissions: `compensation-list` (page, history, and salary entries in the
  Audit Trail / old Activity Logs — hidden without it), `-create`, `-edit`,
  `-delete`, `-template-download`, `-import`. `compensation-create` also
  opens `employee_master_data/option_list` (employee picker).
- Template: one line per employee (Document Status filter) with today's
  salary and a blank effective_date; every cell written as Text (keeps
  leading-zero employee codes). Import: blank effective_date lines skipped;
  same employee + date → update (unchanged lines counted, not saved); else
  add; all or nothing; shared 200 response contract.
- Merit History (Performance Management tab, `employee_merit_histories`) is a
  separate, older performance record — its list permission is held by
  managers, so it is **not** the payroll source and isn't synced with this.

## Not built yet

Pay-basis conversion (monthly ↔ daily factor) — decide with the payroll run.
Allowances (next phase) get their own module.
