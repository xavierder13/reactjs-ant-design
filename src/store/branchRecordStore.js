import { create } from 'zustand';
import branchApi from '../services/record_management/branchApi';

// Record-management list (full rows + form options). Separate from
// branchStore.js, the cached dropdown lookup other pages use — that one is
// marked stale after every save/delete here.
const useBranchRecordStore = create((set) => ({
  items:     [],
  companies: [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await branchApi.getAll();
      set({ items: data.branches, companies: data.companies });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load branches.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useBranchRecordStore;
