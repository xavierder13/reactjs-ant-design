import { create } from 'zustand';
import roleApi from '../services/role/roleApi';

// /role/index returns both the role list (with permissions eager-loaded)
// and the full permission catalog in one response — both are kept here
// since they come from the same endpoint and the catalog is also what the
// Role form needs to render its permission picker.
const useRoleStore = create((set, get) => ({
  roles: [],
  permissions: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  fetchRoles: async () => {
    if (get().isLoaded) return;

    set({ isLoading: true, error: null });

    try {
      const { data } = await roleApi.getAll();
      set({ roles: data.roles, permissions: data.permissions, isLoaded: true });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load roles' });
    } finally {
      set({ isLoading: false });
    }
  },

  // force refresh - ignores isLoaded flag
  refreshRoles: async () => {
    set({ isLoaded: false });
    await get().fetchRoles();
  },

  clearRoles: () => set({
    roles: [],
    permissions: [],
    isLoaded: false,
    error: null,
  }),
}));

export default useRoleStore;
