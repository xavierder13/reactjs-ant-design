import { create } from 'zustand';
import departmentApi from '../services/record_management/departmentApi';

// Record-management list (full rows + form options). Separate from
// departmentStore.js, the cached dropdown lookup other pages use — that one is
// marked stale after every save/delete here.
const useDepartmentRecordStore = create((set) => ({
  items:     [],
  divisions: [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await departmentApi.getAll();
      set({ items: data.departments, divisions: data.divisions });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load departments.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useDepartmentRecordStore;
