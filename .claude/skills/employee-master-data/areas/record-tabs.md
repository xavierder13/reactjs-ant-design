# Employee Master Data — record tabs

Part of the `employee-master-data` skill; read `SKILL.md` first (cross-cutting rules). Read before changing any record tab (Performance Management, Disciplinary/NTE, Training, Offboarding, Attendance).

## Sub-tabs

**Performance Management** (`tabs/performance/`):
- `PerformanceRecordTab.jsx` — generic list+modal CRUD shared by
  Classroom/OJT Performance Rating, Merit History, Training (thin
  field-config wrappers) and Branch Assignment & Positions. Each
  store/update/delete returns the employee's full remaining list for that
  relation, which becomes the new local state.
- **Monthly Key Performance** (bespoke `MonthlyKeyPerformanceTab.jsx`):
  "Add Period" creates all 12 months of a year in one call (`grade: null`
  each — not Vue's `grade: ""`); "Delete Period" removes a year's 12 rows
  by `employee_id`+`period`; only a single row's `grade` is editable.
- **Branch Assignment & Positions — employment source**: each row has
  `employment_source` (string, `direct` default / `agency`; extend
  `EmployeeBranchAssignmentPosition::EMPLOYMENT_SOURCES` + the tab's
  `EMPLOYMENT_SOURCE_OPTIONS` to add one — only `agency` counts as
  agency-hired, any other source is a direct hire) + optional `agency_name`
  (AutoComplete fed by `branch_assignment_position/agency_names`; only an
  agency row stores a name; the Vue form doesn't send them, so the backend only
  writes them when sent). Employment Type follows the agency *state*
  (`EmployeeBranchAssignmentPosition::agencyState()`: latest row agency →
  'agency'; latest direct with an earlier agency row → 'absorbed'; else
  'direct'; latest = date_assigned then last entered). Only two transitions
  change it — → agency sets **Agency**, agency → absorbed sets
  **Probationary** — so transfers, remarks edits, deleting a transfer or
  tagging old history never undo HR's value. Store/update/delete return
  `employment_type` when it changed; the tab shows a message and patches
  Employee Details via `onEmployeeChange` (so a later Save doesn't revert
  it). Staged rows on create go through the same rule. Bulk tagging uses
  the Branch Assignment Position template/import: the template lists every
  employee's existing assignments pre-filled (+ `employment_source`
  direct/agency, any case, blank = direct, and `agency_name`; one blank
  line per employee without rows). On upload,
  code-and-name-only lines and lines identical to an existing row are set
  aside *before* validation (old rows can name unregistered positions,
  e.g. "Department Manager"); the rest are validated, then the same
  employee code + date + position + branch updates that row, otherwise a
  row is added; Employment Types are synced per employee; the message
  reports added / updated / unchanged. Old 6-column files still import and
  leave tags alone.
- **Branch Assignment & Positions** side effect: backend store/update/
  delete overwrite the employee's own `branch_id`/`position_id`/
  `department_id` to match the latest `date_assigned` row, so it can
  change what Employee Details shows (surfaced as a warning `Alert`).
  `branch`/`position` here are **name strings**, not ids — Selects reuse
  `useEmployeeFormOptions` keyed on `.label`.
