import { create } from "zustand";
import kpiTemplateApi from "../services/kpi/kpiTemplateApi";

const useKpiTemplateStore = create((set, get) => ({
  templates: [],
  isLoading: false,
  isLoaded: false,
  error: null,
  

  fetchTemplates: async () => {
    if(get().isLoaded) return;

    set({ isLoading: true, error: null });

    try {
      const { data } = await kpiTemplateApi.getAll();
      set({ templates: data.templates, isLoaded: true });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load templates' });
    } finally {
      set({ isLoading: false });
    }
  },

  // force refresh - ignores isLoaded flag
  refreshTemplates: async () => {
    set({ isLoaded: false });
    await get().fetchTemplates();
  },

  clearTemplates: () => set({
    templates: [],

  })
}));

export default useKpiTemplateStore;