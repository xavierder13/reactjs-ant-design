import { useEffect } from 'react';
import useCareersPositionStore from '../store/careersPositionStore';

const useCareersPositions = () => {
  const items       = useCareersPositionStore((state) => state.items);
  const departments = useCareersPositionStore((state) => state.departments);
  const ranks       = useCareersPositionStore((state) => state.ranks);
  const isLoading   = useCareersPositionStore((state) => state.isLoading);
  const error       = useCareersPositionStore((state) => state.error);
  const fetchItems  = useCareersPositionStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, departments, ranks, isLoading, error, refetch: fetchItems };
};

export default useCareersPositions;
