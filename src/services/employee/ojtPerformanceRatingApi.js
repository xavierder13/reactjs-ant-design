import axios from "../../api/axiosInstance";

// Employee Master Data's "OJT Performance Rating" sub-record.
// Route source of truth: vueportal routes/api.php, prefix
// `employee_master_data/ojt_performance_rating`. No `getAll` here —
// EmployeeOjtPerformanceRatingController has no `index()` method; read
// `ojt_performance_ratings` off the employee record itself (eager-loaded
// on every `/employee_master_data/index` row).
//
// NOTE: `GET .../ojt_performance_rating/import` and `.../template/download`
// routes exist but the controller has no `import()`/`template_download()`
// methods (confirmed by reading the controller directly) — a pre-existing
// vueportal bug, same class as classroomPerformanceRatingApi.js's. Not
// wired here.
const ojtPerformanceRatingApi = {
  // POST /api/employee_master_data/ojt_performance_rating/store
  // body: { employee_id, mentor, grade, kpi }
  create: (payload) => axios.post('/employee_master_data/ojt_performance_rating/store', payload),

  // POST /api/employee_master_data/ojt_performance_rating/update/:id
  // body: { mentor, grade, kpi }
  update: (id, payload) => axios.post(`/employee_master_data/ojt_performance_rating/update/${id}`, payload),

  // POST /api/employee_master_data/ojt_performance_rating/delete
  // body: { performance_id, employee_id }
  remove: (performanceId, employeeId) => axios.post('/employee_master_data/ojt_performance_rating/delete', { performance_id: performanceId, employee_id: employeeId }),
};

export default ojtPerformanceRatingApi;
