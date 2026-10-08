import axios from '../../api/axiosInstance';

// Scheduled employee deductions — vueportal EmployeeDeductionController +
// DeductionService (deduction.maintenance; Administrator bypasses). No
// approval. Balance = total_amount − payments; zero → Fully Paid (never set
// by hand; deleting a payment reopens it).
// - getAll({ search, deduction_type_id, status, branch_id, employee_id, page,
//   per_page }) → { deductions: paginator of { id, employee_id, employee_code,
//   last_name, first_name, middle_name, active, branch, type_code, type_name,
//   category, reference_no, date_granted, total_amount, amount_per_cutoff,
//   start_cutoff, schedule, status, total_paid, balance } } (deduction-list).
// - getOptions() → { types: [{ id, code, name, category, active }], cutoffs:
//   [{ id, code, date_from, date_to, pay_date }], branches, schedules, statuses }.
// - show(id) → { deduction: { …, employee { full_name, … }, type,
//   startCutoff, total_paid, balance, payments: [{ id, payment_date,
//   amount, source, remarks, cutoff { code }, creator { name } }] } }.
// - create { employee_id, deduction_type_id, reference_no, date_granted,
//   total_amount, amount_per_cutoff, start_cutoff_id, schedule, remarks } /
//   update(id, same without employee_id) → 422 bag or { message } (Active /
//   On Hold only). hold(id) / resume(id) (deduction-edit), cancel(id, reason)
//   (deduction-cancel), delete(id) (no payments only; deduction-delete).
// - addPayment(id, { payment_date, amount, payroll_cutoff_id, remarks }) /
//   deletePayment(paymentId) (manual only) → { deduction } (deduction-payment).
const deductionApi = {
  getAll:        (params)      => axios.post('/deduction/index', params),
  getOptions:    ()            => axios.post('/deduction/options'),
  show:          (id)          => axios.post(`/deduction/show/${id}`),
  create:        (payload)     => axios.post('/deduction/store', payload),
  update:        (id, payload) => axios.post(`/deduction/update/${id}`, payload),
  hold:          (id)          => axios.post(`/deduction/hold/${id}`),
  resume:        (id)          => axios.post(`/deduction/resume/${id}`),
  cancel:        (id, reason)  => axios.post(`/deduction/cancel/${id}`, { reason }),
  delete:        (id)          => axios.post(`/deduction/delete/${id}`),
  addPayment:    (id, payload) => axios.post(`/deduction/payment/store/${id}`, payload),
  deletePayment: (paymentId)   => axios.post(`/deduction/payment/delete/${paymentId}`),
};

export default deductionApi;
