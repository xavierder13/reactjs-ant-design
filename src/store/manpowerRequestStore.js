import { create } from 'zustand';
import manpowerRequestApi from '../services/manpower_request/manpowerRequestApi';

const useManpowerRequestStore = create((set, get) => ({
  items:       [],
  current:     null,
  isLoading:   false,
  error:       null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await manpowerRequestApi.getAll();
      set({ items: data.manpower_requests });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load manpower requests.' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await manpowerRequestApi.getById(id);
      set({ current: data.manpower_request });
      return data.manpower_request;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load manpower request.' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Reference/lookup data for the create/edit form
  branches:   [],
  positions:  [],
  isFormDataLoaded: false,

  fetchFormData: async () => {
    if (get().isFormDataLoaded) return;
    try {
      const { data } = await manpowerRequestApi.getCreate();
      set({ branches: data.branches, positions: data.positions, isFormDataLoaded: true });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load form data.' });
    }
  },
}));

export default useManpowerRequestStore;