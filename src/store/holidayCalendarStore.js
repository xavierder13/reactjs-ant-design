import { create } from 'zustand';
import holidayCalendarApi from '../services/record_management/holidayCalendarApi';

// Holidays + every branch (the same index response feeds the form's branches).
const useHolidayCalendarStore = create((set) => ({
  items:     [],
  branches:  [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await holidayCalendarApi.getAll();
      set({ items: data.calendars, branches: data.branches });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load the holiday calendar.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useHolidayCalendarStore;
