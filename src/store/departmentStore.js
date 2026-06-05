import { create } from 'zustand';
import axios from '../api/axiosInstance';

const useDepartmentStore = create((set, get) => ({

  // ── State ──────────────────────────────────────────────
  departments: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  // ── Actions ────────────────────────────────────────────
  fetchDepartments: async () => {

    // prevent re-fetching if already loaded
    if(get().isLoaded) return;

    set({ isLoading: true, error: null });

    try {
      const { data } = await axios.get('/department/index');

      set({
        departments: data.departments,
        isLoaded: true
      });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load departments.' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearDepartments: () => set({
    departments: [],
    isLoaded: false,
    error: null,
  }),

}));

export default useDepartmentStore;