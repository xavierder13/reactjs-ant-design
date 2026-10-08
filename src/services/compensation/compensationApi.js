import axios from '../../api/axiosInstance';

// Salary history — vueportal EmployeeCompensationController +
// CompensationService (compensation.maintenance; Administrator bypasses).
// Versions by effective date, no approval; the salary in force on a date is
// the latest version effective on or before it.
// - getAll({ search, branch_id, pay_basis, without_salary, status: 1|0|-1,
//   page, per_page }) → { employees: paginator of { id, employee_code,
//   last_name, first_name, middle_name, active, branch, position,
//   compensation_id, effective_date, pay_basis, basic_rate, change_type,
//   next_effective_date } } (compensation-list). Salary fields are null for
//   an employee with no salary yet.
// - getOptions() → { pay_bases, change_types, branches: [{ id, name }] }.
// - history(employeeId) → { employee { id, employee_code, name,
//   date_employed }, current_id, versions: [{ id, effective_date,
//   pay_basis, basic_rate, change_type, reason, creator { name }, updater
//   { name }, created_at, updated_at }] } newest first.
// - create { employee_id, effective_date, pay_basis, basic_rate,
//   change_type, reason } / update(id, same without employee_id) → 422 bag,
//   or 422 { message } ("already has a salary effective on …", "before the
//   date employed"). delete(id).
// - templateDownload({ document_status, branch_id }) → .xls blob; import(file)
//   → the shared 200 contract (success | error_column | error_row_data +
//   field_values | error_empty | error) — see ImportDataModal.jsx.
const compensationApi = {
  getAll:     (params)      => axios.post('/compensation/index', params),
  getOptions: ()            => axios.post('/compensation/options'),
  history:    (employeeId)  => axios.post(`/compensation/history/${employeeId}`),
  create:     (payload)     => axios.post('/compensation/store', payload),
  update:     (id, payload) => axios.post(`/compensation/update/${id}`, payload),
  delete:     (id)          => axios.post(`/compensation/delete/${id}`),
  templateDownload: (params) => axios.post('/compensation/template/download', params, { responseType: 'blob' }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/compensation/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default compensationApi;
