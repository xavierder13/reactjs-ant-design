import { useEffect } from 'react';
import useManpowerRequestStore from '../store/manpowerRequestStore';

const useManpowerRequests = () => {
  const items      = useManpowerRequestStore((state) => state.items);
  const isLoading  = useManpowerRequestStore((state) => state.isLoading);
  const error      = useManpowerRequestStore((state) => state.error);
  const fetchItems = useManpowerRequestStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, []);

  return { items, isLoading, error, refetch: fetchItems };
};

export default useManpowerRequests;