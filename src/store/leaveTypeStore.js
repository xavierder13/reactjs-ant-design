import { create } from 'zustand';
import leaveTypeApi from '../services/leave/leaveTypeApi';

// Leave types (Leave Management → Leave Types; also the filter options).
const useLeaveTypeStore = create((set) => ({
  items:           [],
  employmentTypes: [],
  isLoading:       false,
  error:           null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await leaveTypeApi.getAll();
      set({ items: data.leave_types, employmentTypes: data.employment_types });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load leave types.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useLeaveTypeStore;
