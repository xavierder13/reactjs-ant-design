import { useEffect } from 'react';
import usePositionRecordStore from '../store/positionRecordStore';

const usePositionRecords = () => {
  const items       = usePositionRecordStore((state) => state.items);
  const ranks       = usePositionRecordStore((state) => state.ranks);
  const branches    = usePositionRecordStore((state) => state.branches);
  const departments = usePositionRecordStore((state) => state.departments);
  const isLoading   = usePositionRecordStore((state) => state.isLoading);
  const error       = usePositionRecordStore((state) => state.error);
  const fetchItems  = usePositionRecordStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, ranks, branches, departments, isLoading, error, refetch: fetchItems };
};

export default usePositionRecords;
