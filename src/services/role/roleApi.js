import axios from "../../api/axiosInstance";

// vueportal's RoleController returns HTTP 200 on both success and
// validation failure — success responses include a `success` key, failure
// responses are the raw Laravel validator error bag ({ name: [...] }).
// Callers must check `data.success` themselves rather than relying on a
// 422 status.
const roleApi = {
  // GET /api/role/index -> { roles: [...with permissions eager-loaded], permissions: [...catalog] }
  getAll: () => axios.get('/role/index'),

  // GET /api/role/create -> { permissions: [...catalog] } (used by the Create Role form)
  getCreateMeta: () => axios.get('/role/create'),

  // POST /api/role/edit (body: { roleid }) -> { role, permissions, rolePermissions: [ids] }
  getById: (roleid) => axios.post('/role/edit', { roleid }),

  // POST /api/role/store (body: { name, permission: [ids] })
  create: (payload) => axios.post('/role/store', payload),

  // POST /api/role/update/:id (body: { name, permission: [ids] }) — 403 if id is the Administrator role (1)
  update: (id, payload) => axios.post(`/role/update/${id}`, payload),

  // POST /api/role/delete (body: { roleid }) — 403 if roleid is the Administrator role (1)
  remove: (roleid) => axios.post('/role/delete', { roleid }),
};

export default roleApi;
