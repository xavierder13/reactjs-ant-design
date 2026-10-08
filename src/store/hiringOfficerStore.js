import { create } from 'zustand';
import hiringOfficerApi from '../services/recruitment/hiringOfficerApi';
import { errorMessage } from '../pages/recruitment/applicants/requirements';

// Hiring officers (Recruitment → Setup) and who qualifies ({ branch, rank }).
const useHiringOfficerStore = create((set) => ({
  items:     [],
  rule:      { branch: null, rank: null },
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await hiringOfficerApi.getAll();
      set({ items: data.hiring_officers, rule: { branch: data.branch, rank: data.rank } });
    } catch (error) {
      set({ error: errorMessage(error, 'Failed to load hiring officers.') });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useHiringOfficerStore;
