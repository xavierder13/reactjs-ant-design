/**
 * Handles Laravel API error responses
 * Supports both field-level validation errors and message-level business errors
 */
const handleApiError = (error, messageApi) => {
  if (error.response?.status === 422) {
    const errors = error.response.data;
    if (errors?.message) {
      messageApi.error(errors.message);
    } else {
      const firstError = Object.values(errors)[0];
      messageApi.error(Array.isArray(firstError) ? firstError[0] : firstError);
    }
  } else if (error.errorFields) {
    // Ant Design form validation — do nothing, form shows inline errors
  } else {
    messageApi.error(error.response?.data?.message || 'Something went wrong.');
  }
};

export default handleApiError;