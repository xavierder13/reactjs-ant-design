import { formatDate } from '../../utils/formatDate';

export const LEAVE_STATUS_COLORS = {
  Pending:     'gold',
  Approved:    'green',
  Disapproved: 'red',
  Cancelled:   'default',
};

export const LEAVE_STATUSES = Object.keys(LEAVE_STATUS_COLORS);

// "1.00" → 1, "0.50" → 0.5; null stays null.
export const num = (value) => (value === null || value === undefined ? null : Number(value));

export const leaveDates = (leave) => {
  const from = formatDate(leave.date_from);
  const range = leave.date_from === leave.date_to ? from : `${from} – ${formatDate(leave.date_to)}`;
  return leave.half_day ? `${range} (${leave.half_day} half day)` : range;
};

// The backend answers field errors as a 422 bag and rule failures as a 422
// { message } — map the bag onto the form, toast the message.
export const applyLeaveErrors = (error, form, message, handleApiError) => {
  const data = error.response?.status === 422 ? error.response.data : null;
  if (data && !data.message) {
    form.setFields(Object.entries(data).map(([name, errors]) => ({ name, errors: [].concat(errors) })));
    return;
  }
  handleApiError(error, message);
};
