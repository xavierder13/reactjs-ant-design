import { create } from 'zustand';
import hiringOfficerApi from '../services/recruitment/hiringOfficerApi';
import { errorMessage } from '../pages/recruitment/applicants/requirements';

// Hiring officers (Recruitment → Setup) and who qualifies (rules: [{ branch, rank, position }], any one).
const useHiringOfficerStore = create((set) => ({
  items:     [],
  rule:      [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await hiringOfficerApi.getAll();
      set({ items: data.hiring_officers, rule: data.rules || [] });
    } catch (error) {
      set({ error: errorMessage(error, 'Failed to load hiring officers.') });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useHiringOfficerStore;
