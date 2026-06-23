import { useEffect } from "react";
import usePositionStore from "../store/positionStore";

const usePositions = () => {
  const positions = usePositionStore((state) => state.positions);
  const isLoading = usePositionStore((state) => state.isLoading);
  const isLoaded = usePositionStore((state) => state.isLoaded);
  const error = usePositionStore((state) => state.error);
  const fetchPositions = usePositionStore((state) => state.fetchPositions);
  const refreshPositions = usePositionStore((state) => state.refreshPositions);
  const clearPositions = usePositionStore((state) => state.clearPositions);

  // auto-fetch on first use
  useEffect(() => {
    fetchPositions();
  }, []);

  // formatted for Ant Design Select options

  const positionOptions = positions.map((pos) => ({
    label: pos.name,
    value: pos.id
  }));

  return {
    positions,
    positionOptions,
    isLoading,
    isLoaded,
    error,
    fetchPositions,
    refreshPositions,
    clearPositions,
  };
};

export default usePositions;