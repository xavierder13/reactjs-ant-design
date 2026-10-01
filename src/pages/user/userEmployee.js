// "CODE - Last, First" for a user row's linked `employee`
// ({ id, employee_code, first_name, last_name, active } from /user/index).
export const employeeLabel = (employee) => (employee
  ? `${employee.employee_code} - ${[employee.last_name, employee.first_name].filter(Boolean).join(', ')}`
  : null);
