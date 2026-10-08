const pesoFormat = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 });

// '25000.00' → '₱25,000.00'; empty → '-'.
export const peso = (value) => (value === null || value === undefined || value === '' ? '-' : pesoFormat.format(Number(value)));

// '₱25,000.00 / month' or '₱800.00 / day'.
export const rateLabel = (payBasis, rate) => `${peso(rate)} / ${payBasis === 'Daily' ? 'day' : 'month'}`;

export const CHANGE_TYPE_COLORS = {
  'New Hire': 'blue',
  Regularization: 'cyan',
  'Merit Increase': 'green',
  Promotion: 'purple',
  'Salary Adjustment': 'gold',
  Correction: 'default',
};

// 422 bag → inline field errors; a { message } → toast.
export const applyCompensationErrors = (error, form, message, handleApiError) => {
  const data = error.response?.status === 422 ? error.response.data : null;
  if (data && !data.message) {
    form.setFields(Object.entries(data).map(([name, errors]) => ({ name, errors: [].concat(errors) })));
    return;
  }
  handleApiError(error, message);
};
