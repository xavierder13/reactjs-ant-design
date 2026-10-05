import axios from '../../api/axiosInstance';

// Careers portal branches (recruitment-portal `branches` — not this HRIS's
// branches; ids differ). vueportal POST /recruitment/setup/branch/<action>
// → gateway → portal BranchController as the signed-in user. Permissions:
// careers-branch-list/-create/-edit/-delete (index also allowed with
// careers-job-vacancy-create/-edit — the vacancy form lists branches).
// - getAll() → { branches: [{ id, code, name, created_at, updated_at }] } (by id)
// - create / update payload { code, name } → { success: '<message>', branch }
//   or, on validation failure, HTTP 200 { name?: [msg], code?: [msg] } (unique).
// - delete(id) → { success: '<message>' }. No in-use check (portal rule).
// Gateway refusals (no portal account / missing portal permission) → 403 { error }.
const careersBranchApi = {
  getAll: ()            => axios.post('/recruitment/setup/branch/index'),
  create: (payload)     => axios.post('/recruitment/setup/branch/store', payload),
  update: (id, payload) => axios.post(`/recruitment/setup/branch/update/${id}`, payload),
  delete: (id)          => axios.post('/recruitment/setup/branch/delete', { branch_id: id }),
};

export default careersBranchApi;
