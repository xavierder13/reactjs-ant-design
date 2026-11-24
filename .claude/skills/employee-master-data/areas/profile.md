# Employee Master Data — Employee Profile

Part of the `employee-master-data` skill; read `SKILL.md` first (cross-cutting rules). Read before changing `profile/` (HR view and My Profile).

## Employee Profile

`profile/EmployeeProfile.jsx` (ports vueportal's `EmployeeProfile2.vue`),
shared by `/employees/:id` (`view="hr"`) and `/user/profile`
(`view="self"`, only when `employee_master_data/my_profile` returns the
account's `users.employee_id` record; otherwise UserProfile shows just its
account form with an info Alert). Parts:
- `ProfileHeader.jsx` — green cover band with the photo overlapping it
  (`profile_picture_upload/{id}`, gated
  `employee-master-data-profile-picture-upload`; image from the public
  web route via `utils/employeePhoto.js`), name, status/employment-type
  tags, contact, then four fact tiles: hire date / length of service /
  regularization or resigned date / Reports To (`reportingManager.js`,
  Vue's `manager` rule; returns `displayName` with any leading code or
  number stripped — never show an id/code — and `role`; the manager's
  photo, person icon when none).
- Look: sections use `profileUi.jsx`'s `SectionCard` (icon badge title)
  and `useDescriptionStyles.js` (label above value, muted label); colors
  from `theme.useToken()`, not hard-coded. Government IDs and Education
  are always 2 per row.
- `ProfileOverview.jsx` (personal, contact, gov IDs masked with reveal,
  education), `ProfileEmployment.jsx` (employment, job & org, assignment
  history timeline), `ProfileDocuments.jsx` (all core files; upload needs a
  document type → `document_type`; `-file-upload/-download/-delete`).
- The record tabs (work schedule, attendance, performance, disciplinary,
  training, offboarding) from `getEmployeeTabItems({ mode: 'view' })`,
  each in its own non-disabled `<Form>` (view mode hides mutations;
  `disabled` would also kill downloads/attendance filters). HR: by
  `TAB_PERMISSIONS`. Self: all of them (read from the my_profile record)
  except Attendance, whose `employee_master_data/attendance` endpoint needs
  `employee-master-data-attendance`.
- **Assets** tab (`ProfileAssets.jsx`, last before `extraTabs`): the company
  assets currently assigned (`company_asset/employee_assets/{id}` — current
  only, read-only; assign / return on Company Assets), shown with
  `company-asset-employee-view` or `company-asset-list` (the endpoint's);
  on My Profile (`view="self"`) always, through `my_asset/index` (own only,
  no permission).
- Work Schedule's Shift column is `src/pages/shift/ShiftChip.jsx`: click the
  code → popover with the weekly breakdown (time in/out, break, hours, rest
  days, grace) from the version's `shift` (`EmployeeWorkScheduleController::
  shiftLoad()` sends code, name, description, grace_minutes, active, days).
- Gating: HR sections follow `TAB_PERMISSIONS` (Overview/Documents =
  personal-data, Employment = employee-details); self view always shows
  Overview/Employment/Documents and the record tabs above, but actions
  still need their permission.
  Administrator passes every gate. `extraTabs` adds UserProfile's
  "Account & Security" tab.
