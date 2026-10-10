import axios from '../../api/axiosInstance';

// Employee payroll bank accounts — vueportal EmployeeBankAccountController +
// BankAccountService (bank_account.maintenance; Administrator bypasses). The
// account with the latest effective_from on or before the credit date is the
// one the bank file credits; a new account = a new line (history stays). No
// approval.
// - getAll({ search, bank_id, branch_id, employee_id, state: 'current'
//   (default, in force today) | 'upcoming' | 'history' | 'missing' (active
//   salaried employees without one — account fields null, id null), page,
//   per_page }) → { accounts: paginator of { id, employee_id, bank_id,
//   account_name, account_no, effective_from, remarks, employee_code,
//   last_name, first_name, middle_name, active, branch, bank_code,
//   bank_name } } (bank-account-list).
// - getOptions() → { banks, branches }.
// - show(id) → { account: { …, employee { full_name }, bank } }.
// - create { employee_id, bank_id, account_name, account_no, effective_from,
//   remarks } / update(id, same without employee_id) → 422 bag or
//   { message } (one account per employee per effective_from).
//   delete(id).
// - templateDownload({ document_status, branch_id, position_id,
//   employee_ids }) → .xls blob (bank-account-template-download);
//   import(file) → the shared 200 contract (success | error_column |
//   error_row_data + field_values | error_empty | error) — see
//   ImportDataModal.jsx (bank-account-import).
const bankAccountApi = {
  getAll:     (params)      => axios.post('/bank_account/index', params),
  getOptions: ()            => axios.post('/bank_account/options'),
  show:       (id)          => axios.post(`/bank_account/show/${id}`),
  create:     (payload)     => axios.post('/bank_account/store', payload),
  update:     (id, payload) => axios.post(`/bank_account/update/${id}`, payload),
  delete:     (id)          => axios.post(`/bank_account/delete/${id}`),
  templateDownload: (params) => axios.post('/bank_account/template/download', params, { responseType: 'blob' }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/bank_account/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default bankAccountApi;
