import axios from '../../api/axiosInstance';

// Employee contribution profiles — vueportal EmployeeContributionController
// + ContributionService (contribution.maintenance; Administrator bypasses).
// Per agency: Computed (table in force) | Fixed (amounts here) | Exempt.
// - getAll({ search, branch_id, status: 1|0|-1, mode: 'Fixed'|'Exempt',
//   missing: 'sss'|'philhealth'|'pagibig'|'tin', mwe, page, per_page }) →
//   { employees: paginator of { id, employee_code, last_name, first_name,
//   middle_name, active, employment_type, sss_no, philhealth_no, pagibig_no,
//   tin_no, branch, position, profile_id, sss_mode, philhealth_mode,
//   pagibig_mode, tax_mode, minimum_wage_earner (0|1),
//   pagibig_ee_additional } } (contribution-profile-list).
// - getOptions() → { modes, agencies, branches }.
// - show(employeeId) → { employee { id, employee_code, name,
//   employment_type, sss_no, philhealth_no, pagibig_no, tin_no }, profile,
//   updated_by, updated_at }.
// - save(employeeId, { sss_mode, sss_ee_fixed, sss_er_fixed, philhealth_…,
//   pagibig_…, pagibig_ee_additional, tax_mode, tax_fixed,
//   minimum_wage_earner, remarks }) → { profile } or 422 ("SSS is Fixed —
//   give the EE and ER amounts") (contribution-profile-edit).
// - compute({ employee_id, date?, base? }) → { computation: { date, salary
//   { pay_basis, basic_rate, effective_date } | null, base, needs_base,
//   lines: [{ agency, mode, salary_credit, ee, er, ec, ee_additional,
//   table_effective_date, note }], tax { mode, taxable, tax, note },
//   totals { ee, er, ec, tax, employee_deductions }, salary_visible } }.
//   Monthly amounts. The salary in force is used only with compensation-list;
//   otherwise (or for a daily rate) needs_base → send base.
// - templateDownload({ document_status, branch_id, position_id,
//   employee_ids }) → .xls blob, every profile
//   (contribution-profile-template-download); import(file) → the shared 200
//   contract — see ImportDataModal.jsx (contribution-profile-import).
const contributionProfileApi = {
  getAll:     (params)              => axios.post('/contribution_profile/index', params),
  getOptions: ()                    => axios.post('/contribution_profile/options'),
  show:       (employeeId)          => axios.post(`/contribution_profile/show/${employeeId}`),
  save:       (employeeId, payload) => axios.post(`/contribution_profile/save/${employeeId}`, payload),
  compute:    (payload)             => axios.post('/contribution_profile/compute', payload),
  templateDownload: (params) => axios.post('/contribution_profile/template/download', params, { responseType: 'blob' }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/contribution_profile/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default contributionProfileApi;
