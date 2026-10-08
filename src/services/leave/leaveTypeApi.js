import axios from '../../api/axiosInstance';

// Leave types — vueportal LeaveTypeController, prefix `leave_type`
// (leave.maintenance; Administrator bypasses). Permissions
// leave-type-list/-create/-edit/-delete; index also allowed with leave-list.
// - getAll() → { success, leave_types: [{ id, code, name, description,
//   is_paid, yearly_credits ("5.00" | null = no yearly balance),
//   max_days_per_filing ("105.00" | null), counts_calendar_days,
//   gender ('MALE' | 'FEMALE' | null), employment_types ('Regular,Probationary'
//   | null = any), min_service_months, active }], employment_types: [...] }
// - create / update payload: the same fields, employment_types as an array
//   → { success, message, leave_type }; validation → HTTP 422 { field: [msg] }.
// - delete(id) → { success, message }; 422 { message } when the type has
//   leave applications (set it inactive instead).
const leaveTypeApi = {
  getAll: ()            => axios.post('/leave_type/index'),
  create: (payload)     => axios.post('/leave_type/store', payload),
  update: (id, payload) => axios.post(`/leave_type/update/${id}`, payload),
  delete: (id)          => axios.post(`/leave_type/delete/${id}`),
};

export default leaveTypeApi;
