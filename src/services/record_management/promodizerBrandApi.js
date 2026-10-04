import axios from '../../api/axiosInstance';

// Backend: vueportal PromodizerBrandController, prefix `promodizer_brand`
// (promodizer.brand.maintenance → promodizer-brand-list/-create/-edit/-delete).
// - getAll()  → { promodizer_brands: [{ id, brand }] }
// - create payload: { brand } (unique)
// - update validates `brand` but saves `promodizer_brand` (controller bug),
//   so update() sends the value under both keys.
// - Validation failures are HTTP 200 with a `{ field: [messages] }` bag;
//   success is `{ success: '<message>', promodizer_brand }`.
const promodizerBrandApi = {
  getAll: ()            => axios.get('/promodizer_brand/index'),
  create: (payload)     => axios.post('/promodizer_brand/store', payload),
  update: (id, payload) => axios.post(`/promodizer_brand/update/${id}`, { ...payload, promodizer_brand: payload.brand }),
  delete: (id)          => axios.post('/promodizer_brand/delete', { promodizer_brand_id: id }),
};

export default promodizerBrandApi;
