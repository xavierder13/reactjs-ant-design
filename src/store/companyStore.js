import { create } from 'zustand';
import companyApi from '../services/record_management/companyApi';

const useCompanyStore = create((set) => ({
  items:     [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await companyApi.getAll();
      set({ items: data.companies });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load companies.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useCompanyStore;
