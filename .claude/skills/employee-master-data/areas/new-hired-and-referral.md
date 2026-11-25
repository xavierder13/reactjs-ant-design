# Employee Master Data — New Hired sync and Referral Codes

Part of the `employee-master-data` skill; read `SKILL.md` first (cross-cutting rules). 

## New Hired (sync from the careers portal)

Port of vueportal `EmployeeNewHired.vue`. `GET employee_master_data/new_hired`
→ the portal's `job_applicant/get_all_hired`: orientation passed, contract
signed up to today, not in `employee_new_hired_sync_logs`. Client-side search
/ sort; Sync posts the selected rows **as received** to
`sync/new_hired`, which creates each as Probationary (`employee_code`
`careers-<applicant id>`; skipped if name + birthdate + gender already exist)
and logs it as synced either way. Like `store()`, each newly created employee
also gets a referral code and a "Hired" Branch Assignment Position row (date
employed, the employee's branch and position — incl. the sync's fallbacks:
branch id 1 / Sales Staff when the portal's names don't match), all in one
transaction per employee. The new employee also stores who referred them:
`referred_by_code` (the code the applicant entered — the portal's
`all_job_applicants()` row carries `referral_code`) and
`referred_by_employee_id` (that code's owner in `employee_referrals`, null
when it matches no one). Both are kept off `$fillable` (no form / import
sets them). Hires synced earlier get them from Human Resource → Sync &
Updates → **Sync Referred Employees** (Administrator, `GET
employee_master_data/sync_referred_employees`): starts from
`employee_new_hired_sync_logs` (every synced hire; `careers_employee_id` =
applicant id) joined to the portal's referred applicants, then finds the
employee each became — the log has **no employee id** and HR re-codes most
hires (locally 74 of 1,739 still `careers-<id>`) — single unambiguous match
only, in order: `careers-<id>` code → created within 5 s of the log row +
same last / first name → same last / first / middle name + birthdate →
same last / first name + birthdate. Never overwrites a stored code; stored
codes with no owner are matched again; an employee's own code never counts;
re-runnable; the message lists the counts per method and the unmatched
applicants (set by hand). The audit trail can't help (it starts 2026-10-09).
The notification bell counts this list
(`RecruitmentController::newHiredCount`).

## Referral Codes

- Link: `utils/referralLink.js` `buildReferralLink(code)` =
  `https://recruitment.addessa.com/careers?ref=<code>` (must match
  `EmployeeInformationTabs.vue`'s `referralLink`); copy via `copyText()`
  (`navigator.clipboard` only exists over HTTPS/localhost — falls back to
  `execCommand('copy')`). Generated server-side (`applyReferralCode()`);
  never in `buildPayload()`.
- The careers portal only accepts a code whose `employee_referrals.is_active`
  is true (an inactive one is silently dropped from the application form),
  so the profile and list tag inactive codes.
- `is_active` follows the employee's `active` (store/update/rehire/resign/
  offboarding/deactivate and the Excel import all call
  `applyReferralCode()`). Human Resource → Sync & Updates → **Generate
  Referral Codes** (Administrator) repairs everything in one transaction:
  creates missing codes for active employees, reactivates their inactive
  ones, deactivates resigned employees' codes, and reports the three counts.
  Then **Sync Referral Codes** pushes the flags to the portal — never Sync
  first while codes are out of step (it would deactivate them on the portal).
- Shown on: `EmployeeDetailsTab.jsx` (edit/view), `ProfileHeader.jsx` (HR
  and self profile; copyable code + "Copy referral link" button), and the
  **Referral Codes** list (`ReferralCodeList.jsx`, sidebar Human Resource →
  Employee). The list's backend is `POST employee_master_data/referral_codes`
  (`EmployeeReferralController@index` + `EmployeeReferralService`, gated by
  `employee-referral-list`, not branch-scoped): server-paginated, `search`
  (employee code / names / referral code), `status` (Active/Inactive
  employee, default Active), `code_status` (Active/Inactive/None),
  `branch_id`; returns its own `branches` so it doesn't need the
  employee-master-data permissions.
- **Referrals** (`employee-referral-view-referrals`; Administrator passes):
  the list then gets a **Referrals** count column, an "All / With Referrals"
  filter (`has_referrals`, server-side `whereIn` on the codes in use) and a
  **View Referrals** row action (`ReferralApplicantsModal.jsx`, `POST
  employee_master_data/referral_codes/referrals` `{ employee_id }`): the
  applicants at **any** stage who entered that code, with the All
  Applicants stage filter (`STAGE_FILTERS` / `matchesStage` /
  `progressTagProps` from `recruitment/applicants/applicantStatus.js`). Both
  read the portal live: `RecruitmentController::referralApplicants()` →
  gateway `referral_applicants` = the acting user's All Applicants rows with
  a code (portal Branch Manager scoping applies). Codes match trimmed and
  case-insensitive. When the portal can't answer, the list still loads with
  a warning (`referrals_error`) and no counts; the "With Referrals" filter
  and the modal return 422 instead. A code nobody in the HRIS owns
  (typo / test code) has no row here.
- **Referred Applicants** page (`/employees/referred-applicants`,
  `ReferredApplicantList.jsx`, sidebar Employee → Programs, same
  `employee-referral-view-referrals`): `POST
  employee_master_data/referral_codes/referred` → every referred applicant
  (same gateway rows) plus `referrer` (code owner, null = "No employee owns
  this code") and `employee_id` (synced employee, matched by
  `careers-<applicant id>` — opens `/employees/:id` with
  `employee-master-data-list`). Loaded once, filtered client-side: search
  (applicant / referrer / code), All Applicants stage filter with counts,
  branch applied; **By Referrer** (one row per code, Referrals / Hired
  counts, expand for the applicants) or **All Applicants** (flat, Referred
  By column). Drill-down (`RecordLink`, `referralHelpers.js`): an applicant
  row / name opens the recruitment `ApplicantDrawer` (any careers `*-list`
  permission; the endpoints return the portal's `branches` / `positions`
  for its `maps`), the referrer name and the Employee Record column
  (`careers-<id>`) open the profile with `returnTo`; a referrer row click
  expands it. View Referrals rows open the same drawer, and the Referral
  Codes employee name opens the profile.
- **Referred Employees** page (`/employees/referred-employees`,
  `ReferredEmployeeList.jsx`, Employee → Programs,
  `employee-referral-employee-list`): the **hired** side — Employee Master
  Data rows with a `referred_by_code`, no portal call. `POST
  employee_master_data/referral_codes/referred_employees`, server-paginated,
  filters search (employee / referrer / code), status, branch, employment
  type, date employed range. `view: 'referrer'` groups by `group_key`
  (`E<referrer id>`, or `C<CODE>` for a code nobody owns, listed last) with
  total / still active / regular counts; an expanded group loads its
  employees with `group_key`. Rows open the profile with `returnTo`.
  Referred Applicants still lists synced hires too (user decision).

## Export (Referral Codes, Referred Applicants, Referred Employees)

Each page's **Export** button builds an .xlsx in the browser
(`referral_codes/referralExport.js`, SheetJS): what the current filters
match, as plain text. Server-paginated lists (Referral Codes, Referred
Employees) are re-fetched page by page (`fetchAllPages`, 500 per request),
not just the visible page. Sheets: Referral Codes — one (Referrals count only
with `employee-referral-view-referrals`, left out if the portal didn't
answer); Referred Applicants / Referred Employees — By Referrer + the flat
list. No separate permission: anyone who can open the list can export it.
File name `<page> (YYYY-MM-DD).xlsx`.
