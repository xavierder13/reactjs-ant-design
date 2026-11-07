# Payroll processing — reports and compliance

Part of the `payroll-run` skill; read `SKILL.md` first (cross-cutting rules).

## Reports & compliance rules

- Every report reads **approved** runs only (register / bank preview also
  show a Draft); the bank CSV is approved-only.
- Employer share on payslips: Payroll Settings → General → Payslip
  (`payroll_settings.payslip_show_employer_share`, migration
  `2026_10_20_140000`, default **off**; not a pay setting — doesn't block a
  partial generate). Off: `PayrollReportService::forEmployee` strips the
  payslip's `employer` lines / `employer_share` from what employees get —
  `my_payslip/show`, every printed payslip (`payroll_report/payslips`,
  `my_payslip/payslips`) — and `employeePaySheet` drops the ER / EC columns
  (JSON and the Excel). Payroll staff still see it on the run's payslip
  (`payroll_run/employee` → `show_employer_share`; PayslipModal tags it "Not
  on the employee's payslip" and its Print leaves it out), the register and
  the reports.
- Employers: Payroll Settings → Employers (`payroll_setting/employers/update/
  {companyId}`, payroll-setting-edit; registered name blank = the company
  name; audit 'Employer (company)'). Remittances and Year-end Tax have a
  Company select (`reports/CompanySelect`, `payroll_report/companies` —
  payroll-report-view, no company-list needed; `usePayrollCompanies`):
  that employer's payslips only, cleared = all companies (employer fields
  null, a warning to choose one). The 2316 defaults to the company of the
  employee's latest approved payslip that year; a transferred employee gets
  one per company. Range reports' company filter = the payslip's company.
  Printed payslips use each payslip's `employer`.
