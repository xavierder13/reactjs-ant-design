import axios from '../../api/axiosInstance';

// Manual payroll adjustments — vueportal PayrollAdjustmentController +
// PayrollAdjustmentService (payroll_adjustment.maintenance; Administrator
// bypasses). No approval; Open → Applied (payroll run) | Cancelled.
// - getAll({ search, status, adjustment_type, payroll_cutoff_id, branch_id, page,
//   per_page }) → { payroll_adjustments: paginator of { id, employee_id, employee_code,
//   last_name, first_name, middle_name, active, branch, adjustment_type,
//   other_type, other_specify, allowance_type_name, taxable (0|1), adjustment, period_from, period_to, amount, status, compensation_id,
//   cutoff_code, cutoff_from, cutoff_to } } (payroll-adjustment-list).
// - getOptions() → { types: { type: 'Earning'|'Deduction'|null }, other_types:
//   [{ name, adjustment: 'Earning'|'Deduction'|null, taxable: true|false|
//   'allowance'|null }], allowance_types: [{ id, code, name, taxable,
//   de_minimis, active }], adjustments,
//   statuses, cutoffs, next_cutoff_id, branches }.
// - show(id) → { payroll_adjustment: { …, computation, reason, cancel_reason, employee,
//   cutoff, compensation, creator, updater } }.
// - suggestions() → { suggestions: [{ compensation_id, employee, previous
//   { effective_date, pay_basis, basic_rate }, version { …, created_at },
//   adjustment_type, adjustment, period_from, period_to, amount (null = pay basis
//   changed, compute by hand), computation }] } (payroll-adjustment-create).
// - create { employee_id, adjustment_type, other_type, allowance_type_id,
//   other_specify, taxable (Others (specify) only), adjustment, period_from, period_to,
//   amount, payroll_cutoff_id, compensation_id, computation, reason } /
//   update(id, same without employee_id / compensation_id) → 422 bag or
//   { message } ("… is always a deduction", "Cut-off … has ended").
//   cancel(id, reason), delete(id), dismiss(compensationId, reason).
const payrollAdjustmentApi = {
  getAll:      (params)              => axios.post('/payroll_adjustment/index', params),
  getOptions:  ()                    => axios.post('/payroll_adjustment/options'),
  show:        (id)                  => axios.post(`/payroll_adjustment/show/${id}`),
  suggestions: ()                    => axios.post('/payroll_adjustment/suggestions'),
  create:      (payload)             => axios.post('/payroll_adjustment/store', payload),
  update:      (id, payload)         => axios.post(`/payroll_adjustment/update/${id}`, payload),
  cancel:      (id, reason)          => axios.post(`/payroll_adjustment/cancel/${id}`, { reason }),
  delete:      (id)                  => axios.post(`/payroll_adjustment/delete/${id}`),
  dismiss:     (compensationId, reason) => axios.post('/payroll_adjustment/dismiss', { compensation_id: compensationId, reason }),
};

export default payrollAdjustmentApi;
