import axios from '../../api/axiosInstance';

// Session Settings — vueportal SessionSettingController (`session_setting/*`,
// Administrator only). POST for both, like the backend routes.
// - show()  → { session_setting: { idle_timeout_minutes, session_lifetime_hours,
//             updated_by, updated_at, limits, defaults } }
// - update({ idle_timeout_minutes, session_lifetime_hours }) → same; 422 =
//   field errors or { message }.
const sessionSettingApi = {
  show: () => axios.post('/session_setting/show'),
  update: (data) => axios.post('/session_setting/update', data),
};

export default sessionSettingApi;