- Bank file (`PayrollReportService::bankLines($amounts, $creditDate,
  $paidFrom)`): credits each employee's account **in force on the pay
  date** (`BankAccountService::inForce` — latest `effective_from` on or
  before it; Payroll → Bank Accounts, `/payroll-bank-accounts`,
  `bank-account-*`; banks on Payroll → Setup → Banks, `/banks`, `bank-*` — View employees (`bank/BankEmployeesModal`, bank-account-list) lists a bank's accounts in force today / upcoming / history via `bank_account/index { bank_id, state }`),
  **one file per company account it is paid from** (`groups`, CSV per
  `source_id`). No account = `missing` (cash / check); a zero or negative
  net = `not_positive` (not credited, shown in red). The bell's
  `no_bank_account` (info) counts active salaried employees without one
  (`?state=missing`).
- Paid from (`BankAccountService::paidFrom` / `sourceFor`): payroll
  accounts (`company_bank_accounts`, `payroll_setting/accounts/*`,
  payroll-setting-edit) belong to a company (`company_id`, migration
  `2026_10_20_120000` — managed on Payroll Settings → Employers, a company's
  row expands to them) or are general (null — the General tab's Payroll
  Accounts card, the fallback). An employee is paid from their payslip's
  company's accounts — only when the company has a default for the pay date
  (its Default, or a default period covering it); a company with no account,
  or accounts but no such default, uses the general ones entirely (match-by-
  bank included). Within one owner: default for the pay date = the account whose
  default period covers it (periods can't overlap within the owner), else
  its Default (one per owner). `match_employee_bank` (Settings, overridable
  per payout): an employee whose bank has an active account of the same
  owner is paid from it. Only a **one-company** payroll run / 13th month can
  choose its account (its company's or a general one) on the Bank File until
  approved (`can_choose_account`; `payroll_run/paid_from`,
  `thirteenth_month/paid_from` — the generate permission); an all-companies
  one pays each employee from their company's account. Both may change the
  rule. **Approval keeps the result in `paid_from`** (with `companies {
  company_id: { default, by_bank } }`), so later account edits never change
  an approved payout (one kept before company accounts has no `companies` —
  the general accounts for everyone). Bank file groups show the account's
  company; CSV names add it.
- What each line was paid with: on approval every payslip / 13th-month line
  saves `bank_credit` (migration `2026_10_20_130000`; `PayrollReportService::
  recordCredits` — { status credited | no_account | not_positive, amount,
  the employee account credited, source = the company account }); a
  rollback clears it. `runCredits` / `thirteenthCredits` = the saved ones,
  the rest worked out now (per round with its kept accounts);
  `creditSummary` sums them per paying account. Shown as **Paid from** on
  the payroll page and 13th-month view (`run/PaidFromSummary`; "preview —
  final on approval" until all saved), a Paid From column on the Approval
  Rounds panel and the Payroll Runs list (saved credits only), and Credited
  To / Paid From columns in the payroll register Excel.
- Remittances: per calendar month (and company), all approved cut-offs
  ending in it; BIR taxable = taxable pay − mandatory EE contributions.
- 13th month (PD 851): basic pay + paid leave − absences / late / undertime /
  unpaid leave + salary differentials, ÷ 12; Draft projects the rest of the
  year at the monthly rate (daily-paid: earned only); one batch per year;
  over ₱90,000 is taxable. A batch is for all companies or one company like
  payroll runs (one All batch a year or one per company; lines keep
  `company_id`; earned through = the company's last approved cut-off; the
  basic earned counts every payslip of the year). Generate (and the Draft's Regenerate, which
  opens the same modal) = All employees or Selected employees, like Payroll
  Runs: `employee_ids` recomputes only those (a new batch gets just them;
  on a Draft the others keep their lines; an inactive / unsalaried /
  zero-amount one leaves), refused when payrolls were approved since the
  Draft was made and other lines would keep the old "earned through";
  `thirteenth_month/candidates { year }` feeds the shared
  `run/EmployeePickerTable`. Approved lines are posted
  (`thirteenth_month_pays.posted_at`, migration `2026_10_18_100000`, which
  backfills approved batches): locked, never recomputed (selecting one is
  refused, All skips them), and what the year-end tax / final pay read
  (`ThirteenthMonthPay::approved()`). Roll Back Selected / All
  (`thirteenth_month/rollback/{id}`, `thirteenth-month-rollback`, reason,
  `employee_ids` or none = all) unposts them, the batch goes back to Draft
  (`rolled_back_by / _at / rollback_reason`, logged) and through approval
  again — only before `paid_on` (pay date, else Dec 24); cancel is refused
  while posted lines remain. Approval = the payroll run's: Submit
  (thirteenth-month-generate) → Pending on the "13th Month Pay" Access Chart
  (`PayrollReportService::thirteenthProcedure()`, non-hierarchical; seeder
  `ThirteenthMonthApprovalProcedureSeeder` copies the Payroll Run chart;
  vueportal `ApproverRoleSeeder` gives "Payroll Approver" to both charts'
  approvers) →
  the last approval releases it; Disapprove (remarks) → Draft; Pending can't
  be regenerated / cancelled; the submitter can't decide their own.
- Year-end tax: taxable − contributions + 13th month over ₱90k on the BIR
  annual table vs. withheld (+ still to withhold, − refund); final pay the
  same; minimum wage earners exempt.
- Range reports (`payroll_report/contribution_history`, `pay_sheet`,
  `payslips`): `{ date_from, date_to }` = approved payslips whose cut-off
  ENDS in it (≤ 1 year; the cut-off range sends the first cut-off's start and
  the last one's end), filtered by company (the payslip's own `company_id`),
  branch / position (the employee's **current** ones — a payslip keeps no
  branch) and `employee_ids`. Contribution History: per employee SSS EE / ER / EC,
  PhilHealth EE / ER, Pag-IBIG EE / voluntary / ER, tax, EE / ER totals,
  expandable per cut-off; the Contributions page's History modal is the same
  endpoint with one employee (default this year). Pay Sheet: one line per
  employee summed over the cut-offs, tabs By Company / Branch / Position /
  Cut-off; Print Payslips joins `payslipHtml` with a page break (≤ 500, else
  422). Both download Excel.
- Final pay: unpaid days split by the saved cut-offs and prorated against
  each full cut-off; SIL / VL balance × daily rate (VL over 10 days
  taxable); posts nothing.
- Printed documents open in their own window (`printDocument`), so no
  page-scoped print CSS is needed; the 2316 / alphalist are data layouts,
  not the official BIR forms.
