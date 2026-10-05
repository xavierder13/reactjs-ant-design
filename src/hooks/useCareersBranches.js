import { useEffect } from 'react';
import useCareersBranchStore from '../store/careersBranchStore';

const useCareersBranches = () => {
  const items      = useCareersBranchStore((state) => state.items);
  const isLoading  = useCareersBranchStore((state) => state.isLoading);
  const error      = useCareersBranchStore((state) => state.error);
  const fetchItems = useCareersBranchStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
};

export default useCareersBranches;
