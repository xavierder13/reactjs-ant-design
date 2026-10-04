import { useEffect } from 'react';
import useCompanyStore from '../store/companyStore';

const useCompanies = () => {
  const items      = useCompanyStore((state) => state.items);
  const isLoading  = useCompanyStore((state) => state.isLoading);
  const error      = useCompanyStore((state) => state.error);
  const fetchItems = useCompanyStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
};

export default useCompanies;
