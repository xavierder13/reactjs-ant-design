import { create } from 'zustand';
import jobVacancyApi from '../services/recruitment/jobVacancyApi';
import { errorMessage } from '../pages/recruitment/applicants/requirements';

// Careers portal job vacancies (Recruitment → Setup).
const useJobVacancyStore = create((set) => ({
  items:     [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await jobVacancyApi.getAll();
      set({ items: data.job_vacancy_lists });
    } catch (error) {
      set({ error: errorMessage(error, 'Failed to load job vacancies.') });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useJobVacancyStore;
