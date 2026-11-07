# Employee Master Data — Branch Manpower Fill Rate (R-5)

Part of the `employee-master-data` skill; read `SKILL.md` first (cross-cutting rules). 

## Branch Manpower Fill Rate

`branch_manpower/BranchManpowerReport.jsx` (+ `PositionColumnsPicker.jsx`),
`services/employee/branchManpowerApi.js`. R-5 report: Req / Exst / Vac per
position for each branch, grouped by Area Assignment, with fill-in rate
(Exst ÷ Req) and vacancy rate (Vac ÷ Req) per branch, area subtotal and
grand total, plus a per-position percentage row.

- Backend: vueportal `BranchManpowerReportController` +
  `BranchManpowerReportService`, POST `/employee_master_data/branch_manpower/
  options|report|export`, all gated by
  `employee-master-data-branch-manpower-export` in
  `EmployeeMasterDataMaintenance`. **Separate from** the dispatcher's legacy
  'Branch Manpower Report' (`App\Exports\BranchManpowerReport`), which
  vueportal's Vue `ExportDialog.vue` still uses unchanged.
- Numbers reproduce the legacy export (Exst = its *Ending* column) — the
  service docblock lists the legacy rules/quirks kept on purpose. The only
  known difference: an employee with two assignments on the same
  `date_assigned` (the service takes the last-entered row; the legacy
  query's pick depends on MySQL's plan).
- Filters: As of date; **Generate by** Per Area / Per Branch / Per HR Head
  Personnel, each with a multi-select (`ids`, empty = all; reset when the
  mode changes). Per Area groups by area (+ `UNASSIGNED` when all); Per
  Branch is one flat group; Per HR Head groups by `area_hr_heads` employee
  with the branches of every area they head (+ `NO HR HEAD` when all) — a
  branch under two heads shows in both, the grand total counts it once.
  Subtotal rows only appear with more than one group.
- Position columns: one always-editable list, pre-filled with the legacy
  17 (`default_positions`, includes the 4 Reserved columns that exist only
  by name) — add any position, remove, drag rows by the handle to reorder
  (`@hello-pangea/dnd`, as in the KPI template form), Reset restores the
  17. Not saved; applies to that generation/export only.
- Export = `.xlsx` with an `R-5` sheet (same order/filters as the screen)
  and a `Detailed` sheet in the legacy 7-measures-per-position layout.
