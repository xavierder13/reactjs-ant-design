import { create } from 'zustand';
import accessChartApi from '../services/approval/accessChartApi';

// Access charts + modules + users (one index call feeds both Approvals pages).
const useAccessChartStore = create((set) => ({
  items:     [],
  modules:   [],
  users:     [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await accessChartApi.getAll();
      set({ items: data.access_charts, modules: data.access_modules, users: data.users });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load access charts.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAccessChartStore;
