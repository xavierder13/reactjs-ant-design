import axios from '../../api/axiosInstance';

// Deduction types — vueportal DeductionTypeController (deduction.maintenance;
// Administrator bypasses).
// - getAll() → { types: [{ id, code, name, category, active, remarks,
//   deductions_count }], categories } (deduction-type-list).
// - create / update(id) { code, name, category, active, remarks } → 422 bag
//   (code unique, saved upper-case). delete(id) → 422 { message } when
//   deductions use it ("set it inactive instead").
const deductionTypeApi = {
  getAll:  ()            => axios.post('/deduction_type/index'),
  create:  (payload)     => axios.post('/deduction_type/store', payload),
  update:  (id, payload) => axios.post(`/deduction_type/update/${id}`, payload),
  delete:  (id)          => axios.post(`/deduction_type/delete/${id}`),
};

export default deductionTypeApi;
