import axios from "../../api/axiosInstance";

// Employee Master Data's read-only Attendance tab — joined server-side
// against a separate BioBridge biometric system (a distinct DB connection,
// `EmployeeMasterDataController::getAttendanceLogs()`), keyed by
// `employee_code`, NOT `employee_id`/`id` like every other sub-module in
// this app. Confirmed there is no store/update/delete for this data (it's
// raw biometric punch logs, not an editable HRIS record) — only a read
// endpoint here.
//
// Export (Attendance Log Excel download, Attendance Report print view) are
// deliberately not wired here — same scoping discipline as every other
// sub-module's import/export tooling in this app (see the
// employee-master-data skill).
const attendanceApi = {
  // POST /api/employee_master_data/attendance
  // body: { employee_code, date_from, date_to, page, items_per_page }
  // -> { attendances: <Laravel paginator: data/current_page/per_page/total/from/to/last_page> }
  // each row: { date, time_in, time_out, break_in, break_out, break_logs: [{punch: 'IN'|'OUT', time}], logs }
  getAttendance: (payload) => axios.post('/employee_master_data/attendance', payload),
};

export default attendanceApi;
