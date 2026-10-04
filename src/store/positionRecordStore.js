import { create } from 'zustand';
import positionApi from '../services/record_management/positionApi';

// Record-management list (full rows + form options). Separate from
// positionStore.js, the cached dropdown lookup other pages use — that one is
// marked stale after every save/delete here.
const usePositionRecordStore = create((set) => ({
  items:       [],
  ranks:       [],
  branches:    [],
  departments: [],
  isLoading:   false,
  error:       null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await positionApi.getAll();
      set({ items: data.positions, ranks: data.ranks, branches: data.branches, departments: data.departments });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load positions.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default usePositionRecordStore;
