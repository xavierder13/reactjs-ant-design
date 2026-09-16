import useEmployeeStore from '../store/employeeStore';

// Deliberately does NOT auto-fetch on mount (unlike useManpowerRequests.js/
// useBranches.js etc.) — this module's list needs page/search/table_headers
// params for every request (server-side pagination, see employeeStore.js),
// and EmployeeMasterData.jsx already owns a mount-time fetch with those
// params (its `useEffect(() => fetchEmployees(1), [selectedHeaders])`,
// which also runs on first render). Adding a second, params-less auto-fetch
// here caused two concurrent requests to `/employee_master_data/index` on
// every page load with no guaranteed resolution order — a real bug found
// and fixed 2026-09-15. Do not reintroduce a mount effect in this hook.
const useEmployees = () => {
  const items       = useEmployeeStore((state) => state.items);
  const pagination  = useEmployeeStore((state) => state.pagination);
  const isLoading   = useEmployeeStore((state) => state.isLoading);
  const error       = useEmployeeStore((state) => state.error);
  const fetchItems  = useEmployeeStore((state) => state.fetchItems);
  const deleteEmployee = useEmployeeStore((state) => state.deleteEmployee);

  return { items, pagination, isLoading, error, fetchItems, deleteEmployee };
};

export default useEmployees;
