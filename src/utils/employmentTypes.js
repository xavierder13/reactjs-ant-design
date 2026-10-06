// employment_type values — must match vueportal's
// EmployeeMasterData::EMPLOYMENT_TYPES (case included), which validates the
// employee form, the import and the Workforce Dashboard filter.
export const EMPLOYMENT_TYPES = ['Probationary', 'Regular', 'Agency', 'Contractual'];

export const EMPLOYMENT_TYPE_OPTIONS = EMPLOYMENT_TYPES.map((t) => ({ label: t, value: t }));
