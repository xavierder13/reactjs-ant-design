import axios from '../../api/axiosInstance';

// Backend: vueportal BranchManpowerReportController (+ BranchManpowerReportService),
// routes under /employee_master_data/branch_manpower, all POST, gated by
// `employee-master-data-branch-manpower-export`. Separate from the legacy
// 'Branch Manpower Report' option of /employee_master_data/export, which
// vueportal's own Vue page still uses.
// - getOptions() → { areas: [{ id, code, name }], branches: [{ id, code, name,
//                    area_id, area_code, area_name }], hr_heads: [{ employee_id,
//                    employee_code, full_name, areas: string[] }],
//                    default_positions: string[], positions: string[] } —
//                    default_positions = the legacy report's column order;
//                    positions = every pickable column.
// - getReport(payload) / export(payload) — payload:
//   { as_of: 'YYYY-MM-DD', group_by: 'area' | 'branch' | 'hr_head',
//     ids: number[] (area ids / branch ids / HR head employee ids; [] = all),
//     positions: string[] (column order) }
//   getReport → { report: { as_of, first_of_month, previous_end, group_by,
//     positions: [{ name, label }],
//     groups: [{ type, id, code, name, description (HR head: their areas),
//       branches: [{ branch_id, branch_name, area_name, cells: { [position]:
//       { required, deployed, resigned, promoted, existing, ending, vacant } },
//       total }], subtotal }],
//     grand_total: { cells: { [position]: {...cell, fill_rate} }, total } } }
//   where total = { required, existing (= Ending), vacant, fill_rate, vacancy_rate }.
//   All areas / all HR heads add a last UNASSIGNED / NO HR HEAD group. A
//   branch can appear under several HR heads; grand_total counts it once.
//   export → .xlsx blob (R-5 sheet + Detailed sheet in the legacy columns).
const branchManpowerApi = {
  getOptions: ()        => axios.post('/employee_master_data/branch_manpower/options'),
  getReport:  (payload) => axios.post('/employee_master_data/branch_manpower/report', payload),
  export:     (payload) => axios.post('/employee_master_data/branch_manpower/export', payload, { responseType: 'blob' }),
};

export default branchManpowerApi;
