// Who the employee reports to — ports EmployeeProfile2.vue's `manager`
// computed, using the branch_manager / department_manager /
// division_manager accessors EmployeeMasterData appends to every row:
// - outside ADMINISTRATION (stores): the branch manager
// - in ADMINISTRATION, by position name:
//   Department Manager → division manager; Director / Division Manager /
//   General Manager / Secretary → nobody; Audit → division manager;
//   anyone else → department manager
// Never the employee themselves (a branch manager's own branch manager).
export default function reportingManager(employee) {
  if (!employee) return null;
  const branch = (employee.branch?.name || '').toUpperCase();
  const position = (employee.position?.name || '').toUpperCase();

  let manager = null;
  if (branch !== 'ADMINISTRATION') {
    manager = employee.branch_manager;
  } else if (position.includes('DEPARTMENT MANAGER')) {
    manager = employee.division_manager;
  } else if (['DIRECTOR', 'DIVISION MANAGER', 'GENERAL MANAGER', 'SECRETARY'].some((k) => position.includes(k))) {
    manager = null;
  } else if (position.includes('AUDIT')) {
    manager = employee.division_manager;
  } else if (position) {
    manager = employee.department_manager;
  }

  if (!manager?.name || manager.id === employee.id) return null;
  return manager;
}
