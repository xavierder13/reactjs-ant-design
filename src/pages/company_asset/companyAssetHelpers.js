export const ASSET_STATUSES = ['Active', 'Under Repair', 'Lost', 'Disposed'];
// what the form may set ('Disposed' only through Dispose)
export const EDITABLE_STATUSES = ['Active', 'Under Repair', 'Lost'];

export const ASSET_STATUS_COLORS = {
  Active: 'green',
  'Under Repair': 'gold',
  Lost: 'red',
  Disposed: 'default',
};

// vueportal CompanyAsset::TYPES — only a Fixed Asset is depreciated (useful
// life, salvage value, book value). IT equipment is the IT Asset module's.
export const FIXED_ASSET = 'Fixed Asset';
export const ASSET_TYPES = [FIXED_ASSET, 'Semi-expendable Asset', 'Supply Asset', 'Leased Asset'];
export const ASSET_TYPE_HELP = {
  'Fixed Asset': 'Capitalised and depreciated (useful life, salvage value).',
  'Semi-expendable Asset': 'Low-value equipment, tracked but not depreciated.',
  'Supply Asset': 'Consumables and supplies, not depreciated.',
  'Leased Asset': 'Leased or rented — not company-owned, not depreciated.',
};
export const assetTypeOf = (asset) => asset?.asset_type || FIXED_ASSET;

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
