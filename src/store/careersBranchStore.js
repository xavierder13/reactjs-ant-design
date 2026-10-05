import { create } from 'zustand';
import careersBranchApi from '../services/recruitment/careersBranchApi';
import { errorMessage } from '../pages/recruitment/applicants/requirements';

// Careers portal branches (Recruitment → Setup). Also the hiring-branch
// options of the job vacancy form.
const useCareersBranchStore = create((set) => ({
  items:     [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await careersBranchApi.getAll();
      set({ items: data.branches });
    } catch (error) {
      set({ error: errorMessage(error, 'Failed to load careers branches.') });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useCareersBranchStore;
