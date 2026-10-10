import axios from "../../api/axiosInstance";

// Notification bell — vueportal NotificationController@summary (open to every
// signed-in user; NotificationService gates each item by permission).
const notificationApi = {
  // POST /api/notifications/summary
  // → { success, total, items: [{ group, key, label, count, path, severity: 'info'|'warning' }] }
  // Items with a 0 count are left out.
  // config: e.g. { headers: PASSIVE_HEADERS } for the timed refresh (it
  // must not count as activity — utils/session.js)
  getSummary: (config) => axios.post("/notifications/summary", {}, config),
};

export default notificationApi;
