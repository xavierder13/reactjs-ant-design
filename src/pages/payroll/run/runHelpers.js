export const RUN_STATUS_COLORS = { Draft: 'blue', Pending: 'gold', Approved: 'green', Cancelled: 'default' };

// DTR day status → tag color.
export const DTR_STATUS_COLORS = {
  Present: 'green',
  'Half-day Leave': 'cyan',
  'Half-day Leave, Absent': 'red',
  Absent: 'red',
  'On Leave': 'cyan',
  Incomplete: 'orange',
  Holiday: 'gold',
  'Holiday Worked': 'volcano',
  'Holiday Worked (day off)': 'orange',
  'Rest Day': 'blue',
  'Rest Day Worked': 'orange',
  'No Schedule': 'orange',
  Upcoming: 'default',
};

// 125 → '2 h 05 m'; 0 → '—'
export const minutesText = (m) => {
  if (!m) return '—';
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h ? `${h} h${min ? ` ${String(min).padStart(2, '0')} m` : ''}` : `${min} m`;
};

// 0.5 → '0.5'; 1 → '1'
export const daysText = (n) => (n ? String(Number(n)) : '—');
