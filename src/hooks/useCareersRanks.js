import { useEffect } from 'react';
import useCareersRankStore from '../store/careersRankStore';

const useCareersRanks = () => {
  const items      = useCareersRankStore((state) => state.items);
  const isLoading  = useCareersRankStore((state) => state.isLoading);
  const error      = useCareersRankStore((state) => state.error);
  const fetchItems = useCareersRankStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
};

export default useCareersRanks;
