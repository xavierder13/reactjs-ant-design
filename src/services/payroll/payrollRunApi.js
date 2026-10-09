import axios from '../../api/axiosInstance';

// Payroll runs — vueportal PayrollRunController + PayrollRunService
// (payroll_run.maintenance; Administrator bypasses). One run per cut-off:
// Draft (generate again as often as needed) → submit (turns the cut-off's
// filing off; a disapproval turns it back on if the submit did) → Pending (the "Payroll
// Run" Access Chart: every approver mapped at a level acts, its required
// approvals complete it; the submitter can't approve their own) → Approved
// on the last approval (locked: scheduled deductions get a Payroll payment,
// the cut-off's open retros are Applied, its filing is turned off); a
// disapproval returns it to Draft. Cancelled (Draft only).
// - getAll({ year }) → { runs: [{ id, payroll_cutoff_id, status,
//   employee_count, gross_pay, total_deductions, net_pay, employer_share,
//   skipped { no_salary }, remarks, generated_at, approved_at, cutoff {…},
//   generator { name }, approver { name } }] } (payroll-run-list).
// - options() → { cutoffs: [cut-off + draft_run_id] (no approved run yet),
//   statuses }.
// - generate({ payroll_cutoff_id, remarks, employee_ids? }) → { message, run }
//   (payroll-run-generate); 422 { message } when approved / pending.
//   employee_ids: only those again on the existing Draft (the rest keep
//   their lines; 422 when Payroll Settings / premium rates changed since),
//   or a new run with just those when the cut-off has none. Approved
//   (posted) employees are never recomputed: choosing one is refused and
//   Regenerate All skips them.
// - candidates(id) / cutoffCandidates(cutoffId) → { employees: [{ id,
//   employee_code, full_name, branch, position, in_run, eligible, approved }] }
//   (payroll-run-generate) — approved = posted, locked until rolled back.
// - rollback(id, reason, employeeIds?) (payroll-run-rollback; employeeIds
//   omitted = all) — those approved payslips → unposted: removes their
//   Payroll deduction payments of the cut-off, reopens their retros; the run
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
//   net_pay, employer_share, absent_days, late_minutes, undertime_minutes,
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
  cutoffCandidates: (cutoffId) => axios.post(`/payroll_run/cutoff_candidates/${cutoffId}`),
  rollback: (id, reason, employeeIds) => axios.post(`/payroll_run/rollback/${id}`, employeeIds ? { reason, employee_ids: employeeIds } : { reason }),
};

export default payrollRunApi;
