import axios from '../../api/axiosInstance';

// Offboarding clearance — vueportal EmployeeClearanceController +
// ClearanceService, prefix `clearance` (clearance.maintenance; Administrator
// bypasses). A clearance runs from a **clearance template** (the employee's
// branch's, else the default; HR may pick another): its components clear
// **in order** — only the current one (first still pending) can be cleared,
// by its in-charge (assigned user / immediate head / branch manager) or HR
// (clearance-manage) on their behalf. After the last one: final approval on
// the "Clearance" Access Chart (e.g. Lady Rose → Marilou), or Cleared at once
// with no chart. Deduct from Final Pay accountabilities feed Final Pay.
// - getAll(params) → { clearances: paginator, see_all } — params: scope
//   ('to_sign' | 'for_approval' | 'overdue'), page, per_page, status
//   ('In Progress' | 'Pending' | 'Cleared' | 'Cancelled'), branch_id,
//   date_from / date_to, search. Row: { id, clearance_no, template_name,
//   status, current_level, current_step (component name), current_item_id,
//   items_cleared, items_total, employee, … }.
// - options() → { separation_types, accountability_statuses, branches,
//   assignees [{ id, name }], templates [{ id, name, is_default, branch_ids }] }.
// - candidates(search) → { candidates: [{ offboarding_id, employee_id,
//   branch_id, branch, employee_code, employee_name, last_day_of_work }] }.
// - create { employee_id, offboarding_id, clearance_template_id (none =
//   by branch), separation_type, separation_specify, last_day_of_work,
//   due_date, remarks } / update(id, header).
// - show(id) / every mutation → { clearance, items: [{ id, department_name
//   (the component), sequence, is_current, checklist [{ item_id, item,
//   category, required, standard_charge, status }], status (Pending |
//   Cleared | Not Applicable), signer_type, signatories [names],
//   assigned_to, asset_source, assets, accountabilities, can_sign,
//   can_assign, can_toggle_applicable, can_reopen, can_revert }], totals,
//   approval (ApprovalProcedure::status), can { edit, cancel } }.
// - sign('save' | 'clear', itemId, { checklist, remarks }) — current
//   component only; returnTo(itemId, targetItemId, remarks): back to an
//   earlier cleared component (it returns here after). reopen (HR) /
//   revert (Administrator, also on Cleared). assign(itemId, userId | null)
//   and applicable(itemId, bool, remarks): HR while clearing.
// - add/update/deleteAccountability (current component; clearance_item_id
//   charges a checklist line → 'Charged').
// - act('approve' | 'return', id, { remarks, target_item_id }) — return
//   reopens that component (none = the last). cancel(id, remarks).
// - Setup (clearance-setup): setupOptions() → { users, branches,
//   categories, asset_sources, signer_types }; templates() → { templates:
//   [{ id, name, description, is_default, active, components_count,
//   branches [{ branch { name } }] }] }; template(id) → { template:
//   { …, components [{ id, name, signer_type, signer_user_id, signer,
//   asset_source, items [{ id, clearance_item_category_id, name,
//   is_required, standard_charge }] }] } }; create/updateTemplate { name,
//   description, is_default, active, branch_ids, components (in order,
//   with items) }; deleteTemplate (refused if used / default);
//   categories CRUD + reorderCategories(ids).
// Permissions: clearance-list(-all), -create, -edit, -cancel, -sign,
// -manage, -approve, -setup.
const clearanceApi = {
  getAll:               (params)            => axios.post('/clearance/index', params),
  options:              ()                  => axios.post('/clearance/options'),
  candidates:           (search)            => axios.post('/clearance/candidates', { search }),
  show:                 (id)                => axios.post(`/clearance/show/${id}`),
  create:               (payload)           => axios.post('/clearance/store', payload),
  update:               (id, payload)       => axios.post(`/clearance/update/${id}`, payload),
  sign:                 (action, itemId, payload) => axios.post(`/clearance/item/${action}/${itemId}`, payload),
  returnTo:             (itemId, targetItemId, remarks) => axios.post(`/clearance/item/return/${itemId}`, { target_item_id: targetItemId, remarks }),
  reopen:               (itemId, remarks)   => axios.post(`/clearance/item/reopen/${itemId}`, { remarks }),
  revert:               (itemId, remarks)   => axios.post(`/clearance/item/revert/${itemId}`, { remarks }),
  applicable:           (itemId, applicable, remarks) => axios.post(`/clearance/item/applicable/${itemId}`, { applicable, remarks }),
  assign:               (itemId, userId)    => axios.post(`/clearance/item/assign/${itemId}`, { user_id: userId }),
  addAccountability:    (itemId, payload)   => axios.post(`/clearance/accountability/store/${itemId}`, payload),
  updateAccountability: (id, payload)       => axios.post(`/clearance/accountability/update/${id}`, payload),
  deleteAccountability: (id)                => axios.post(`/clearance/accountability/delete/${id}`),
  act:                  (action, id, payload) => axios.post(`/clearance/${action}/${id}`, payload),
  cancel:               (id, remarks)       => axios.post(`/clearance/cancel/${id}`, { remarks }),
  setupOptions:         ()                  => axios.post('/clearance/setup/options'),
  templates:            ()                  => axios.post('/clearance/setup/templates'),
  template:             (id)                => axios.post(`/clearance/setup/templates/show/${id}`),
  createTemplate:       (payload)           => axios.post('/clearance/setup/templates/store', payload),
  updateTemplate:       (id, payload)       => axios.post(`/clearance/setup/templates/update/${id}`, payload),
  deleteTemplate:       (id)                => axios.post(`/clearance/setup/templates/delete/${id}`),
  categories:           ()                  => axios.post('/clearance/setup/categories'),
  createCategory:       (payload)           => axios.post('/clearance/setup/categories/store', payload),
  updateCategory:       (id, payload)       => axios.post(`/clearance/setup/categories/update/${id}`, payload),
  deleteCategory:       (id)                => axios.post(`/clearance/setup/categories/delete/${id}`),
  reorderCategories:    (ids)               => axios.post('/clearance/setup/reorder', { ids }),
};

export default clearanceApi;
