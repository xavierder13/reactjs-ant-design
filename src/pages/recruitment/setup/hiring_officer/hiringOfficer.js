// The name saved on the applicant — "First Last", the way HR typed it in the
// careers portal (e.g. "PRINCESS BANIQUED").
export const officerName = (employee) => (
  employee ? [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim() : ''
);

// The backend's eligibility rules (HiringOfficer::RULES): an employee
// qualifies by matching any one rule, i.e. every key it names.
const matches = (employee, rule) => (
  (!rule.branch || employee.branch?.name === rule.branch)
  && (!rule.rank || employee.position?.rank?.name === rule.rank)
  && (!rule.position || employee.position?.name === rule.position)
);

const describeRule = (rule) => {
  if (rule.position) return rule.branch ? `${rule.branch} ${rule.position}` : `${rule.position} (any branch)`;
  if (rule.branch && rule.rank) return `${rule.branch} ${rule.rank}`;
  return rule.rank || rule.branch || '';
};

// "Active employees: ADMINISTRATION Managerial, Top Management or Branch
// Manager (any branch)." — the form's hint.
export const rulesText = (rules) => {
  const parts = (rules || []).map(describeRule).filter(Boolean);
  if (!parts.length) return null;
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}` : parts[0];
  return `Active employees: ${list}.`;
};

// Why an officer's employee no longer qualifies (null = still does): the
// backend only checks on save, so a resignation / transfer / promotion
// later leaves the row in place.
export const ineligibleReason = (officer, rules) => {
  const employee = officer.employee;
  if (!employee) return 'Employee record deleted';
  if (Number(employee.active) !== 1) return 'Inactive employee';
  if (rules?.length && !rules.some((rule) => matches(employee, rule))) return 'Position / branch no longer qualifies';
  return null;
};
