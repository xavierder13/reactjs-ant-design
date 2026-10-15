import axios from '../../api/axiosInstance';

// Payroll Assistant (no AI) — vueportal PayrollAssistantController +
// PayrollAssistantService (payroll_assistant.maintenance; Administrator
// bypasses). payroll-assistant = use it; payroll-assistant-manage = edit
// topics and see unanswered searches.
// - search({ q }) → { topics: [{ id, code, title, category, summary, check,
//   score }] } best first (logged; no match = an unanswered search).
// - options() → { categories, topics (active, brief), cutoffs: [{ id, code,
//   date_from, date_to, pay_date }], checks: [{ code, label, needs: 'cutoff'
//   | 'year', outcomes }] }.
// - show(id) → { topic: { …, tree: { start, nodes: { id: { q, options:
//   [{ label, next }] } | { title, steps: [{ text, link?, link_label? }],
//   note? } } }, check, outcomes: { outcome: node id } } }.
// - check({ check, employee_id, payroll_cutoff_id | year }) → { result: {
//   facts: [{ label, value, level: ok | warn | bad | info }], outcome } } —
//   read-only, within the user's own permissions; 422 { message }.
// - topics: index() → { topics } (all, incl. inactive); unanswered() →
//   { searches: [{ query, times, last_asked }] }; create / update(id) {
//   code, title, category, keywords, summary, tree, check, outcomes, active,
//   sort_order } → 422 bag or { message } (the tree is checked); delete(id).
const payrollAssistantApi = {
  search:  (q)       => axios.post('/payroll_assistant/search', { q }),
  options: ()        => axios.post('/payroll_assistant/options'),
  show:    (id)      => axios.post(`/payroll_assistant/show/${id}`),
  check:   (payload) => axios.post('/payroll_assistant/check', payload),
  topics:     ()            => axios.post('/payroll_assistant/topics/index'),
  unanswered: ()            => axios.post('/payroll_assistant/topics/unanswered'),
  create:     (payload)     => axios.post('/payroll_assistant/topics/store', payload),
  update:     (id, payload) => axios.post(`/payroll_assistant/topics/update/${id}`, payload),
  delete:     (id)          => axios.post(`/payroll_assistant/topics/delete/${id}`),
};

export default payrollAssistantApi;
