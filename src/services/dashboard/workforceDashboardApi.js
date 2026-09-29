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
//      filters: { branches: [{ id, name }], departments: [{ id, name }] } } }
const workforceDashboardApi = {
  getSummary: (filters = {}) => axios.post('/employee_dashboard/summary', filters),
};

export default workforceDashboardApi;
