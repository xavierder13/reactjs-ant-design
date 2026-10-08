import axios from '../../api/axiosInstance';

// Backend: vueportal HolidayCalendarController, prefix `holiday_calendar`
// (holiday.calendar.maintenance → holiday-calendar-list/-create/-edit/-delete;
// Administrator bypasses).
// - getAll() → { calendars: [{ id, title, holiday_type, date (YYYY-MM-DD),
//   status (1/0), holiday_calendar_branches: [{ id, calendar_id, branch_id }] }]
//   by date, branches: [every branch, by name] } — GET.
// - create/update payload: { title, holiday_type ('Regular' | 'Special' |
//   'Working' | 'Local'), date: 'YYYY-MM-DD', status: 1|0, branches: [branch ids, ≥ 1] }
//   — update replaces the branch set.
// - Validation failures are HTTP 200 with a `{ field: [messages] }` bag
//   (`branches.0` style keys for a bad branch); success is
//   `{ success: '<message>', calendar }`.
// - delete(id) → { success: '<message>' } (removes its branch rows too).
// The routes also list `import` and `template/download`, but the controller
// has no such methods — not wired here.
const holidayCalendarApi = {
  getAll: ()            => axios.get('/holiday_calendar/index'),
  create: (payload)     => axios.post('/holiday_calendar/store', payload),
  update: (id, payload) => axios.post(`/holiday_calendar/update/${id}`, payload),
  delete: (id)          => axios.post('/holiday_calendar/delete', { calendar_id: id }),
};

export default holidayCalendarApi;
