import { useEffect } from 'react';
import usePermissionStore from '../store/permissionStore';

const usePermissions = () => {
  const permissions = usePermissionStore((state) => state.permissions);
  const isLoading = usePermissionStore((state) => state.isLoading);
  const isLoaded = usePermissionStore((state) => state.isLoaded);
  const error = usePermissionStore((state) => state.error);
  const fetchPermissions = usePermissionStore((state) => state.fetchPermissions);
  const refreshPermissions = usePermissionStore((state) => state.refreshPermissions);
  const clearPermissions = usePermissionStore((state) => state.clearPermissions);

  // auto-fetch on first use
  useEffect(() => {
    fetchPermissions();
  }, []);

  return {
    permissions,
    isLoading,
    isLoaded,
    error,
    fetchPermissions,
    refreshPermissions,
    clearPermissions,
  };
};

export default usePermissions;
