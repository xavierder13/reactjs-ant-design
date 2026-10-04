import axios from '../../api/axiosInstance';

// Backend: vueportal PositionController, prefix `position`
// (position.maintenance → position-list/-create/-edit/-delete).
// - getAll()  → { positions: [{ id, name, rank_id, cost_center, department_id,
//                   rank, department,
//                   required_employees: [{ branch_id, quantity, branch }],
//                   subordinates: [{ position_sub_id }] }],
//                 ranks, branches (by name), departments }
// - create/update payload: { name (unique), rank_id, cost_center,
//   department_id, branchRequirement: [{ branch_id, quantity }],
//   position_subordinates: [position ids] }. Both arrays must be sent (the
//   controller loops over them unguarded). Update upserts each branch's
//   quantity and replaces the subordinate set.
// - Validation failures are HTTP 200 with a `{ field: [messages] }` bag
//   (branch rows keyed `branchRequirement.<index>.quantity`); success is
//   `{ success: '<message>', position }`.
// - Delete also removes its subordinate and branch-requirement rows; it fails
//   (500) while a KPI template/evaluation still references the position.
const positionApi = {
  getAll: ()            => axios.get('/position/index'),
  create: (payload)     => axios.post('/position/store', payload),
  update: (id, payload) => axios.post(`/position/update/${id}`, payload),
  delete: (id)          => axios.post('/position/delete', { position_id: id }),
};

export default positionApi;
