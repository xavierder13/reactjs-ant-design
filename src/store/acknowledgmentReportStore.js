import { create } from 'zustand';
import employeeAcknowledgmentReportApi from '../services/employee/employeeAcknowledgmentReportApi';

// Shape mirrors the backend directly: `branches` is a list of branches,
// each carrying its own `acknowledgment_reports` array (see
// employeeAcknowledgmentReportApi.js's header comment) — not a flat report
// list. `current` holds one fully-loaded report (with nested employee
// details) for the View page.
const useAcknowledgmentReportStore = create((set, get) => ({
  branches:  [],
  isLoading: false,
  error:     null,

  current:          null,
  isLoadingCurrent: false,

  fetchBranches: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await employeeAcknowledgmentReportApi.getAll();
      set({ branches: data.branches });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load acknowledgment reports.' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchById: async (id) => {
    set({ isLoadingCurrent: true, error: null });
    try {
      const { data } = await employeeAcknowledgmentReportApi.view(id);
      set({ current: data.acknowledgment_report });
      return data.acknowledgment_report;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load report.' });
    } finally {
      set({ isLoadingCurrent: false });
    }
  },

  submitReport: async (payload) => {
    await employeeAcknowledgmentReportApi.create(payload);
    await get().fetchBranches();
  },

  deleteReport: async (id) => {
    await employeeAcknowledgmentReportApi.delete(id);
    await get().fetchBranches();
  },
}));

export default useAcknowledgmentReportStore;
