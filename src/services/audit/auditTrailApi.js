import axios from '../../api/axiosInstance';

// Audit trail — vueportal ActivityLogController@audit_trail(_options) over
// spatie/laravel-activitylog's activity_log (activity.logs middleware,
// `activity-logs` permission; Administrator bypasses). Leave, attendance and
// payroll records log every add / edit / delete (App\Traits\AuditsActivity).
// - getAll({ log_name, description: 'created'|'updated'|'deleted', record
//   (model class), causer_id, employee_id, date_from, date_to, page,
//   per_page ≤ 100 }) → { logs: paginator of { id, module, action, record,
//   record_id, user, employee, changes: [{ field, old, new }], created_at } }.
//   Ids in values are already names (employee, leave type, shift, *_by user);
//   a shift's days / a holiday's branches are lists of strings. 422 bag.
// - getOptions() → { modules: [log_name], records: [{ value, label }],
//   users: [{ id, name }] }.
// - getCareers({ description, record, causer_id (portal user), date_from,
//   date_to, page, per_page ≤ 100 }) — ActivityLogController
//   @careers_audit_trail: changes portal staff made in the careers portal
//   itself, read through the gateway → { logs: paginator of the same rows
//   with `subject` (the applicant / record) instead of `employee`, records:
//   [{ value, label }], users: [{ id, name }] (portal users) }. 422 bag or
//   { error } when the portal can't be reached.
const auditTrailApi = {
  getAll:     (params) => axios.post('/activity_logs/audit_trail', params),
  getOptions: ()       => axios.post('/activity_logs/audit_trail_options'),
  getCareers: (params) => axios.post('/activity_logs/careers_audit_trail', params),
};

export default auditTrailApi;
