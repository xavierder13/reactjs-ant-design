import { useEffect } from 'react';
import useLeaveTypeStore from '../store/leaveTypeStore';

const useLeaveTypes = () => {
  const items           = useLeaveTypeStore((state) => state.items);
  const employmentTypes = useLeaveTypeStore((state) => state.employmentTypes);
  const isLoading       = useLeaveTypeStore((state) => state.isLoading);
  const error           = useLeaveTypeStore((state) => state.error);
  const fetchItems      = useLeaveTypeStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, employmentTypes, isLoading, error, refetch: fetchItems };
};

export default useLeaveTypes;
