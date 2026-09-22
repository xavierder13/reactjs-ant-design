import axios from "../../api/axiosInstance";

// vueportal's PermissionController returns HTTP 200 on both success and
// validation failure — success responses include a `success` key, failure
// responses are the raw Laravel validator error bag ({ name: [...] }).
// There is no `success`-vs-422 branch to rely on; callers must check
// `data.success` themselves. `/permission/create` and `/permission/edit`
// exist on the backend but return a Blade view / are unreachable via the
// (broken) `permission.maintenance` middleware respectively — not real
// JSON endpoints, so they are intentionally not wired here.
const permissionApi = {
  // GET /api/permission/index
  getAll: () => axios.get('/permission/index'),

  // POST /api/permission/store (body: { name })
  create: (payload) => axios.post('/permission/store', payload),

  // POST /api/permission/update/:id (body: { name })
  update: (id, payload) => axios.post(`/permission/update/${id}`, payload),

  // POST /api/permission/delete (body: { permissionid })
  remove: (permissionid) => axios.post('/permission/delete', { permissionid }),
};

export default permissionApi;
