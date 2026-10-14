import axios from '../../api/axiosInstance';

// Payroll runs — vueportal PayrollRunController + PayrollRunService
// (payroll_run.maintenance; Administrator bypasses). Runs per cut-off, each
// for one company (company_id — the employee's branch's company) or all
// companies (null): one All-companies run or one run per company, never
// both; an employee is in one run of a cut-off; each payslip keeps its
// company_id (its employer on payslips / reports). A run:
// Draft (generate again as often as needed) → submit (turns the cut-off's
// filing off; a disapproval turns it back on if the submit did) → Pending (the "Payroll
// Run" Access Chart: every approver mapped at a level acts, its required
// approvals complete it; the submitter can't approve their own) → Approved
// on the last approval (locked: scheduled deductions get a Payroll payment,
// the cut-off's open payroll adjustments are Applied, its filing is turned off); a
// disapproval returns it to Draft. Cancelled (Draft only).
// - getAll({ year }) → { runs: [{ id, payroll_cutoff_id, company_id, company { name }, status,
//   employee_count, gross_pay, total_deductions, net_pay, employer_share,
//   skipped { no_salary }, remarks, generated_at, approved_at, cutoff {…},
//   generator { name }, approver { name } }] } (payroll-run-list).
// - options() → { cutoffs: [cut-off + runs [{ id, company_id (null = all),
//   status }]], companies [{ id, name }], statuses }. An approved run takes only employees
//   not in it (Selected employees): they are added, the run goes back to
//   Draft and is approved again as its next round; the approved payslips
//   stay locked and unchanged.
// - generate({ payroll_cutoff_id, company_id (null = all companies), remarks,
//   employee_ids? }) → { message, run } (payroll-run-generate) — the scope's
//   run; 422 { message } when the other kind exists (All vs per company),
//   when pending, or approved and
//   all employees / someone already in it is chosen. run.added = employees
//   were added to an approved run.
//   employee_ids: only those again on the existing Draft (the rest keep
//   their lines; 422 when Payroll Settings / premium rates changed since),
//   or a new run with just those when the cut-off has none. Approved
//   (posted) employees are never recomputed: choosing one is refused and
//   Regenerate All skips them.
// - candidates(id) / cutoffCandidates(cutoffId, companyId) → { employees: [{ id,
//   employee_code, full_name, branch, position, in_run, eligible, approved }] }
//   (payroll-run-generate) — approved = posted, locked until rolled back.
// - rollback(id, reason, employeeIds?) (payroll-run-rollback; employeeIds
//   omitted = all) — those approved payslips → unposted: removes their
//   Payroll deduction payments of the cut-off, reopens their payroll adjustments; the run
//   goes back to Draft, the other payslips stay approved. On an Approved
//   run, or a Draft that still has approved payslips; 422 while a later
//   payroll is Approved / Pending or the year's 13th month is Approved /
//   Pending. run.rolled_back_at / roller / rollback_reason. Cancel is
//   refused while approved payslips remain.
// - show(id) → { approval: { configured, current_level, levels, history,
//   can_approve } (ApprovalSteps / FilingHistory), run (+ cutoff, generator,
//   submitter, actor, approver, canceller, settings, current_level,
//   submitted_at, acted_at, action_remarks),
//   employees: [{ id (payslip id), employee_id, employee_code, full_name,
//   branch, position, pay_basis, basic_rate, gross_pay, total_deductions,
//   net_pay, employer_share, company_id, absent_days, late_minutes, undertime_minutes,
//   ot_minutes, warnings, approved (posted) }] }.
// - payslip(id) → { payslip: { …, earnings [{ code, label, category,
//   amount, taxable, detail [] }], deductions [{ label, category, amount,
//   detail [] }], employer [{ label, amount }], summary (DTR summary +
//   basic_base, month_base, tax, cutoff_order), days (DTR days), warnings,
//   employee }, run }.
// - submit(id) (payroll-run-generate) · approve(id, remarks) /
//   disapprove(id, remarks — required) (payroll-run-approve + a current-level
//   approver) · cancel(id, reason) (payroll-run-cancel, Draft).
const payrollRunApi = {
  getAll:   (params)     => axios.post('/payroll_run/index', params),
  options:  ()           => axios.post('/payroll_run/options'),
  generate: (payload)    => axios.post('/payroll_run/generate', payload),
  show:     (id)         => axios.post(`/payroll_run/show/${id}`),
  payslip:  (id)         => axios.post(`/payroll_run/employee/${id}`),
  submit:   (id)         => axios.post(`/payroll_run/submit/${id}`),
  approve:  (id, remarks) => axios.post(`/payroll_run/approve/${id}`, { remarks }),
  disapprove: (id, remarks) => axios.post(`/payroll_run/disapprove/${id}`, { remarks }),
  cancel:   (id, reason) => axios.post(`/payroll_run/cancel/${id}`, { reason }),
  candidates: (id)       => axios.post(`/payroll_run/candidates/${id}`),
  cutoffCandidates: (cutoffId, companyId = null) => axios.post(`/payroll_run/cutoff_candidates/${cutoffId}`, { company_id: companyId }),
  // company account it is paid from (null = the default for the pay date) and
  // the match-employee-bank rule (null = Payroll Settings) — until approved
  // (payroll-run-generate)
  paidFrom: (id, payload) => axios.post(`/payroll_run/paid_from/${id}`, payload),
  // not-yet-approved payslips out of a Draft (payroll-run-generate); only
  // approved ones left → the run is Approved again as its last round left it
  remove:   (id, employeeIds) => axios.post(`/payroll_run/remove/${id}`, { employee_ids: employeeIds }),
  rollback: (id, reason, employeeIds) => axios.post(`/payroll_run/rollback/${id}`, employeeIds ? { reason, employee_ids: employeeIds } : { reason }),
};

export default payrollRunApi;
