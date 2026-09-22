import axios from "../../api/axiosInstance";

// Employee Master Data's "Monthly Key Performance" sub-record.
// Route source of truth: vueportal routes/api.php, prefix
// `employee_master_data/key_performance`. There is deliberately NO
// `getAll`/index call here even though `GET .../key_performance/index`
// exists as a route — EmployeeKeyPerformanceController has no `index()`
// method at all (confirmed by reading the controller directly; calling
// that route would throw). The real data source is the `monthly_key_performances`
// array already eager-loaded onto every row of `/employee_master_data/index`
// (see EmployeeMasterDataController::getEmployees()) — read it off the
// employee record itself, never fetch it separately.
//
// Unlike every other sub-module here, `store` is a **batch-per-year**
// action: it creates all 12 months of a given year in one call (matching
// the "Add Period" button in the Vue reference), not a single row.
// `update` only ever changes one row's `grade`. `delete` removes an
// entire year's 12 rows at once, keyed by `employee_id` + `period` (the
// year) — not a single record id.
const keyPerformanceApi = {
  // POST /api/employee_master_data/key_performance/store
  // body: { employee_id, monthly_key_performances: [{ year, month, grade }] }
  create: (payload) => axios.post('/employee_master_data/key_performance/store', payload),

  // POST /api/employee_master_data/key_performance/update/:id
  // body: { grade } — employee_id/year/month are not editable per vueportal's
  // own controller (commented out server-side), only grade is.
  update: (id, payload) => axios.post(`/employee_master_data/key_performance/update/${id}`, payload),

  // POST /api/employee_master_data/key_performance/delete
  // body: { employee_id, period } — deletes the whole year (period), not one row.
  remove: (employeeId, period) => axios.post('/employee_master_data/key_performance/delete', { employee_id: employeeId, period }),
};

export default keyPerformanceApi;
