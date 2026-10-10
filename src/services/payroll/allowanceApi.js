import axios from '../../api/axiosInstance';

// Employee allowances — vueportal EmployeeAllowanceController +
// AllowanceService (allowance.maintenance; Administrator bypasses). An
// amount per cut-off / per week / per month / per day worked from effective_from to
// effective_to (null = ongoing); the same employee + type never overlaps
// ("end that one first"). No approval.
// - getAll({ search, allowance_type_id, branch_id, employee_id, state:
//   'current' (default) | 'upcoming' | 'ended' | 'all', page, per_page }) →
//   { allowances: paginator of { id, employee_id, allowance_type_id, amount,
//   basis, effective_from, effective_to, remarks, employee_code, last_name,
//   first_name, middle_name, active, branch, type_code, type_name, taxable,
//   de_minimis } } (allowance-list).
// - getOptions() → { types, bases, branches }.
// - show(id) → { allowance: { …, employee { full_name }, type } }.
// - create { employee_id, allowance_type_id, amount, basis, effective_from,
//   effective_to, remarks } / update(id, same without employee_id) → 422 bag
//   or { message }. delete(id).
// - templateDownload({ document_status, branch_id, position_id,
//   employee_ids }) → .xls blob (allowance-template-download); import(file)
//   → the shared 200 contract (success | error_column | error_row_data +
//   field_values | error_empty | error) — see ImportDataModal.jsx
//   (allowance-import).
const allowanceApi = {
  getAll:     (params)      => axios.post('/allowance/index', params),
  getOptions: ()            => axios.post('/allowance/options'),
  show:       (id)          => axios.post(`/allowance/show/${id}`),
  create:     (payload)     => axios.post('/allowance/store', payload),
  update:     (id, payload) => axios.post(`/allowance/update/${id}`, payload),
  delete:     (id)          => axios.post(`/allowance/delete/${id}`),
  templateDownload: (params) => axios.post('/allowance/template/download', params, { responseType: 'blob' }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/allowance/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default allowanceApi;
