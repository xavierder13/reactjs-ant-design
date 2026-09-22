import { create } from 'zustand';
import permissionApi from '../services/permission/permissionApi';

const usePermissionStore = create((set, get) => ({
  permissions: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  fetchPermissions: async () => {
    if (get().isLoaded) return;

    set({ isLoading: true, error: null });

    try {
      const { data } = await permissionApi.getAll();
      set({ permissions: data.permissions, isLoaded: true });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load permissions' });
    } finally {
      set({ isLoading: false });
    }
  },

  // force refresh - ignores isLoaded flag
  refreshPermissions: async () => {
    set({ isLoaded: false });
    await get().fetchPermissions();
  },

  clearPermissions: () => set({
    permissions: [],
    isLoaded: false,
    error: null,
  }),
}));

export default usePermissionStore;
