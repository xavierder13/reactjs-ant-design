import { create } from 'zustand';
import areaApi from '../services/area/areaApi';

const useAreaStore = create((set) => ({
  items:     [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await areaApi.getAll();
      set({ items: data.areas });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load areas.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAreaStore;
