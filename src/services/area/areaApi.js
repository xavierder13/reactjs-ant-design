import axios from '../../api/axiosInstance';

// Backend: vueportal AreaController (+ AreaService). POST-only, matching
// Manpower Request's convention.
// - getAll()   → { areas: [{ id, code, name, description,
//                  area_branches: [{ branch_id, branch: { id, code, name } }],
//                  hr_heads: [{ employee_id, employee: { id, employee_code, full_name,
//                               active, branch: { name }, position: { name } } }] }] }
// - getCreate() → { branches: [{ id, code, name, area_id, area_name }] } —
//                  area_id/area_name = the area a branch is already mapped to
// - create/update payload: { code, name, description, branch_ids: [] } — HR
//   heads are not touched by an area save.
// - assignEmployee(employeeId, areaIds) → { areas } — replace-all set of
//   areas that employee heads ([] = unassign from every area).
const areaApi = {
  getAll:    ()            => axios.post('/area/index'),
  getCreate: ()            => axios.post('/area/create'),
  getById:   (id)          => axios.post(`/area/edit/${id}`),
  create:    (payload)     => axios.post('/area/store', payload),
  update:    (id, payload) => axios.post(`/area/update/${id}`, payload),
  delete:    (id)          => axios.post(`/area/delete/${id}`),
  assignEmployee: (employeeId, areaIds) => axios.post('/area/assign_employee', { employee_id: employeeId, area_ids: areaIds }),
};

export default areaApi;
