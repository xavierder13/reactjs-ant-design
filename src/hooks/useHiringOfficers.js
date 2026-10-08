import { useEffect } from 'react';
import useHiringOfficerStore from '../store/hiringOfficerStore';

const useHiringOfficers = () => {
  const items      = useHiringOfficerStore((state) => state.items);
  const rule       = useHiringOfficerStore((state) => state.rule);
  const isLoading  = useHiringOfficerStore((state) => state.isLoading);
  const error      = useHiringOfficerStore((state) => state.error);
  const fetchItems = useHiringOfficerStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, rule, isLoading, error, refetch: fetchItems };
};

export default useHiringOfficers;
