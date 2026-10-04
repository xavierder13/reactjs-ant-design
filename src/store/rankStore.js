import { create } from 'zustand';
import rankApi from '../services/record_management/rankApi';

const useRankStore = create((set) => ({
  items:     [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await rankApi.getAll();
      set({ items: data.ranks });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load ranks.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useRankStore;
