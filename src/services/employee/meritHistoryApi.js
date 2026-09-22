import axios from "../../api/axiosInstance";

// Employee Master Data's "Merit History" sub-record.
// Route source of truth: vueportal routes/api.php, prefix
// `employee_master_data/merit_history`. No `getAll` here —
// EmployeeMeritHistoryController has no `index()` method; read
// `merit_histories` off the employee record itself (eager-loaded on every
// `/employee_master_data/index` row).
const meritHistoryApi = {
  // POST /api/employee_master_data/merit_history/store
  // body: { employee_id, merit_date (YYYY-MM-DD), salary }
  create: (payload) => axios.post('/employee_master_data/merit_history/store', payload),

  // POST /api/employee_master_data/merit_history/update/:id
  // body: { employee_id, merit_date, salary }
  update: (id, payload) => axios.post(`/employee_master_data/merit_history/update/${id}`, payload),

  // POST /api/employee_master_data/merit_history/delete
  // body: { merit_history_id, employee_id }
  remove: (meritHistoryId, employeeId) => axios.post('/employee_master_data/merit_history/delete', { merit_history_id: meritHistoryId, employee_id: employeeId }),
};

export default meritHistoryApi;
