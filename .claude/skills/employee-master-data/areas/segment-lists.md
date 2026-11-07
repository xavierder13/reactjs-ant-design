# Employee Master Data — segment and open-case lists

Part of the `employee-master-data` skill; read `SKILL.md` first (cross-cutting rules). Read before changing Hired This Month, For Regularization, Synced from Careers, Resigned, or the Open NTE / Disciplinary lists.

## Segment and Open-Case Lists

React counterparts of vueportal's EmployeeHiredThisMonth / EmployeeForRegularization /
EmployeeResigned / EmployeeNTEList / EmployeeDisciplinaryList pages; the Workforce
Dashboard's cards open them (`/vacancies` is the recruitment page `src/pages/recruitment/Vacancies.jsx`).
Each list's total matches its dashboard card.

- **Hired This Month / For Regularization** (`EmployeeSegmentList`): same rows as the
  main list (backend `getEmployees()` base), so the main list's columns, search,
  View/Edit via router state, delete and bulk delete all apply. View/Edit/Add also pass
  `returnTo` (the list's path) in router state: the form's Cancel, the profile's
  Back to List and the post-save profile all lead back to that list (default `/employees`). Branch filter
  (`search_branch`, branch **name**) only for `canFilterByBranch`. For
  Regularization also has a Position filter (`positionFilter` prop →
  `search_position`, position **name**, matched on `f.name` in
  `forRegularizationQuery()`, so the export honours it too; Hired This
  Month's endpoint doesn't accept it). For Regularization excludes failed
  regularization interviews server-side (so its dashboard card does too),
  starts with Date Employed instead of Status (`defaultColumns`), and always
  shows an Interview column (`extraColumns` — outside the picker, so no
  backend search mapping) reading Passed + date or "Not yet interviewed".
  Always sends
  `include_sales_specialist: false` (vueportal's toggle is commented out). No status
  filter — both endpoints are active-only.
- **Synced from Careers** (`CareersSyncedList`, `EmployeeSegmentList`): employees
  synced by New Hired that still have the placeholder `employee_code`
  `careers-<applicant id>` — the main `index()` with `careers_synced: true`
  (`employee_code LIKE 'careers-%'`), so it is branch-scoped like the main list,
  includes Sales Specialists and inactive rows, and takes `search_position`.
  A row drops off once HR sets the real employee code. Default columns add Date
  Employed and Employment Type; an always-shown Employment Source column reads the
  latest Branch Assignment row (latest `date_assigned`, then id) — "No assignment"
  until HR adds one. `showCreate` adds the main list's Add Employee button; no
  Export (`exportConfig` omitted).
- **Export**: For Regularization → `for_regularization/export` with the list filters.
  Hired This Month → the Employee List export **pre-filled** (Date Employed, 1st of
  month → today, Active Only, `include_sales_specialist: false`); vueportal's Hired
  page opens its dialog in "for regularization" mode and downloads the wrong list.
- **Resigned**: rows are `employee_offboardings` (latest per employee) + employee
  fields; column `title`s must equal `resignedQuery()`'s `$table_fields` names.
  Date filter (`date_field_param` + range, default Resignation Date Filed this month =
  the dashboard card). Edit reuses `OffboardingFormFields` + `OffboardingFileSlot`;
  the backend re-syncs `active`/`date_resigned` on offboarding update/delete, so no
  separate resign call here. Export → `resigned/export`.
- **NTE / Disciplinary (Open)** (`OpenCaseList`): the backends' `index()` queues
  (all open records in the caller's scope at once), so search, branch filter and
  paging are client-side. Edit reuses the tabs' form fields; a record set to Closed
  drops off on reload. Disciplinary actions are gated on `disciplinary-*` (what the
  backend checks) — vueportal's page checks `nte-*` by mistake.
