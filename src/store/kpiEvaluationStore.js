import { create } from "zustand";
import kpiEvaluationApi from "../services/kpi/kpiEvaluationApi";

const useKpiEvaluationStore = create((set, get) => ({
  evaluations: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  fetchEvaluations: async (params = {}) => {
    if(get().isLoaded) return;
    
    set({ isLoading: true, error: null });

    try {
      const { data } = await kpiEvaluationApi.getAll(params);
      console.log(data);
      
      set({ evaluations: data.evaluations, isLoaded: true });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load evaluations.' });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshEvaluations: async () => {
    set({ isLoaded: false });
    await get().fetchEvaluations();
  },

  clearEvaluations: () => {
    set({ evaluations: [], isLoaded: false, error: null });
  },

}));

export default useKpiEvaluationStore;