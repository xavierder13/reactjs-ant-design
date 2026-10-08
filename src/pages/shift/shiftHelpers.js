import dayjs from 'dayjs';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const hhmm = (time) => (time ? String(time).slice(0, 5) : null);

// '06:00' → dayjs for a TimePicker (date part irrelevant).
export const toTime = (time) => (time ? dayjs(`2000-01-01 ${hhmm(time)}`) : null);

// One day of a shift / schedule as text: "Day off" or "06:00–15:00" (+1 = next day).
export const dayText = (day) => {
  if (!day || day.is_day_off || day.day_off) return 'Day off';
  const tin = hhmm(day.time_in);
  const tout = hhmm(day.time_out);
  if (!tin || !tout) return '—';
  return `${tin}–${tout}${tout < tin ? ' (+1)' : ''}`;
};

// Short weekly summary: "Mon–Sat 06:00–15:00 · Tue off" style.
export const patternSummary = (days = []) => {
  const groups = {};
  [...days].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)).forEach((d) => {
    const key = dayText(d);
    (groups[key] = groups[key] || []).push(d.day.slice(0, 3));
  });
  return Object.entries(groups).map(([text, names]) => `${names.join(', ')}: ${text}`).join(' · ');
};

export const SHIFT_STATUS_COLORS = { Active: 'green', Cancelled: 'default' };

export const periodDays = (row) => dayjs(row.date_to).diff(dayjs(row.date_from), 'day') + 1;

// 422 field bag → form, else toast.
export const applyErrors = (error, form, message, handleApiError, fieldFor = (k) => k) => {
  const data = error.response?.status === 422 ? error.response.data : null;
  if (data && !data.message) {
    form.setFields(Object.entries(data).map(([name, errors]) => ({ name: fieldFor(name), errors: [].concat(errors) })));
    return;
  }
  handleApiError(error, message);
};
