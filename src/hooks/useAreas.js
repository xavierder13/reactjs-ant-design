import { useEffect } from 'react';
import useAreaStore from '../store/areaStore';

const useAreas = () => {
  const items      = useAreaStore((state) => state.items);
  const isLoading  = useAreaStore((state) => state.isLoading);
  const error      = useAreaStore((state) => state.error);
  const fetchItems = useAreaStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
};

export default useAreas;
