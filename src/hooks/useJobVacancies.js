import { useEffect } from 'react';
import useJobVacancyStore from '../store/jobVacancyStore';

const useJobVacancies = () => {
  const items      = useJobVacancyStore((state) => state.items);
  const isLoading  = useJobVacancyStore((state) => state.isLoading);
  const error      = useJobVacancyStore((state) => state.error);
  const fetchItems = useJobVacancyStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
};

export default useJobVacancies;
