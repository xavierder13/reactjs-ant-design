import axios from '../../api/axiosInstance';

// 13th-month pay (PD 851) — vueportal ThirteenthMonthController
// (thirteenth_month.maintenance: thirteenth-month-list / -generate /
// -approve / -cancel; Administrator bypasses). One batch per year: Draft
// (generate again as needed) → Submit → Pending (the "13th Month Pay" Access
// Chart, same rules as the payroll run) → Approved on the last approval |
// Disapproved → back to Draft; Cancel a Draft. Basic salary earned
// from the year's approved payrolls up to earned_through, the rest of the
// year projected at the monthly rate in force (daily-paid not projected).
// - getAll() → { runs: [{ id, year, status, earned_through, pay_date,
//   employee_count, total_amount, remarks, generated_at, generator,
//   approved_at, approver }] }.
// - show(id) → { run (+ submitter, actor, current_level, submitted_at,
//   acted_at, action_remarks, rollbacker, rolled_back_at, rollback_reason,
//   paid_on — the pay date, else Dec 24), approval (ApprovalProcedure::status — levels,
//   history, can_approve), pays: [{ id, employee_code, full_name, branch,
//   pay_basis, basic_earned, basic_projected, amount, taxable_excess, months
//   { 'YYYY-MM': basic }, warnings, approved (released — locked), round }],
//   rounds: [{ round, employees, total_amount, earned_through, submitted_at,
//   submitter, approved_at, approver }], not_approved { employees,
//   total_amount } }. An approved batch takes only employees not in it
//   (generate with employee_ids): it goes back to Draft and is approved
//   again as its next round; approved lines stay locked and unchanged.
// - generate({ year, pay_date, remarks, employee_ids? }) (Draft only):
//   employee_ids = only those again (a new batch gets just them; on a Draft
//   the others keep their lines; refused when payrolls were approved since
//   the Draft was made — then generate everyone) · candidates(year) →
//   { run: { id, status, earned_through } | null, employees: [{ id,
//   employee_code, full_name, branch, position, in_run, eligible,
//   approved }] } (thirteenth-month-generate) · submit(id) ·
//   approve(id, remarks) · disapprove(id, remarks) (not the submitter) ·
//   cancel(id, reason) (no approved lines left) · rollback(id, reason,
//   employeeIds?) (thirteenth-month-rollback; null = every approved one;
//   before the pay date — show(id).run.paid_on) · download(id) → .xls · bank(id) → same shape as
//   payrollReportApi.bank (preview) · bankDownload(id, sourceId) → one paying
//   account's .csv (approved) · paidFrom(id, { source_account_id,
//   match_employee_bank }) — until approved (thirteenth-month-generate).
const thirteenthMonthApi = {
  getAll:       ()            => axios.post('/thirteenth_month/index'),
  show:         (id)          => axios.post(`/thirteenth_month/show/${id}`),
  generate:     (payload)     => axios.post('/thirteenth_month/generate', payload),
  candidates:   (year)        => axios.post('/thirteenth_month/candidates', { year }),
  submit:       (id)          => axios.post(`/thirteenth_month/submit/${id}`),
  approve:      (id, remarks) => axios.post(`/thirteenth_month/approve/${id}`, { remarks }),
  disapprove:   (id, remarks) => axios.post(`/thirteenth_month/disapprove/${id}`, { remarks }),
  cancel:       (id, reason)  => axios.post(`/thirteenth_month/cancel/${id}`, { reason }),
  rollback:     (id, reason, employeeIds) => axios.post(`/thirteenth_month/rollback/${id}`, employeeIds ? { reason, employee_ids: employeeIds } : { reason }),
  // round (optional): one approval round's lines only (a round's bank CSV works while the batch is back in Draft)
  download:     (id, round)   => axios.post(`/thirteenth_month/download/${id}`, round ? { round } : {}, { responseType: 'blob' }),
  bank:         (id, round)   => axios.post(`/thirteenth_month/bank/${id}`, round ? { round } : {}),
  bankDownload: (id, sourceId, round) => axios.post(`/thirteenth_month/bank/download/${id}`, round ? { source_id: sourceId, round } : { source_id: sourceId }, { responseType: 'blob' }),
  // not-yet-approved lines out of a Draft (thirteenth-month-generate)
  remove:       (id, employeeIds) => axios.post(`/thirteenth_month/remove/${id}`, { employee_ids: employeeIds }),
  paidFrom:     (id, payload) => axios.post(`/thirteenth_month/paid_from/${id}`, payload),
};

export default thirteenthMonthApi;
