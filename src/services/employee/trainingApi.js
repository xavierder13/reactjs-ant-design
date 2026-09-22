import axios from "../../api/axiosInstance";

// Employee Master Data's "Training" sub-record.
// Route source of truth: vueportal routes/api.php, prefix
// `employee_master_data/training`. No `getAll` here —
// EmployeeTrainingController has no `index()` method; read `trainings`
// off the employee record itself (eager-loaded on every
// `/employee_master_data/index` row).
const trainingApi = {
  // POST /api/employee_master_data/training/store
  // body: { employee_id, mentor, grade, kpi, remarks }
  create: (payload) => axios.post('/employee_master_data/training/store', payload),

  // POST /api/employee_master_data/training/update/:id
  // body: { mentor, grade, kpi, remarks }
  update: (id, payload) => axios.post(`/employee_master_data/training/update/${id}`, payload),

  // POST /api/employee_master_data/training/delete
  // body: { training_id, employee_id }
  remove: (trainingId, employeeId) => axios.post('/employee_master_data/training/delete', { training_id: trainingId, employee_id: employeeId }),
};

export default trainingApi;
