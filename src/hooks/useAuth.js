// src/hooks/useAuth.js

import useAuthStore from '../store/authStore';

const useAuth = () => {
  const user            = useAuthStore((state) => state.user);
  const roles           = useAuthStore((state) => state.roles);
  const permissions     = useAuthStore((state) => state.permissions);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoaded        = useAuthStore((state) => state.isLoaded);       
  const setAuth         = useAuthStore((state) => state.setAuth);
  const setTokens       = useAuthStore((state) => state.setTokens);
  const setLoaded       = useAuthStore((state) => state.setLoaded);      
  const clearAuth       = useAuthStore((state) => state.clearAuth);

  // ── Helper functions ───────────────────────────────
  const hasRole          = (...role)       => role.every((r)       => roles.includes(r));
  const hasAnyRole       = (...role)       => role.some((r)        => roles.includes(r));
  const hasPermission    = (...permission) => permission.every((p) => permissions.includes(p));
  const hasAnyPermission = (...permission) => permission.some((p)  => permissions.includes(p));

  return {
    user,
    roles,
    permissions,
    isAuthenticated,
    isLoaded,           
    setAuth,
    setTokens,
    setLoaded,          
    clearAuth,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAnyPermission,
  };
};

export default useAuth;