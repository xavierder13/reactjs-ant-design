import { useEffect } from 'react';
import useUserStore from '../store/userStore';

const useUsers = () => {
  const items      = useUserStore((state) => state.items);
  const roles      = useUserStore((state) => state.roles);
  const branches   = useUserStore((state) => state.branches);
  const positions  = useUserStore((state) => state.positions);
  const isLoading  = useUserStore((state) => state.isLoading);
  const error      = useUserStore((state) => state.error);
  const fetchItems = useUserStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, roles, branches, positions, isLoading, error, refetch: fetchItems };
};

export default useUsers;
