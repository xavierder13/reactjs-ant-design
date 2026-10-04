import { create } from 'zustand';
import promodizerBrandApi from '../services/record_management/promodizerBrandApi';

const usePromodizerBrandStore = create((set) => ({
  items:     [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await promodizerBrandApi.getAll();
      set({ items: data.promodizer_brands });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load promodizer brands.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default usePromodizerBrandStore;
