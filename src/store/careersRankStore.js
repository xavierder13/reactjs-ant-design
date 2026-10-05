import { create } from 'zustand';
import careersRankApi from '../services/recruitment/careersRankApi';
import { errorMessage } from '../pages/recruitment/applicants/requirements';

// Careers portal ranks (Recruitment → Setup).
const useCareersRankStore = create((set) => ({
  items:     [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await careersRankApi.getAll();
      set({ items: data.ranks });
    } catch (error) {
      set({ error: errorMessage(error, 'Failed to load careers ranks.') });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useCareersRankStore;
