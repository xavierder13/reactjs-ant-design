import axios from '../../api/axiosInstance';

// Backend: vueportal DepartmentController, prefix `department`
// (department.maintenance → department-list/-create/-edit/-delete).
// - getAll()  → { departments: [{ id, name, division_id, active, division }],
//                 divisions: [{ id, name }] }
// - create/update payload: { department (unique name), division_id,
//   active: 'Y'|'N' }. The controller's division rule is keyed `division`
//   (and malformed), so it never runs — division is required client-side
//   only. Never send a `division` key: that would trigger the broken rule.
// - Validation failures are HTTP 200 with a `{ field: [messages] }` bag;
//   success is `{ success: '<message>', department }`.
const departmentApi = {
  getAll: ()            => axios.get('/department/index'),
  create: (payload)     => axios.post('/department/store', payload),
  update: (id, payload) => axios.post(`/department/update/${id}`, payload),
  delete: (id)          => axios.post('/department/delete', { department_id: id }),
};

export default departmentApi;
