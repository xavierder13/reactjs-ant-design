import { useEffect, useRef, useState } from 'react';
import employeeOptionApi from '../../../services/employee/employeeOptionApi';
import { Select, Spin } from 'antd';

// Searchable, infinite-scroll employee picker for the "Replacement Employee"
// field. Unlike KPI's employee picker, this intentionally includes inactive
// employees, tagged in the label, since replacements are usually resigned.
// Pass activeOnly for a picker where that doesn't apply (e.g. selecting a
// newly hired employee, who should always be active).
const EmployeeSelect = ({ value, onChange, placeholder = 'Search employee', activeOnly = false, status }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [page, setPage]           = useState(1);
  const searchRef = useRef('');

  const loadEmployees = async (search = '', pageNumber = 1, append = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const fetchOptions = activeOnly ? employeeOptionApi.getActive : employeeOptionApi.getAll;
      const { data } = await fetchOptions({ search, page: pageNumber });
      const options = data.employees.map((emp) => ({
        value: emp.id,
        label: `${emp.employee_code} - ${emp.full_name} (${emp.position_name || 'No position'})${emp.active ? '' : ' — Inactive'}`,
        // Carried through so a consumer's onChange(value, option) can read
        // it immediately on selection — used by the "Record Hires" date
        // hired display (activeOnly usage), which is read-only and always
        // this value, never entered by the user.
        date_employed: emp.date_employed,
      }));
      setEmployees((prev) => append ? [...prev, ...options] : options);
      setHasMore(Boolean(data.next_page_url));
      setPage(pageNumber);
    } catch {
      // silent — Select just shows no results
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  const handleSearch = (search) => {
    searchRef.current = search;
    loadEmployees(search, 1, false);
  };

  const handlePopupScroll = (e) => {
    const target = e.target;
    const reachedBottom = target.scrollTop + target.offsetHeight >= target.scrollHeight - 10;
    if (reachedBottom && hasMore && !loading) {
      loadEmployees(searchRef.current, page + 1, true);
    }
  };

  return (
    <Select
      showSearch
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      filterOption={false}
      onSearch={handleSearch}
      onPopupScroll={handlePopupScroll}
      options={employees}
      notFoundContent={loading ? <Spin size="small" /> : null}
      allowClear
      status={status}
      style={{ width: '100%' }}
    />
  );
};

export default EmployeeSelect;