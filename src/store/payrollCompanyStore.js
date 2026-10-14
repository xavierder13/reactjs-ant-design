import { create } from 'zustand';
import payrollReportApi from '../services/payroll/payrollReportApi';

// The companies (employers) the payroll reports filter by —
// payroll_report/companies (payroll-report-view; unlike /company/index it
// needs no company-list). Loaded once; refresh() loads again.
const usePayrollCompanyStore = create((set, get) => ({
  items:     [],
  isLoading: false,
  isLoaded:  false,
  error:     null,

  fetchItems: async () => {
    if (get().isLoaded || get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await payrollReportApi.companies();
      set({ items: data.companies, isLoaded: true });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load companies.' });
    } finally {
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    set({ isLoaded: false });
    await get().fetchItems();
  },
}));

export default usePayrollCompanyStore;
