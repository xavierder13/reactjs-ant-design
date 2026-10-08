import { useEffect } from 'react';
import useAccessChartStore from '../store/accessChartStore';

const useAccessCharts = () => {
  const items      = useAccessChartStore((state) => state.items);
  const modules    = useAccessChartStore((state) => state.modules);
  const users      = useAccessChartStore((state) => state.users);
  const isLoading  = useAccessChartStore((state) => state.isLoading);
  const error      = useAccessChartStore((state) => state.error);
  const fetchItems = useAccessChartStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, modules, users, isLoading, error, refetch: fetchItems };
};

export default useAccessCharts;
