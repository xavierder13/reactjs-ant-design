export const ASSET_STATUSES = ['Active', 'Under Repair', 'Lost', 'Disposed'];
// what the form may set ('Disposed' only through Dispose)
export const EDITABLE_STATUSES = ['Active', 'Under Repair', 'Lost'];

export const ASSET_STATUS_COLORS = {
  Active: 'green',
  'Under Repair': 'gold',
  Lost: 'red',
  Disposed: 'default',
};

export const MAINTENANCE_TYPES = ['Repair', 'Preventive', 'Inspection', 'Other'];

const fullName = (e) => (e ? (e.full_name || [e.last_name, e.first_name].filter(Boolean).join(', ')) : '');

// "Employee: 0123 · DELA CRUZ, JUAN" / "Area: Stock room · Branch"
export const assignedTo = (r) => {
  if (r.assignment_type === 'Employee') return r.employee ? `${r.employee.employee_code} · ${fullName(r.employee)}` : 'Employee';
  if (r.assignment_type === 'Area') return [r.location, r.branch?.name, r.department?.name].filter(Boolean).join(' · ') || 'Area';
  return null;
};

// the payload part every assignment action sends (every key, null when not relevant)
export const assignmentPayload = (v) => ({
  assignment_type: v.assignment_type || null,
  employee_id: v.assignment_type === 'Employee' ? v.employee_id : null,
  branch_id: v.assignment_type === 'Area' ? v.branch_id ?? null : null,
  department_id: v.assignment_type === 'Area' ? v.department_id ?? null : null,
  location: v.assignment_type === 'Area' ? v.location?.trim() : null,
});

export { fullName };
