import axios from '../../api/axiosInstance';

// My Workspace → My Clearance — vueportal MyClearanceController (auth:api,
// no permission; only the clearances of the employee linked to the account).
// - getAll() → { linked, clearances: [row as clearanceApi.getAll] } latest first.
// - getById(id) → the same payload as clearanceApi.show (clearance, items,
//   totals, approval, can); another employee's clearance is a 404.
const myClearanceApi = {
  getAll:  ()   => axios.post('/my_clearance/index'),
  getById: (id) => axios.post(`/my_clearance/show/${id}`),
};

export default myClearanceApi;
