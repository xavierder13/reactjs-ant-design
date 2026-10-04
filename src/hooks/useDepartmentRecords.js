import { useEffect } from 'react';
import useDepartmentRecordStore from '../store/departmentRecordStore';

const useDepartmentRecords = () => {
  const items      = useDepartmentRecordStore((state) => state.items);
  const divisions  = useDepartmentRecordStore((state) => state.divisions);
  const isLoading  = useDepartmentRecordStore((state) => state.isLoading);
  const error      = useDepartmentRecordStore((state) => state.error);
  const fetchItems = useDepartmentRecordStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, divisions, isLoading, error, refetch: fetchItems };
};

export default useDepartmentRecords;
