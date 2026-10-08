import axios from '../../api/axiosInstance';

// Shifts (patterns) — vueportal ShiftController, prefix `shift`
// (shift.maintenance; Administrator bypasses). shift-list/-create/-edit/-delete.
// - getAll() → { shifts: [{ id, code, name, description, grace_minutes,
//   active, days: [{ day ('Monday'…'Sunday', in that order), is_day_off,
//   time_in ('06:00:00' | null), time_out, break_minutes }] }], days: [...] }
// - create / update payload { code, name, description, grace_minutes,
//   active, days: [7 × { day, is_day_off, time_in 'HH:mm', time_out,
//   break_minutes }] } → { message, shift }; validation → 422 bag (keys
//   like `days.0.time_in`). Time out before time in = ends the next day.
// - delete(id) → 422 { message } once a Work Schedule or a shifting used it.
// - options() → { shifts: active shifts with days } — the Work Schedule tab /
//   Add Employee pickers (work-schedule-create/-edit, employee create,
//   shift-assignment-create/-edit or shift-list).
const shiftApi = {
  getAll: ()            => axios.post('/shift/index'),
  options: ()           => axios.post('/shift/options'),
  create: (payload)     => axios.post('/shift/store', payload),
  update: (id, payload) => axios.post(`/shift/update/${id}`, payload),
  delete: (id)          => axios.post(`/shift/delete/${id}`),
};

export default shiftApi;
