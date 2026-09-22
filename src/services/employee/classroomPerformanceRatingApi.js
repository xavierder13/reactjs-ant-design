import axios from "../../api/axiosInstance";

// Employee Master Data's "Classroom Performance Rating" sub-record.
// Route source of truth: vueportal routes/api.php, prefix
// `employee_master_data/classroom_performance_rating`. No `getAll` here —
// EmployeeClassroomPerformanceRatingController has no `index()` method;
// read `classroom_performance_ratings` off the employee record itself
// (eager-loaded on every `/employee_master_data/index` row).
//
// NOTE: `GET .../classroom_performance_rating/import` and
// `.../template/download` routes exist but the controller has no
// `import()`/`template_download()` methods (confirmed by reading the
// controller directly) — a pre-existing vueportal bug. Not wired here.
const classroomPerformanceRatingApi = {
  // POST /api/employee_master_data/classroom_performance_rating/store
  // body: { employee_id, department, grade } — "department" is really the
  // mentor/department name text field (the backend's own validation
  // message calls it "Mentor" despite the field being named `department`).
  create: (payload) => axios.post('/employee_master_data/classroom_performance_rating/store', payload),

  // POST /api/employee_master_data/classroom_performance_rating/update/:id
  // body: { department, grade }
  update: (id, payload) => axios.post(`/employee_master_data/classroom_performance_rating/update/${id}`, payload),

  // POST /api/employee_master_data/classroom_performance_rating/delete
  // body: { performance_id, employee_id }
  remove: (performanceId, employeeId) => axios.post('/employee_master_data/classroom_performance_rating/delete', { performance_id: performanceId, employee_id: employeeId }),
};

export default classroomPerformanceRatingApi;