- **Evaluation & Regularization**: a read-only summary (Date of
  Regularization, Final Interview Date, Overall Result — all set by the
  backend, shown from the core record's `regularization_date`,
  `regularization_interview_date`, `regularization_interview_status`) plus
  **Regularization Interviews** (`RegularizationInterviews.jsx` on
  `PerformanceRecordTab`, `regularizationInterviewApi.js`, vueportal
  `EmployeeRegularizationInterviewController` + `RegularizationService`):
  one row per interviewer (Interviewer = an employee via `EmployeeSelect`,
  date, Passed / Failed, remarks), read off the row's
  `regularization_interviews`; needs a saved employee. The **final
  interview (latest date, then the last added) decides** — the backend
  copies it onto the record (the main Save no longer writes these). A
  Passed final result switches an employee who is already due (active,
  Probationary, 150+ days since **Direct Hire Since**) to Regular with
  `regularization_date` = Direct Hire Since + 180 days (DOLE rule — never
  typed: shown "Due …" until set; the backend ignores a sent value, Import
  Data skips the column, a Regular employee without one gets it filled);
  each write answers `employee` (patched into the form via
  `onEmployeeChange`). `RegularizationDateWarning` flags an older stored
  date that isn't Direct Hire Since + 180 (also on the profile's
  Employment tab). vueportal's "Regularize Passed Employees" action
  (`GET employee_master_data/regularize_passed_employees`,
  `employee-master-data-regularize`) catches the ones who become due later.
  Direct Hire Since (`EmployeeBranchAssignmentPosition::directHireSinceSql()`,
  returned on every list/employee row as `direct_hire_since`, shown
  read-only on Employee Details) = the first direct Branch Assignment after
  the last agency one, else `date_employed`; the For Regularization
  list/export, the dashboard's regularization section and the sync all use
  it. Date of Regularization stays an editable date picker (user decision)
  so HR can correct the auto-filled date. Employee Details' Date Resigned is
  read-only via the shared `components/ReadOnlyDateInput.jsx` (a plain
  `<Input readOnly>`, same look as the Referral Code, not the greyed disabled
  style; the dayjs value stays in the form untouched). Plus two
  files distinguished by `title` ("Performance for Regularization", "Memo
  of Regularization") on the core `file_upload`/`file_delete`/
  `file_download` endpoints — the title is sent as `document_type`. Each is a
  `FileSlotCard`; a picked file uploads immediately.

**Disciplinary Measures & Penalties** (`tabs/disciplinary/`):
- Standalone components (not `PerformanceRecordTab`) because create/update
  are multipart with files. `DisciplinaryRecordsTab.jsx` = one file per
  record; `NteRecordsTab.jsx` = two independent files (`nte_file`,
  `explanation_file`), each call needing its own `document_type`.
- The backends' `index()` endpoints are a **global open-cases queue**, not
  per-employee — this tab reads `explanations`/`disciplinaries` from
  `initialData`.
- Backend ignores a re-upload once a file exists; the file must be deleted
  first. UI: each file is a `FileSlotCard` (in the tab dialogs and the
  Open NTE/Disciplinary list dialogs) — drag-drop picker only when no file
  exists, otherwise Download/Delete; `NteFileSlot.jsx` wires it to `nteApi`.
- Fixed lists from the reference: `offenses` (8), `disciplinary_measures`
  (6), `offense_series` (First–Fifth), as closed `Select`s; `status`
  `Open`/`Closed`. `offense_type` is free text.

**Training** (`TrainingProgramTab.jsx`, `trainingProgramApi.js`; backend
`EmployeeTrainingProgramController` + `EmployeeTrainingProgramService`,
table `employee_training_programs`, routes
`employee_master_data/training_program/store|update/{id}|delete`):
- HR-encoded training programs; its own outer tab placed **before
  Offboarding** (user rule). Not the Performance Management "Training"
  sub-tab (`employee_trainings`: mentor/grade/KPI), which is unchanged.
- Fields: Training Program Title, Training Type (Onboarding / Technical /
  Soft Skills / Leadership / Compliance / Others → required "Please
  specify" = `training_type_other`, cleared for any other type; the list
  shows "Others — <specified>"), Provider (Internal → Department
  from `useEmployeeFormOptions`; External → provider name + optional
  Training Fee), Delivery Method (Online / In-Person), Date, Location
  (required for In-Person). Fixed lists must match
  `EmployeeTrainingProgram::TRAINING_TYPES/PROVIDERS/DELIVERY_METHODS`
  (validated with `Rule::in`). The service clears the side that doesn't
  apply (Internal → no provider name/fee; External → no department).
- Unlike the other `PerformanceRecordTab` users, validation failures are
  **HTTP 422** with a field bag; `saveResult()` turns that into
  `{ success: false, errors }`. Every write returns `training_programs`
  (the employee's full list, newest date first). Create mode shows "Save
  the employee first" (not part of `store()`). Main Save is hidden on it.
  Not in vueportal's Vue UI, the template/import or exports.

**Offboarding** (`OffboardingTab.jsx`, `offboarding/OffboardingFileSlot.jsx`,
`offboardingApi.js`):
- `employee_offboardings` (via `EmployeeOffboardingController`) is the
  **authoritative** source. The resignation columns on
  `employee_master_data` are a legacy holdover (still read by the export,
  never written by the live UI). Settled — don't re-litigate.
- Saving an offboarding record then calls `employeeApi.resign({
  employee_id, date_resigned: last_day_of_work })` to flip the core
  employee's `active`/`date_resigned`. Best-effort: a failure is shown but
  doesn't roll back the saved record (same as the reference).
- Three file slots (Last Day, Clearance, Quitclaim) — `OffboardingFileSlot`
  cards (shared `FileSlotCard`) in one `OffboardingFileSlots` row, also
  used by the Resigned list's edit modal. Pickable on **create** too;
  replace-blocked download/delete only once a file exists. Where the
  record can't be edited (employee View mode / no edit permission) the row
  action is View (eye), opening the modal read-only: fields disabled,
  download-only cards. It's wrapped in `ConfigProvider componentDisabled=
  {false}` because the employee page's View-mode `<Form disabled>` would
  otherwise disable the View/Download/Close buttons.
- Fixed lists: 23 resignation reasons ending in "Others (Specify)" (saved
  literally, no free-text follow-up); `compliance`: `Render 30 Days`,
  `Render 60 days`, `Non-Compliant` (keep the capitalization — it's the
  stored value).

**Attendance** (`AttendanceTab.jsx`, `attendanceApi.js`):
- Read-only biometric logs from a separate `biobridge` DB connection,
  keyed by `employee_code`. The **only** sub-tab with its own fetch:
  `POST /employee_master_data/attendance` `{employee_code, date_from,
  date_to, page, items_per_page}` → Laravel paginator of
  `{date, time_in, time_out, break_in, break_out, break_logs: [{punch, time}]}`.
- Range UX: Last 7 / Last 30 days (fetch immediately) / By Period (manual
  dates + Search). Break chip opens a modal of raw punches.
- Deliberately excludes the reference's dead UI (Overtime/Late-Early/No Pay
  toggles, hardcoded badge counts, Out Time/Work Hours/No Pay columns that
  are never populated) and its Download menu items.

## NTE: Date Received by HR

`employee_explanations.date_received_by_hr` (migration
`2026_10_07_120000_add_date_received_by_hr_to_employee_explanations_table`,
run by `--path` only) — on `NteFormFields.jsx` (employee NTE tab, Open NTE
list edit, staged create) and the Open NTE list column. It starts Case
Resolution Time (Workforce Dashboard); the disciplinary record's Return
Date ends it. The React forms always send it (empty clears it);
`EmployeeNTEController` writes it only when the request has the key, so
vueportal's Vue NTE form (which lacks it) can't wipe it. NTE template /
import: `date_received_by_hr` is the 11th (last) column — 10-column files
still import; a blank cell keeps the saved date. The import now
`updateOrCreate`s on employee + `date_issued` + `nte_code` (it used to
`firstOrCreate` on every field, so a changed status/remarks added a copy).

## Offboarding: Exit Interview Date

`employee_offboardings.exit_interview_date` (migration
`2026_10_07_130000_add_exit_interview_date_to_employee_offboardings_table`,
`--path` only) on `OffboardingFormFields.jsx` (Offboarding tab + Resigned
list edit) and the Offboarding tab table ("None" when blank). React always
sends it (empty clears); `EmployeeOffboardingController::save` writes it only
when present, so the Vue form can't wipe it. Feeds Exit Interview Analysis
(Workforce Dashboard). Offboarding template / import: `exit_interview_date`
is the 9th (last) column — 8-column files still import; a blank cell keeps
the saved date. The import now `updateOrCreate`s on employee +
`last_day_of_work` (it used to `firstOrCreate` on every field, so a changed
COE / compliance added a copy).
