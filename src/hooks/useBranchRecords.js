import { useEffect } from 'react';
import useBranchRecordStore from '../store/branchRecordStore';

const useBranchRecords = () => {
  const items      = useBranchRecordStore((state) => state.items);
  const companies  = useBranchRecordStore((state) => state.companies);
  const isLoading  = useBranchRecordStore((state) => state.isLoading);
  const error      = useBranchRecordStore((state) => state.error);
  const fetchItems = useBranchRecordStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, companies, isLoading, error, refetch: fetchItems };
};

export default useBranchRecords;
