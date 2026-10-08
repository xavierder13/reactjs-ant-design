import { useEffect } from 'react';
import useHolidayCalendarStore from '../store/holidayCalendarStore';

const useHolidayCalendars = () => {
  const items      = useHolidayCalendarStore((state) => state.items);
  const branches   = useHolidayCalendarStore((state) => state.branches);
  const isLoading  = useHolidayCalendarStore((state) => state.isLoading);
  const error      = useHolidayCalendarStore((state) => state.error);
  const fetchItems = useHolidayCalendarStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, branches, isLoading, error, refetch: fetchItems };
};

export default useHolidayCalendars;
