import { useEffect } from 'react';
import usePromodizerBrandStore from '../store/promodizerBrandStore';

const usePromodizerBrands = () => {
  const items      = usePromodizerBrandStore((state) => state.items);
  const isLoading  = usePromodizerBrandStore((state) => state.isLoading);
  const error      = usePromodizerBrandStore((state) => state.error);
  const fetchItems = usePromodizerBrandStore((state) => state.fetchItems);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
};

export default usePromodizerBrands;
