import axios from '../../api/axiosInstance';

// Backend: vueportal EmployeeDashboardController@summary + EmployeeDashboardService,
// gated by `hr-payroll-dashboard` (EmployeeDashboardMaintenance). Aggregated
// counts only — no employee rows.
// POST /employee_dashboard/summary  body: { branch_id?, department_id? }
// → { success, dashboard: {
//      as_of,
//      headcount: { active, regular, probationary, probationary_pct, female, male,
//                   avg_age, avg_tenure_years, unknown_age },
//      composition: { branch, department, rank, employment_type, gender, age, tenure:
//                     [{ label, count }] },   // age/tenure in band order, others by count desc
//      movement: { months: [{ month, label, hires, separations, net, headcount_start,
//                             headcount_end, turnover_rate }],   // last 12, oldest first
//                  totals: { hires, separations, net, avg_headcount, turnover_rate } },
//      attrition: { from, to, separations,          // same window/count as movement totals
//                   by_type: [{ label: Voluntary|Involuntary|'Other / not specified', count, pct, early }],
//                   by_reason: [{ label, type, count }],   // latest offboarding reason, count desc
//                   early: { months, count, pct, no_hire_date },   // left within probation
//                   turnover_by: { branch, department, position: [{ label, separations, voluntary,
//                                  early, headcount, avg_headcount, turnover_rate|null }] } },
//      regularization: { probation_months, due_days, probationary, overdue, due_soon, on_track,
//                        no_hire_date, by_branch: [{ label, overdue, due_soon, on_track }] },
//      filters: { branches: [{ id, name }], departments: [{ id, name }] } } }
const workforceDashboardApi = {
  getSummary: (filters = {}) => axios.post('/employee_dashboard/summary', filters),
};

export default workforceDashboardApi;
