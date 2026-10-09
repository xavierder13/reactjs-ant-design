import axios from '../../api/axiosInstance';

// Attendance logs imported for employees whose punches don't come from
// BioBridge — vueportal AttendanceLogController, prefix `attendance_log`
// (attendance_log.maintenance: attendance-log-template-download /
// attendance-log-import; Administrator bypasses).
// - templateDownload({ date_from, date_to (≤ 31 days), document_status,
//   branch_id, position_id (0 = all), employee_ids }) → .xls blob — one line
//   per employee per date: employee_code, employee_name, date, time_in,
//   break_out, break_in, time_out, remarks (what is imported already).
// - import(file) → the Generate Template → Import Data contract (HTTP 200:
//   success | error_column | error_row_data + field_values | error_empty |
//   error). A line replaces that employee's imported punches of the date;
//   no times = cleared. Dates in the future, or inside an Approved / Pending
//   payroll, are refused. The DTR / Attendance tab use a date's imported
//   punches instead of that date's BioBridge punches.
const attendanceLogApi = {
  templateDownload: (params) => axios.post('/attendance_log/template/download', params, { responseType: 'blob' }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/attendance_log/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default attendanceLogApi;
