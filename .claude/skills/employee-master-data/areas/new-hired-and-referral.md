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
transaction per employee. The notification bell counts this list
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
