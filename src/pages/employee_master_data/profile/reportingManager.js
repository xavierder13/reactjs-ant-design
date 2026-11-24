// Who the employee reports to — ports EmployeeProfile2.vue's `manager`
// computed, using the branch_manager / department_manager /
// division_manager accessors EmployeeMasterData appends to every row:
// - outside ADMINISTRATION (stores): the branch manager
// - in ADMINISTRATION, by position name:
//   Department Manager → division manager; Director / Division Manager /
//   General Manager / Secretary → nobody; Audit → division manager;
//   anyone else → department manager
// Never the employee themselves (a branch manager's own branch manager).
// Returns the manager plus `role` (which of the three it is) and
// `displayName`: the name only — any leading code / number (e.g. an
// "2172Joanalyn Chavez" from a backend that prefixes the record id) is
// stripped, so no internal id or employee code is ever shown.
const ROLE = {
  branch_manager: 'Branch Manager',
  department_manager: 'Department Manager',
  division_manager: 'Division Manager',
};

const cleanName = (name) => String(name || '').replace(/^[\d\s\-–—:.|]+/, '').trim();

export default function reportingManager(employee) {
  if (!employee) return null;
  const branch = (employee.branch?.name || '').toUpperCase();
  const position = (employee.position?.name || '').toUpperCase();

  let key = null;
  if (branch !== 'ADMINISTRATION') {
    key = 'branch_manager';
  } else if (position.includes('DEPARTMENT MANAGER')) {
    key = 'division_manager';
  } else if (['DIRECTOR', 'DIVISION MANAGER', 'GENERAL MANAGER', 'SECRETARY'].some((k) => position.includes(k))) {
    key = null;
  } else if (position.includes('AUDIT')) {
    key = 'division_manager';
  } else if (position) {
    key = 'department_manager';
  }

  const manager = key ? employee[key] : null;
  const displayName = cleanName(manager?.name);
  if (!displayName || manager.id === employee.id) return null;
  return { ...manager, role: ROLE[key], displayName };
}
