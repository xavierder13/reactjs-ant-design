import axios from '../../api/axiosInstance';

// Auth — vueportal AuthController (routes/api.php `auth/*`).
// - logout() → revokes the token and clears its idle window
//   (CheckSessionActivity::clear). GET, like the Vue app.
const authApi = {
  logout: () => axios.get('/auth/logout'),
};

export default authApi;
