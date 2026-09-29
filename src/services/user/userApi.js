import axios from '../../api/axiosInstance';

// Backend: vueportal UserController, prefix `user`, UserMaintenance
// middleware (user-list / user-create / user-edit / user-delete).
// Like RoleController, validation failures come back as HTTP 200 with the
// raw Laravel error bag ({ field: [messages] }) — check `data.success`.
// - getAll() → { users: [{ id, name, email, active ('Y' | 'N' | '' — login
//     only blocks 'N'), branch_id, position_id, last_login,
//     branch: { id, name }, position: { id, name }, roles: [{ id, name }] }],
//     roles: [{ id, name }], branches: [{ id, name }], positions: [{ id, name }] }
//   The form's options come from here too: /user/create needs user-create,
//   which an editor holding only user-edit wouldn't have.
// - create payload: { name, email, password, confirm_password, branch_id,
//     position_id, active: 'Y' | 'N', roles: [role names] }
// - update payload: same minus email (ignored server-side); send password +
//     confirm_password only to change it. Roles are replaced with `roles`.
//     → { success, user, user_roles, user_permissions } (roles/permissions
//     of the edited user).
// - remove(): 403 for the Administrator account (id 1).
const userApi = {
  getAll:  ()            => axios.get('/user/index'),
  create:  (payload)     => axios.post('/user/store', payload),
  update:  (id, payload) => axios.post(`/user/update/${id}`, payload),
  remove:  (userId)      => axios.post('/user/delete', { user_id: userId }),
};

export default userApi;
