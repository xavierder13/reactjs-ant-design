import axios from '../../api/axiosInstance';

// Allowance types — vueportal AllowanceTypeController (allowance.maintenance;
// Administrator bypasses).
// - getAll() → { types: [{ id, code, name, taxable, de_minimis,
//   de_minimis_limit, de_minimis_period, active, remarks, allowances_count }],
//   periods: ['Month', 'Semester', 'Year'] } (allowance-type-list).
// - create / update(id) { code, name, taxable, de_minimis, de_minimis_limit,
//   de_minimis_period, active, remarks } → 422 bag (code unique; limit and
//   period required when de minimis — a de minimis type is saved
//   non-taxable). delete(id) → 422 { message } when used.
const allowanceTypeApi = {
  getAll: ()            => axios.post('/allowance_type/index'),
  create: (payload)     => axios.post('/allowance_type/store', payload),
  update: (id, payload) => axios.post(`/allowance_type/update/${id}`, payload),
  delete: (id)          => axios.post(`/allowance_type/delete/${id}`),
};

export default allowanceTypeApi;
