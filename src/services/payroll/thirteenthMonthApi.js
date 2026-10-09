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
//   acted_at, action_remarks), approval (ApprovalProcedure::status — levels,
//   history, can_approve), pays: [{ id, employee_code, full_name, branch,
//   pay_basis, basic_earned, basic_projected, amount, taxable_excess, months
//   { 'YYYY-MM': basic }, warnings }] }.
// - generate({ year, pay_date, remarks }) (Draft only) · submit(id) ·
//   approve(id, remarks) · disapprove(id, remarks) (not the submitter) ·
//   cancel(id, reason) · download(id) → .xls · bank(id) →
//   { credit, missing, total } (preview) · bankDownload(id) → .csv (approved).
const thirteenthMonthApi = {
  getAll:       ()            => axios.post('/thirteenth_month/index'),
  show:         (id)          => axios.post(`/thirteenth_month/show/${id}`),
  generate:     (payload)     => axios.post('/thirteenth_month/generate', payload),
  submit:       (id)          => axios.post(`/thirteenth_month/submit/${id}`),
  approve:      (id, remarks) => axios.post(`/thirteenth_month/approve/${id}`, { remarks }),
  disapprove:   (id, remarks) => axios.post(`/thirteenth_month/disapprove/${id}`, { remarks }),
  cancel:       (id, reason)  => axios.post(`/thirteenth_month/cancel/${id}`, { reason }),
  download:     (id)          => axios.post(`/thirteenth_month/download/${id}`, {}, { responseType: 'blob' }),
  bank:         (id)          => axios.post(`/thirteenth_month/bank/${id}`),
  bankDownload: (id)          => axios.post(`/thirteenth_month/bank/download/${id}`, {}, { responseType: 'blob' }),
};

export default thirteenthMonthApi;
