import axios from '../../api/axiosInstance';

// Shifts (patterns) — vueportal ShiftController, prefix `shift`
// (shift.maintenance; Administrator bypasses). shift-list/-create/-edit/-delete.
// - getAll() → { shifts: [{ id, code, name, description, grace_minutes,
//   makeup_work_minutes (late make-up: work minutes, break excluded, that
//   cancel a late; null = off), flexible (no time in / out: each work day's
//   work_minutes from any time in; no late, short of it = undertime),
//   active, days: [{ day ('Monday'…'Sunday', in that order), is_day_off,
//   time_in ('06:00:00' | null), time_out, break_minutes, work_minutes
//   (flexible work day: required work, break excluded; else null) }] }], days: [...] }
// - create / update payload { code, name, description, grace_minutes,
//   makeup_work_minutes (null | 60–960; locked once assigned, like grace),
//   flexible (bool; true = grace 0, no make-up, times ignored), active,
//   days: [7 × { day, is_day_off, time_in 'HH:mm', time_out, break_minutes,
//   work_minutes (60–960, required on a flexible work day) }] } → { message,
//   shift }; validation → 422 bag (keys like `days.0.time_in`,
//   `days.0.work_minutes`). Time out before time in = ends the next day.
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
