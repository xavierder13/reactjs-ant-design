import { create } from 'zustand';
import careersPositionApi from '../services/recruitment/careersPositionApi';
import { errorMessage } from '../pages/recruitment/applicants/requirements';

// Careers portal positions (Recruitment → Setup), with the departments and
// ranks the same index response returns for the form. Also the position
// options of the job vacancy form.
const useCareersPositionStore = create((set) => ({
  items:       [],
  departments: [],
  ranks:       [],
  isLoading:   false,
  error:       null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await careersPositionApi.getAll();
      set({ items: data.positions, departments: data.departments, ranks: data.ranks });
    } catch (error) {
      set({ error: errorMessage(error, 'Failed to load careers positions.') });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useCareersPositionStore;
