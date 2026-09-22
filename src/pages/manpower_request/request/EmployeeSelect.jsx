import { useEffect, useRef, useState } from 'react';
import employeeOptionApi from '../../../services/employee/employeeOptionApi';
import { Select, Spin } from 'antd';

// Searchable, infinite-scroll employee picker for the "Replacement Employee"
// field. Unlike KPI's employee picker, this intentionally includes inactive
// employees, tagged in the label, since replacements are usually resigned.
// Pass activeOnly for a picker where that doesn't apply (e.g. selecting a
// newly hired employee, who should always be active).
//
// branchId/positionId/hiredOnOrAfter are optional and only meaningful to
// consumers that opt in by passing them. branchId/positionId (Replacement
// Employee, Record Hires) scope the list to a same-branch, same-position
// candidate; hiredOnOrAfter (Record Hires only, passed as the MRF's own
// `date_approved`) additionally requires the candidate's date_employed OR
// their latest branch-assignment date_assigned to be on/after that date —
// they can't have filled this request before it existed (see
// EmployeeMasterDataController::employeeOptionList's `branch_id`/
// `position_id`/`hired_on_or_after` filters). Any prop left `undefined`
// preserves the old unfiltered-on-mount behavior for that dimension
// exactly.
const EmployeeSelect = ({
  value, onChange, placeholder = 'Search employee', activeOnly = false, status,
  branchId, positionId, hiredOnOrAfter,
}) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [page, setPage]           = useState(1);
  const searchRef = useRef('');

  const branchFiltered   = branchId !== undefined;
  const positionFiltered = positionId !== undefined;
  const dateFiltered     = hiredOnOrAfter !== undefined;
  const anyFiltered      = branchFiltered || positionFiltered || dateFiltered;
  // A filter this consumer opted into (prop passed) still needs an actual
  // value picked before a fetch is meaningful.
  const missingFilters   =
    (branchFiltered && !branchId) || (positionFiltered && !positionId) || (dateFiltered && !hiredOnOrAfter);

  const loadEmployees = async (search = '', pageNumber = 1, append = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const fetchOptions = activeOnly ? employeeOptionApi.getActive : employeeOptionApi.getAll;
      const { data } = await fetchOptions({
        search,
        page: pageNumber,
        ...(branchFiltered ? { branch_id: branchId } : {}),
        ...(positionFiltered ? { position_id: positionId } : {}),
        ...(dateFiltered ? { hired_on_or_after: hiredOnOrAfter } : {}),
      });
      const options = data.employees.map((emp) => ({
        value: emp.id,
        label: `${emp.employee_code} - ${emp.full_name} (${emp.position_name || 'No position'})${emp.active ? '' : ' — Inactive'}`,
        // Carried through so a consumer's onChange(value, option) can read
        // it immediately on selection. date_employed is the employee's raw
        // hire date — kept for back-compat, but NOT what Record Hires
        // should preview, since it ignores branch-assignment history.
        // preview_hire_date (only present when `hiredOnOrAfter` was passed,
        // i.e. Record Hires — see backend's employeeOptionList) already
        // applies that same branch-assignment-first priority server-side,
        // matching what ManpowerRequestService::resolveHireDate() will
        // actually persist on save.
        date_employed: emp.date_employed,
        preview_hire_date: emp.preview_hire_date,
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

  useEffect(() => {
    if (!anyFiltered) {
      loadEmployees();
      return;
    }
    // Filtered mode: reset the list on every branch/position/date change
    // (including to/from unselected) rather than loading unfiltered results.
    setEmployees([]);
    setPage(1);
    setHasMore(true);
    searchRef.current = '';
    if (!missingFilters) loadEmployees('', 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, positionId, hiredOnOrAfter]);

  // In filtered mode with a required filter not yet chosen, never let a
  // search or scroll trigger an unfiltered fetch — the backend only applies
  // its branch_id/position_id/hired_on_or_after filters when the param is
  // present/non-empty.
  const handleSearch = (search) => {
    if (missingFilters) return;
    searchRef.current = search;
    loadEmployees(search, 1, false);
  };

  const handlePopupScroll = (e) => {
    if (missingFilters) return;
    const target = e.target;
    const reachedBottom = target.scrollTop + target.offsetHeight >= target.scrollHeight - 10;
    if (reachedBottom && hasMore && !loading) {
      loadEmployees(searchRef.current, page + 1, true);
    }
  };

  const missingLabel = [
    branchFiltered && !branchId ? 'a branch' : null,
    positionFiltered && !positionId ? 'a position' : null,
    dateFiltered && !hiredOnOrAfter ? 'an approved date' : null,
  ].filter(Boolean).join(' and ');

  return (
    <Select
      showSearch
      value={value}
      onChange={onChange}
      placeholder={missingFilters ? `Select ${missingLabel} first` : placeholder}
      disabled={missingFilters}
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