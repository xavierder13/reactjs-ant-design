export const TIME_ENTRY_STATUS_COLORS = {
  Pending:     'gold',
  Approved:    'green',
  Disapproved: 'red',
  Cancelled:   'default',
};

export const TIME_ENTRY_STATUSES = Object.keys(TIME_ENTRY_STATUS_COLORS);

export const hhmm = (t) => (t ? String(t).slice(0, 5) : null);

// "08:00 – 17:00", "08:00 – (none)", "22:00 – 06:00 (+1)"
export const timeRange = (inTime, outTime) => {
  const a = hhmm(inTime);
  const b = hhmm(outTime);
  return `${a || '—'} – ${b || '—'}${a && b && b < a ? ' (+1)' : ''}`;
};

// "12:00 – 13:00" or null when no break was filed.
export const breakRange = (breakOut, breakIn) => (breakOut || breakIn ? timeRange(breakOut, breakIn) : null);

// The schedule in force that day, as text.
export const scheduleText = (s) => {
  if (!s) return '—';
  if (!s.source) return 'No schedule';
  const from = s.source === 'shift' ? `Shifting ${s.shift_code}` : `Work Schedule${s.shift_code ? ` ${s.shift_code}` : ''}`;
  return `${from}: ${s.day_off ? 'Day off' : timeRange(s.time_in, s.time_out)}`;
};
