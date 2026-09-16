import { create } from 'zustand';
import employeeApi from '../services/employee/employeeApi';

// Employee Master Data deliberately uses server-side search + pagination
// (large employee counts), unlike Manpower Request/KPI's client-side-filter
// convention — fetchItems takes params and is called directly with new
// params on search/page/column changes, not just auto-fetched once.
const useEmployeeStore = create((set, get) => ({
  items: [],
  pagination: { current: 1, pageSize: 10, total: 0 },
  isLoading: false,
  error: null,

  fetchItems: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await employeeApi.getAll(params);
      set({
        items: data.employees.data,
        pagination: {
          current: data.employees.current_page,
          pageSize: data.employees.per_page,
          total: data.employees.total,
        },
      });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load employees.' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Removes a deleted employee from the in-memory list immediately, then
  // reconciles with the server — mirrors the delete-then-refetch shape
  // `EmployeeMasterData.jsx` already had, just moved into the store.
  deleteEmployee: async (ids, refetchParams = {}) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    await employeeApi.delete(idList);
    set({ items: get().items.filter((emp) => !idList.includes(emp.id)) });
    await get().fetchItems(refetchParams);
  },
}));

export default useEmployeeStore;
