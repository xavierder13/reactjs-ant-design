import axios from '../../api/axiosInstance';

// Retroactive pay adjustments — vueportal RetroAdjustmentController +
// RetroService (retro.maintenance; Administrator bypasses). No approval;
// Open → Applied (payroll run, later) | Cancelled.
// - getAll({ search, status, retro_type, payroll_cutoff_id, branch_id, page,
//   per_page }) → { retros: paginator of { id, employee_id, employee_code,
//   last_name, first_name, middle_name, active, branch, retro_type,
//   adjustment, period_from, period_to, amount, status, compensation_id,
//   cutoff_code, cutoff_from, cutoff_to } } (retro-list).
// - getOptions() → { types: { type: 'Earning'|'Deduction'|null }, adjustments,
//   statuses, cutoffs, next_cutoff_id, branches }.
// - show(id) → { retro: { …, computation, reason, cancel_reason, employee,
//   cutoff, compensation, creator, updater } }.
// - suggestions() → { suggestions: [{ compensation_id, employee, previous
//   { effective_date, pay_basis, basic_rate }, version { …, created_at },
//   retro_type, adjustment, period_from, period_to, amount (null = pay basis
//   changed, compute by hand), computation }] } (retro-create).
// - create { employee_id, retro_type, adjustment, period_from, period_to,
//   amount, payroll_cutoff_id, compensation_id, computation, reason } /
//   update(id, same without employee_id / compensation_id) → 422 bag or
//   { message } ("… is always a deduction", "Cut-off … has ended").
//   cancel(id, reason), delete(id), dismiss(compensationId, reason).
const retroApi = {
  getAll:      (params)              => axios.post('/retro/index', params),
  getOptions:  ()                    => axios.post('/retro/options'),
  show:        (id)                  => axios.post(`/retro/show/${id}`),
  suggestions: ()                    => axios.post('/retro/suggestions'),
  create:      (payload)             => axios.post('/retro/store', payload),
  update:      (id, payload)         => axios.post(`/retro/update/${id}`, payload),
  cancel:      (id, reason)          => axios.post(`/retro/cancel/${id}`, { reason }),
  delete:      (id)                  => axios.post(`/retro/delete/${id}`),
  dismiss:     (compensationId, reason) => axios.post('/retro/dismiss', { compensation_id: compensationId, reason }),
};

export default retroApi;
