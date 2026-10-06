// Workforce Dashboard filter state ↔ /employee_dashboard/summary request.

// employee_master_data DATE columns the range applies to — must match
// EmployeeDashboardService::DATE_FILTER_FIELDS.
export const DATE_FIELD_OPTIONS = [
  { label: 'Date Employed', value: 'date_employed' },
  { label: 'Date Resigned', value: 'date_resigned' },
  { label: 'Date of Regularization', value: 'regularization_date' },
  { label: 'Date of Regularization Interview', value: 'regularization_interview_date' },
  { label: 'Birthday', value: 'dob' },
];

export const NO_FILTERS = {
  branch_id: undefined,
  department_id: undefined,
  employment_type: undefined,
  position_id: undefined,
  date_field: 'date_employed',
  date_range: null,
};

// The request body: only filters that are set; the date range only once
// both dates are picked.
export const toQuery = (filters) => {
  const query = {};
  ['branch_id', 'department_id', 'employment_type', 'position_id'].forEach((key) => {
    if (filters[key]) query[key] = filters[key];
  });
  if (filters.date_field && filters.date_range?.[0] && filters.date_range?.[1]) {
    query.date_field = filters.date_field;
    query.date_from = filters.date_range[0].format('YYYY-MM-DD');
    query.date_to = filters.date_range[1].format('YYYY-MM-DD');
  }
  return query;
};
