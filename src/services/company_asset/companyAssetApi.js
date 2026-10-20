import axios from '../../api/axiosInstance';

// Company Assets (non-IT company property) — vueportal CompanyAssetController
// + CompanyAssetService, prefix `company_asset` (company_asset.maintenance).
// POST everywhere except getCreate (GET). Responses are the old-style
// envelope: success messages in `success` (a string), errors 422 as a
// field bag or { message }.
// - getAll(params) → { company_assets: paginator } — params: page,
//   items_per_page, search (tag / name / serial), asset_category_id,
//   branch_id, department_id, employee_id, assignment_type ('Employee' |
//   'Area'), status ('Active' | 'Under Repair' | 'Lost' | 'Disposed'). Row:
//   { id, asset_tag (AST-<year>-<6>), name, asset_category { name }, brand,
//   model, vendor, serial_number, date_acquired, cost, warranty_expiry,
//   useful_life_months, salvage_value, status, assignment_type, location,
//   employee { employee_code, full_name }, branch { name }, department
//   { name }, remarks, disposed_at, disposal_reason, approved_by_name,
//   date_assigned, book_value (straight-line, null without cost / life) }.
// - getCreate() (GET) → { asset_categories, branches, departments }.
// - getById(id) → { company_asset }.
// - create(payload) / update(id, payload): { name, asset_category (a name —
//   created if new), brand, model, vendor, serial_number, date_acquired,
//   cost, warranty_expiry, useful_life_months, salvage_value, status
//   ('Active' | 'Under Repair' | 'Lost'), remarks } (+ on create an optional
//   assignment: assignment_type, employee_id, branch_id, department_id,
//   location). Update without assignment_type never touches the assignment.
// - assign(id, { assignment_type, employee_id, branch_id, department_id,
//   location, remarks }) — Employee: active employee, branch / department
//   taken from the employee; Area: location required. returnAsset(id,
//   { remarks }).
// - history(id) → { assignment_history: [{ assignment_type, location,
//   employee, branch, department, assigned_at, unassigned_at, remarks,
//   user { name } }] } (newest first).
// - maintenanceLogs(id) → { maintenance_logs: [{ maintenance_date, type,
//   cost, vendor, notes, user { name } }] }; addMaintenanceLog(id,
//   { maintenance_date, type, cost, vendor, notes }) (append-only).
// - dispose(id, { disposal_reason, approved_by_name }) — unassigns it;
//   a disposed asset can't be edited, assigned or logged (delete only).
// - delete(id). employeeOptions({ search, page }) → { employees: paginator
//   of active employees }.
// Permissions: company-asset-list / -create / -edit / -delete / -assign /
// -dispose / -maintenance / -employee-view.
const companyAssetApi = {
  getAll:            (params)      => axios.post('/company_asset/index', params),
  getCreate:         ()            => axios.get('/company_asset/create'),
  getById:           (id)          => axios.post(`/company_asset/edit/${id}`),
  create:            (payload)     => axios.post('/company_asset/store', payload),
  update:            (id, payload) => axios.post(`/company_asset/update/${id}`, payload),
  delete:            (id)          => axios.post(`/company_asset/delete/${id}`),
  assign:            (id, payload) => axios.post(`/company_asset/assign/${id}`, payload),
  returnAsset:       (id, payload) => axios.post(`/company_asset/return/${id}`, payload),
  history:           (id)          => axios.post(`/company_asset/assignment_history/${id}`),
  maintenanceLogs:   (id)          => axios.post(`/company_asset/maintenance_log/${id}`),
  addMaintenanceLog: (id, payload) => axios.post(`/company_asset/maintenance_log/${id}/store`, payload),
  dispose:           (id, payload) => axios.post(`/company_asset/dispose/${id}`, payload),
  employeeOptions:   (params)      => axios.post('/company_asset/employee_options', params),
  // the assets currently assigned to one employee → { company_assets: [...] }
  // (company-asset-employee-view or -list) — the employee profile's Assets tab
  employeeAssets:    (employeeId)  => axios.post(`/company_asset/employee_assets/${employeeId}`),
  // the signed-in employee's own → { linked, company_assets } (auth only) — My Profile's Assets tab
  myAssets:          ()            => axios.post('/my_asset/index'),
};

export default companyAssetApi;
