import { useEffect } from 'react';
import useEmployeeFormOptionsStore from '../store/employeeFormOptionsStore';

const toOptions = (rows) => rows.map((row) => ({ label: row.name, value: row.id }));

// Select options for the employee form tabs — same { label, value: id }
// shape useBranches/useDepartments/usePositions return, without their
// Organization-permission requirement. `enabled: false` skips the fetch —
// a read-only view (e.g. My Profile's record tabs) has no form to fill, and
// its endpoint needs the employee-form permission a self-service user lacks.
const useEmployeeFormOptions = ({ enabled = true } = {}) => {
  const branches     = useEmployeeFormOptionsStore((state) => state.branches);
  const departments  = useEmployeeFormOptionsStore((state) => state.departments);
  const positions    = useEmployeeFormOptionsStore((state) => state.positions);
  const isLoading    = useEmployeeFormOptionsStore((state) => state.isLoading);
  const fetchOptions = useEmployeeFormOptionsStore((state) => state.fetchOptions);

  useEffect(() => { if (enabled) fetchOptions(); }, [enabled, fetchOptions]);

  return {
    branchOptions:     toOptions(branches),
    departmentOptions: toOptions(departments),
    positionOptions:   toOptions(positions),
    isLoading,
  };
};

export default useEmployeeFormOptions;
