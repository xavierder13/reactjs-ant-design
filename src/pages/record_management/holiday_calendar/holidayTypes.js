// Stored holiday_type values (vueportal HolidayCalendar::TYPES) with the
// Philippine labels HR uses and the DOLE pay rule as a reminder in the form
// (no pay is computed here). National types default to every branch; a
// Local holiday is for the branches of that city/province.
export const HOLIDAY_TYPES = [
  { value: 'Regular', label: 'Regular Holiday',         color: 'red',    allBranches: true,  hint: 'Paid even if unworked; 200% of the daily rate if worked.' },
  { value: 'Special', label: 'Special Non-Working Day', color: 'orange', allBranches: true,  hint: 'No work, no pay (unless company policy); 130% if worked.' },
  { value: 'Working', label: 'Special Working Day',     color: 'blue',   allBranches: true,  hint: 'An ordinary working day; regular pay.' },
  { value: 'Local',   label: 'Local Holiday',           color: 'purple', allBranches: false, hint: 'Declared for a city or province — pick the branches located there.' },
];

export const holidayType = (value) => HOLIDAY_TYPES.find((t) => t.value === value)
  || { value, label: value, color: 'default', allBranches: false, hint: null };
