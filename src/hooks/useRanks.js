import { useEffect } from 'react';
import useRankStore from '../store/rankStore';

const useRanks = () => {
  const items      = useRankStore((state) => state.items);
  const isLoading  = useRankStore((state) => state.isLoading);
  const error      = useRankStore((state) => state.error);
  const fetchItems = useRankStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
};

export default useRanks;
