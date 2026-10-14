import { useEffect } from 'react';
import usePayrollCompanyStore from '../store/payrollCompanyStore';

const usePayrollCompanies = () => {
  const items      = usePayrollCompanyStore((state) => state.items);
  const isLoading  = usePayrollCompanyStore((state) => state.isLoading);
  const error      = usePayrollCompanyStore((state) => state.error);
  const fetchItems = usePayrollCompanyStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, isLoading, error };
};

export default usePayrollCompanies;
