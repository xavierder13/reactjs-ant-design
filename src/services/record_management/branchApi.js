import axios from '../../api/axiosInstance';

// Backend: vueportal BranchController, prefix `branch` (branch.maintenance →
// branch-list/-create/-edit/-delete).
// - getAll()  → { branches: [{ id, name, code, bm_oic, company_id, company }],
//                 companies: [{ id, name, active }] } (branches ordered by name)
// - create/update payload: { name (unique), code (unique), bm_oic,
//   company_id (required) }
// - Validation failures are HTTP 200 with a `{ field: [messages] }` bag;
//   success is `{ success: '<message>', branch }`.
const branchApi = {
  getAll: ()            => axios.get('/branch/index'),
  create: (payload)     => axios.post('/branch/store', payload),
  update: (id, payload) => axios.post(`/branch/update/${id}`, payload),
  delete: (id)          => axios.post('/branch/delete', { branch_id: id }),
};

export default branchApi;
