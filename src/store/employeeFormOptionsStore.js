import { create } from 'zustand';
import employeeApi from '../services/employee/employeeApi';

// Branch / department / position options for the employee form, from the
// module's own /employee_master_data/create (see employeeApi.js). Reference
// data: fetched once (`isLoaded` guard); the Organization pages mark it
// stale after a save/delete so the next form open refetches.
const useEmployeeFormOptionsStore = create((set, get) => ({
  branches:    [],
  departments: [],
  positions:   [],
  isLoading:   false,
  isLoaded:    false,
  error:       null,

  fetchOptions: async () => {
    if (get().isLoaded || get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await employeeApi.getCreate();
      set({ branches: data.branches, departments: data.departments, positions: data.positions, isLoaded: true });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load form options.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useEmployeeFormOptionsStore;
