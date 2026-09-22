import axios from "../../api/axiosInstance";

// Employee Master Data's "Branch Assignment & Positions" sub-record.
// Route source of truth: vueportal routes/api.php, prefix
// `employee_master_data/branch_assignment_position`. No `getAll` here —
// EmployeeBranchAssignmentPositionController has no `index()` method;
// read `branch_assignment_positions` off the employee record itself
// (eager-loaded on every `/employee_master_data/index` row).
//
// IMPORTANT: `branch`/`position` are plain NAME strings here, not ids
// (confirmed from the controller — it looks them up via
// `Branch::where('name', ...)`/`Position::where('name', ...)`), unlike
// every other branch/position field in this app which uses `branch_id`/
// `position_id`. Send the option's label, not its value, when reusing
// `useBranches`/`usePositions`.
//
// IMPORTANT side effect (confirmed from the controller, not this
// frontend's doing): creating, updating, or deleting a row here also
// overwrites the employee's own `branch_id`/`position_id`/`department_id`
// on `employee_master_data` to match whichever assignment now has the
// latest `date_assigned` — the Employee Details tab's Branch/Position can
// change as a result of an action taken here. The UI should refresh
// `initialData`'s branch/position display after a mutation rather than
// assuming it's still accurate.
const branchAssignmentPositionApi = {
  // POST /api/employee_master_data/branch_assignment_position/store
  // body: { employee_id, date_assigned (YYYY-MM-DD), position, branch, remarks }
  create: (payload) => axios.post('/employee_master_data/branch_assignment_position/store', payload),

  // POST /api/employee_master_data/branch_assignment_position/update/:id
  // body: { employee_id, date_assigned, position, branch, remarks }
  update: (id, payload) => axios.post(`/employee_master_data/branch_assignment_position/update/${id}`, payload),

  // POST /api/employee_master_data/branch_assignment_position/delete
  // body: { branch_assignment_id }
  remove: (branchAssignmentId) => axios.post('/employee_master_data/branch_assignment_position/delete', { branch_assignment_id: branchAssignmentId }),
};

export default branchAssignmentPositionApi;
