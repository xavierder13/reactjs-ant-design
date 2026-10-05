import { errorMessage } from '../applicants/requirements';

// Gateway refusals and portal failures come back as { error } (sometimes an
// error bag) — show that instead of a generic message.
export const showGatewayError = (error, message) => {
  if (error?.errorFields) return; // AntD form validation, shown inline
  message.error(errorMessage(error));
};

// Delete responses differ per portal controller: { success: '<message>' }
// (branch) or { success: true, message } (position, job vacancy).
export const resultMessage = (data, fallback) => (
  typeof data?.success === 'string' ? data.success : (data?.message || fallback)
);

// Portal `status` 1 / 0.
export const STATUS_OPTIONS = { 1: 'Active', 0: 'Inactive' };
