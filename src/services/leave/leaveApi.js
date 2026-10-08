import axios from '../../api/axiosInstance';

// Leave applications — vueportal EmployeeLeaveController + LeaveService,
// prefix `leave` (leave.maintenance; Administrator bypasses).
// Approval: the "Leave Application" Access Chart (like MRF — levels,
// required approvals, approvers per level on the Access Chart screen). Level
// 1 is hierarchical: an approver covers employees whose position is below
// theirs in position_subs (a branch-office approver: own branch only).
// Without levels set up, leave-approve users decide in one step.
// Visibility: leave-list-all (HR) sees every leave; others see what they
// filed, their own (linked account), and leaves they approve / approved.
// - getAll(params) → { success, leaves: Laravel paginator, see_all } — params:
//   scope ('for_approval' = waiting for my decision now), page,
//   per_page, status, leave_type_id, branch_id, employee_id, date_from /
//   date_to (leaves overlapping the range), search (code / name). Row: { id,
//   employee_id, leave_type_id, date_from, date_to, half_day ('AM'|'PM'|null),
//   days ("1.50"), reason, status (Pending|Approved|Disapproved|Cancelled),
//   filed_by, acted_by, acted_at, action_remarks, created_at, employee: { id,
//   employee_code, first_name, last_name, full_name, active, branch, position,
//   employment_type, gender }, leave_type: { id, code, name, is_paid,
//   yearly_credits }, filer: { id, name }, actor: { id, name }, current_level,
//   submitted_at }. leave-list.
// - show(id) → { leave, approval: { configured, routed, current_level,
//   levels: [{ level, required, approved, status (Waiting|Pending|Approved|
//   Disapproved), approvers: [{ id, name }] (who can act, Pending level),
//   actions: [{ name, action, remarks, acted_at }] }], history: [{ level,
//   action, name, remarks, acted_at }], can_approve }, balance: a balances
//   row | null }; 404 when not visible.
// - getCreate() → { leave_types: active types, branches: [{ id, name }] }
//   (leave-list/-create/-edit — the form's types and the list filters).
// - compute(payload { employee_id, leave_type_id, date_from, date_to,
//   half_day, leave_id? }) → { count: { days, breakdown: [{ date, day,
//   counts, skipped }], no_schedule, schedule_starts (first schedule's date
//   when after date_from, else null) }, approvers: level-1 approvers for this
//   employee [{ id, name }] ([] = nobody covers them; null = no procedure),
//   balance: that type's balances row for the year (so filers needn't hold
//   the balance permissions), error: the rule that blocks saving |
//   null }. Rest days come from the employee's Work Schedule in effect each
//   day; holidays from the Holiday Calendar for the employee's branch.
// - balances({ employee_id, year }) → { balances: [{ leave_type, credits
//   (null = no yearly balance), is_override, remarks, used, pending, balance,
//   ineligibility }] }. leave-balance-list-all: any employee;
//   leave-balance-list: subordinates (positions below the user's in
//   position_subs, walked through Leave Application level-1 approvers; own
//   branch outside ADMINISTRATION); anyone: themself. Else 403 { message }.
// - balanceScope() → { all: bool, employees: [{ id, employee_code,
//   full_name, active, position, branch }] (when not all) } — who the Leave
//   Balances page may pick.
// - setCredits({ employee_id, leave_type_id, year, credits | null (= back
//   to the type's default), remarks }) → { message, balances } (leave-credits-edit).
// - create / update(id) payload { employee_id (create only), leave_type_id,
//   date_from, date_to, half_day, reason } → { message, leave }. Field
//   errors: HTTP 422 { field: [msg] }; rule failures (balance, overlap,
//   eligibility, Pending only): HTTP 422 { success: false, message }.
// - act(action 'approve'|'disapprove'|'cancel', id, remarks) → { message,
//   leave } — disapprove requires remarks; approve re-checks every rule and
//   moves to the next level or finalizes; nobody acts twice or on their own
//   leave. leave-approve (approve/disapprove), leave-cancel (cancel).
//   Editing is refused once an approver has acted.
const leaveApi = {
  getAll:     (params)              => axios.post('/leave/index', params),
  getCreate:  ()                    => axios.post('/leave/create'),
  show:       (id)                  => axios.post(`/leave/show/${id}`),
  compute:    (payload)             => axios.post('/leave/compute', payload),
  balances:   (payload)             => axios.post('/leave/balances', payload),
  balanceScope: ()                  => axios.post('/leave/balance_scope'),
  setCredits: (payload)             => axios.post('/leave/credits', payload),
  create:     (payload)             => axios.post('/leave/store', payload),
  update:     (id, payload)         => axios.post(`/leave/update/${id}`, payload),
  act:        (action, id, remarks) => axios.post(`/leave/${action}/${id}`, { remarks }),
};

export default leaveApi;
