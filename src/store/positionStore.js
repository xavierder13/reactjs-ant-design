import { create } from "zustand";
import axios from '../api/axiosInstance';

const usePositionStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────
  positions: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  // ── Actions ────────────────────────────────────────────
  fetchPositions: async () => {

    // prevent re-fetching if already loaded
    if(get().isLoaded) return;

    set({ isLoading: true, error: null });

    try {
      // const { data } = await axios.get('/position/index');
      const { data } = await axios.get('/position/get-all');
      set({ 
        positions: data.positions, 
        isLoaded: true 
      });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load positions' })
    } finally {
      set({ isLoading: false });
    }
  },

  // force refresh - ignores isLoaded flag
  refreshPositions: async () => {
    set({ isLoaded: false });
    await get().fetchPositions();
  },

  clearDepartments: () => set({
    positions: [],
    isLoaded: false,
    error: null,
  }),
  
}));

export default usePositionStore;