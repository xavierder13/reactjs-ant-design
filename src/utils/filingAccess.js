// Who may file / edit / cancel a leave, manual time entry or overtime, and
// for whom — the client side of vueportal's FilingAccess (the backend
// re-checks): <prefix>-create / -edit / -cancel = any employee (HR /
// timekeeping); <prefix>-create-own / -edit-own / -cancel-own = only the
// user's own employee record (users.employee_id), cancel only while Pending.
// Administrator: anyone. `auth` = useAuth(); prefix 'leave' | 'time-entry' | 'overtime'.
const filingAccess = ({ user, hasRole, hasPermission }, prefix) => {
  const isAdmin = hasRole('Administrator');
  const any = (action) => isAdmin || hasPermission(`${prefix}-${action}`);
  const own = (action) => hasPermission(`${prefix}-${action}-own`);
  const ownEmployeeId = user?.employee_id || null;
  const mine = (record) => !!ownEmployeeId && Number(record?.employee_id) === Number(ownEmployeeId);

  return {
    isAdmin,
    ownEmployeeId,
    canCreate: any('create') || own('create'),
    // the form has no employee picker: the user files for themself
    createOwnOnly: !any('create') && own('create'),
    canEdit: (record) => any('edit') || (own('edit') && mine(record)),
    canCancel: (record) => any('cancel') || (own('cancel') && mine(record) && record?.status === 'Pending'),
  };
};

export default filingAccess;
