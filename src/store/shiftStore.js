import { create } from 'zustand';
import shiftApi from '../services/shift/shiftApi';

// Shift patterns (Time & Leave → Setup → Shifts).
const useShiftStore = create((set) => ({
  items:     [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await shiftApi.getAll();
      set({ items: data.shifts });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load shifts.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useShiftStore;
