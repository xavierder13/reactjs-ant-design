import { useEffect } from 'react';
import useRoleStore from '../store/roleStore';

const useRoles = () => {
  const roles = useRoleStore((state) => state.roles);
  const permissions = useRoleStore((state) => state.permissions);
  const isLoading = useRoleStore((state) => state.isLoading);
  const isLoaded = useRoleStore((state) => state.isLoaded);
  const error = useRoleStore((state) => state.error);
  const fetchRoles = useRoleStore((state) => state.fetchRoles);
  const refreshRoles = useRoleStore((state) => state.refreshRoles);
  const clearRoles = useRoleStore((state) => state.clearRoles);

  // auto-fetch on first use
  useEffect(() => {
    fetchRoles();
  }, []);

  return {
    roles,
    permissions,
    isLoading,
    isLoaded,
    error,
    fetchRoles,
    refreshRoles,
    clearRoles,
  };
};

export default useRoles;
