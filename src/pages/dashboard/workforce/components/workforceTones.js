// Card/tile accents (top bar + icon badge — never the value text), by what
// the number means. People/voluntary/involuntary reuse the charts' series
// colors; the status steps are the dataviz status palette, reserved for
// states that need attention, and always sit beside an icon + label.
export const TONES = {
  people: '#2a78d6',             // headcount, capacity (series blue)
  growth: '#0ca30c',             // status good — hires
  warning: '#fab219',            // status warning — needs action soon
  serious: '#ec835a',            // status serious — losses, open cases
  critical: '#d03b3b',           // status critical — overdue, disciplinary
  voluntary: '#2a78d6',          // separation types: same colors as their charts
  involuntary: '#eb6834',
  neutral: '#b8b7b1',
};

// Separation types in fixed entity order → ShareBar colors (blue, orange).
export const SEPARATION_TYPE_ORDER = ['Voluntary', 'Involuntary'];
