import dayjs from 'dayjs';

export const CLEARANCE_STATUSES = ['In Progress', 'Pending', 'Cleared', 'Cancelled'];

export const CLEARANCE_STATUS_COLORS = {
  'In Progress': 'processing',
  Pending: 'gold',
  Cleared: 'green',
  Cancelled: 'default',
};

// 'In Progress' = its components clearing in order; 'Pending' = final approval
export const statusLabel = (status, level) => {
  if (status === 'Pending') return `For Final Approval${level ? ` · Level ${level}` : ''}`;
  return status === 'In Progress' ? 'Clearing' : status;
};

export const SIGNER_LABELS = {
  User: 'Specific employee',
  'Immediate Head': "Employee's immediate head",
  'Branch Manager': "Branch manager of the employee's branch",
};

export const ITEM_STATUS_COLORS = { Pending: 'gold', Cleared: 'green', 'Not Applicable': 'default' };

export const ACCOUNTABILITY_STATUS_COLORS = {
  Unsettled: 'red',
  Returned: 'green',
  Paid: 'green',
  'Deduct from Final Pay': 'purple',
  Waived: 'default',
};

// open, not cleared by the due date
export const isOverdue = (r) => !['Cleared', 'Cancelled'].includes(r.status) && r.due_date && r.due_date < dayjs().format('YYYY-MM-DD');

// 'Other — Transferred to a sister company'; any other type as is
export const separationLabel = (c) => (c?.separation_type === 'Other' && c.separation_specify
  ? `Other — ${c.separation_specify}`
  : c?.separation_type);
