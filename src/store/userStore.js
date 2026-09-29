import { create } from 'zustand';
import userApi from '../services/user/userApi';

// /user/index returns the users plus the roles/branches/positions the
// create/edit form needs, so all four are kept here from one request.
const useUserStore = create((set) => ({
  items:     [],
  roles:     [],
  branches:  [],
  positions: [],
  isLoading: false,
  error:     null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await userApi.getAll();
      set({ items: data.users, roles: data.roles, branches: data.branches, positions: data.positions });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load users.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useUserStore;
