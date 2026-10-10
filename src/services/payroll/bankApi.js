import axios from '../../api/axiosInstance';

// Banks payroll accounts are held at — vueportal BankController
// (bank_account.maintenance; Administrator bypasses).
// - getAll() → { banks: [{ id, code, name, active, remarks, employees_count }] }
//   (bank-list).
// - create / update(id) { code, name, active, remarks } → 422 bag (code
//   unique; letters, digits, - and _). delete(id) → 422 { message } when an
//   account or Payroll Settings uses it.
const bankApi = {
  getAll: ()            => axios.post('/bank/index'),
  create: (payload)     => axios.post('/bank/store', payload),
  update: (id, payload) => axios.post(`/bank/update/${id}`, payload),
  delete: (id)          => axios.post(`/bank/delete/${id}`),
};

export default bankApi;
