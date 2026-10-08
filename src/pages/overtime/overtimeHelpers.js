// Day types: plain days grey, rest days blue, holidays warmer by premium.
export const DAY_TYPE_COLORS = {
  'Ordinary Day': 'default',
  'Rest Day': 'blue',
  'Special Holiday': 'gold',
  'Special Holiday on Rest Day': 'orange',
  'Regular Holiday': 'volcano',
  'Regular Holiday on Rest Day': 'red',
  'Double Holiday': 'magenta',
  'Double Holiday on Rest Day': 'purple',
};

export const hoursText = (h) => `${Number(h || 0).toFixed(2)} h`;

// The day's biometric reading as one line (null = BioBridge unreachable).
export const punchesText = (punches) => {
  if (punches === null || punches === undefined) return 'Biometric device unreachable';
  if (Array.isArray(punches) && !punches.length) return 'No biometric punches that day';
  const fmt = (t) => (t ? String(t).slice(0, 5) : '—');
  return `In ${fmt(punches.time_in)} · Out ${fmt(punches.time_out)}`;
};
