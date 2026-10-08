import { useEffect } from 'react';
import useShiftStore from '../store/shiftStore';

const useShifts = () => {
  const items      = useShiftStore((state) => state.items);
  const isLoading  = useShiftStore((state) => state.isLoading);
  const error      = useShiftStore((state) => state.error);
  const fetchItems = useShiftStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
};

export default useShifts;
