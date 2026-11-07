# Employee Master Data — Employee Acknowledgment Report

Part of the `employee-master-data` skill; read `SKILL.md` first (cross-cutting rules). 

## Employee Acknowledgment Report

A **separate feature**, not a record tab. Vue labels its create button
"Upload Employee Report", but it does **not** upload a file — it snapshots
the current row selection (each row's active/inactive status, a `Switch`
here) as a branch-scoped report. Don't confuse it with Import (which
creates/updates employees from a spreadsheet).

Backend (`EmployeeAcknowledgmentReportController`):
- `GET /employee_master_data/acknowledgment_reports` → `{ branches: [...] }`
  each with nested `acknowledgment_reports` (`user` loaded); scoped to the
  caller's branch unless `employee-acknowledgment-reports-all`
  (server-side only — no UI distinction needed).
- `POST .../store` `{ branch_id, employees: [{ employee_id, is_active }] }`
  — `is_active` is a snapshot, doesn't change the employee.
- `POST .../view` `{ acknowledgment_id }` → full report with nested
  employees — a real single-record fetch, so `AcknowledgmentReportView.jsx`
  fetches by `:id`.
- `POST .../export` `{ acknowledgment_id }` → `.xlsx` blob.
- `POST .../delete` `{ acknowledgment_id }`.

Permissions: `employee-acknowledgment-reports` (list/view/submit),
`-export`, `-delete`, `-all`. Unconfirmed: the `user` display field (tries
`name`/`full_name`/`email`). The submit modal doesn't check selected
employees belong to the branch (neither does the backend).
