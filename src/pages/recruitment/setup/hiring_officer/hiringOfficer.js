// The name saved on the applicant — "First Last", the way HR typed it in the
// careers portal (e.g. "PRINCESS BANIQUED").
export const officerName = (employee) => (
  employee ? [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim() : ''
);

// Why an officer's employee no longer qualifies (null = still does): the
// backend only checks on save, so a resignation / transfer / promotion
// later leaves the row in place.
export const ineligibleReason = (officer, rule) => {
  const employee = officer.employee;
  if (!employee) return 'Employee record deleted';
  if (Number(employee.active) !== 1) return 'Inactive employee';
  if (rule.branch && employee.branch?.name !== rule.branch) return `Not in ${rule.branch}`;
  if (rule.rank && employee.position?.rank?.name !== rule.rank) return `Not a ${rule.rank} position`;
  return null;
};
