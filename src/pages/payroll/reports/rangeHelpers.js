import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App } from 'antd';
import payrollCutoffApi from '../../../services/payroll/payrollCutoffApi';
import handleApiError from '../../../utils/handleApiError';

// State and params of RangeFilters (Contribution History, Pay Sheet).
export const defaultRangeFilters = () => ({
  mode: 'dates',
  dates: [dayjs().startOf('year'), dayjs()],
  cutoffFrom: null,
  cutoffTo: null,
  company_id: null,
  branch_id: null,
  position_id: null,
  employees: [], // [{ value, label }] (EmployeeSelect multiple)
});

// The API params ({ date_from, date_to, … }), or null when the range isn't
// complete. A cut-off range sends the first cut-off's start and the last
// one's end.
export const rangeParams = (f, cutoffs) => {
  let from;
  let to;
  if (f.mode === 'cutoffs') {
    const a = cutoffs.find((c) => c.id === f.cutoffFrom);
    const b = cutoffs.find((c) => c.id === f.cutoffTo);
    if (!a || !b) return null;
    [from, to] = a.date_from <= b.date_from ? [a.date_from, b.date_to] : [b.date_from, a.date_to];
  } else {
    if (!f.dates?.[0] || !f.dates?.[1]) return null;
    from = f.dates[0].format('YYYY-MM-DD');
    to = f.dates[1].format('YYYY-MM-DD');
  }
  return {
    date_from: from,
    date_to: to,
    company_id: f.company_id || null,
    branch_id: f.branch_id || null,
    position_id: f.position_id || null,
    employee_ids: f.employees.length ? f.employees.map((e) => e.value) : null,
  };
};

// The cut-offs of this year and last year (for the cut-off range).
export const useRangeCutoffs = () => {
  const { message } = App.useApp();
  const [cutoffs, setCutoffs] = useState([]);
  useEffect(() => {
    const load = async () => {
      try {
        const year = dayjs().year();
        const [a, b] = await Promise.all([payrollCutoffApi.getAll({ year: year - 1 }), payrollCutoffApi.getAll({ year })]);
        setCutoffs([...a.data.cutoffs, ...b.data.cutoffs].sort((x, y) => (x.date_from < y.date_from ? -1 : 1)));
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);
  return cutoffs;
};
