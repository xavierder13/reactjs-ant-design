import { create } from 'zustand';
import axios from '../api/axiosInstance';

const useBranchStore = create((set, get) => ({
  
  // State
  branches: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  // Actions
  fetchBranches: async () => {

    // prevent re-fetching if already loaded
    if(get().isLoaded) return;

    set({ isLoading: true, error: null });

    try {
      const { data } = await axios.get('/branch/index');

      set({
        branches: data.branches,
        isLoaded: true,
      })
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load branches' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearBranches: () => set({
    branches: [],
    isLoaded: false,
    error: null,
  }),

}));

export default useBranchStore;