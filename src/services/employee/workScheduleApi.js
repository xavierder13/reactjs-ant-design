import axios from "../../api/axiosInstance";

// Employee Master Data's Work Schedule sub-record — new module (no
// vueportal Vue reference to port from; this is new master data, not a
// port). Backend: vueportal routes/api.php, prefix
// `employee_master_data/work_schedule`, backed by
// `EmployeeWorkScheduleController` / `App\EmployeeWorkSchedule`
// (`employee_work_schedules` table). Records an employee's work-schedule
// history (rest day + time of duty), versioned by `effective_date` — this
// is master data, not attendance itself: the actual clock in/out logs
// stay on the read-only Attendance tab (BioBridge). Intended to later
// feed late/absence computation and the KPI Attendance component (see
// `AttendanceService`, currently a stub) by giving that computation a
// schedule to compare punches against — that comparison isn't built yet,
// this is just the record-management side.
//
// Same shape as offboardingApi.js/nteApi.js's sibling sub-modules:
// `index()` is a global cross-employee queue, not used by this tab — the
// tab reads `work_schedules` off the employee record itself
// (`EmployeeMasterDataController@index()`'s eager-loads). create/update
// are plain JSON (no file attachments on this record, unlike Offboarding/
// NTE/Disciplinary).
const workScheduleApi = {
  // POST /api/employee_master_data/work_schedule/store
  // body: { employee_id, effective_date (YYYY-MM-DD), rest_day (Sunday..Saturday),
  //         time_in (HH:mm), time_out (HH:mm), remarks? }
  create: (payload) => axios.post('/employee_master_data/work_schedule/store', payload),

  // POST /api/employee_master_data/work_schedule/update/:id (same fields)
  update: (id, payload) => axios.post(`/employee_master_data/work_schedule/update/${id}`, payload),

  // POST /api/employee_master_data/work_schedule/delete
  // body: { work_schedule_id }
  remove: (workScheduleId) => axios.post('/employee_master_data/work_schedule/delete', { work_schedule_id: workScheduleId }),

  // POST /api/employee_master_data/work_schedule/template/download —
  // returns an .xls blob. Columns: employee_code, effective_date,
  // rest_day, time_in, time_out, remarks — matches EmployeeWorkScheduleController::import()'s
  // expected column order exactly.
  templateDownload: () => axios.post('/employee_master_data/work_schedule/template/download', {}, { responseType: 'blob' }),

  // POST /api/employee_master_data/work_schedule/import (multipart, field
  // "file"). Same 200-with-errors-body contract as offboardingApi's
  // sibling modules — not a 422: check `data.success`/`error_column`/
  // `error_row_data`+`field_values`/`error_empty` on the response, not
  // just the HTTP status. See ImportDataModal.jsx.
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/employee_master_data/work_schedule/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default workScheduleApi;
