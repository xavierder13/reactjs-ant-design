import axios from '../../api/axiosInstance';

// Biometric Devices — vueportal BiometricDeviceController
// (biometric_device.maintenance; Administrator bypasses). The backup way to
// get punches when BioBridge has a problem; the backend only reads from the
// devices (fetch only).
// - getAll() → { devices: [{ id, branch, ip, port, serial_number, active,
//   remarks, last_pulled_at, last_status 'OK'|'Failed'|null, last_message,
//   last_log_at, last_ok_at, listener_seen_at, last_event_at, logs_count,
//   feed 'live'|'device'|'biobridge' (where its punches come from now) }] }
//   (biometric-device-list). comm_key is never sent.
// - create / update(id) { branch, ip, port, comm_key (null = keep / 0), active,
//   remarks } → 422 bag (ip + port unique). delete(id) → 422 { message } once
//   the device has pulled punches (set it inactive instead).
// - pull(id) → { message, device } (biometric-device-pull): reads the whole
//   device log, about 10 s per 40,000 records; 422 { message } when the device
//   is unreachable or the comm key is wrong (recorded on the device).
// - importBioBridge() → { message, added } (biometric-device-create): adds the
//   devices BioBridge pulls that aren't on the list.
// - logs(id, { date_from, date_to, search, page, per_page (≤ 100) }) → { total,
//   logs: [{ id,
//   user_id, employee_name, timestamp, punch 'IN'|'OUT', source 'device'|'biobridge' }] }
//   (biometric-device-list).
// - getFeeds() → { feeds: { table_ready, pull: { interval_minutes, intervals
//   [3, 5, 10, 15, 30, 60], round_at }, biobridge: { enabled, status, message,
//   copied_at, ready_at, punches, newest, updated_by }, device: { active, ok,
//   failed, never, live, pulled, fallback, punches, newest } } }
//   (biometric-device-list): the feeds of biometric_device_logs, the table the
//   DTR, payroll and attendance screens read.
// - updateFeeds({ biobridge_copy_enabled } | { pull_interval_minutes }) →
//   { message } — Administrator only.
// - copyNow() → { message } (biometric-device-pull): one BioBridge fallback run (≤ 50 s).
// - pullAll() → { message, total } (biometric-device-pull): starts one round of
//   every active device not live in the background (8 at a time); 422 while a
//   round runs. Progress: getFeeds().feeds.pull.round { running, started_at,
//   finished_at, total, done, message } — poll it with PASSIVE_HEADERS.
// - getAll / getFeeds take an axios config ({ headers: PASSIVE_HEADERS } for polling).
// - fetchBioBridge(id, { date_from, date_to (≤ 31 days) }) → { message }
//   (biometric-device-pull): this device's BioBridge punches not recorded yet.
const biometricDeviceApi = {
  getAll: (config)       => axios.post('/biometric_device/index', {}, config),
  create: (payload)      => axios.post('/biometric_device/store', payload),
  update: (id, payload)  => axios.post(`/biometric_device/update/${id}`, payload),
  delete: (id)           => axios.post(`/biometric_device/delete/${id}`),
  pull: (id)             => axios.post(`/biometric_device/pull/${id}`),
  importBioBridge: ()    => axios.post('/biometric_device/import_bio_bridge'),
  logs: (id, params)     => axios.post(`/biometric_device/logs/${id}`, params),
  getFeeds: (config)     => axios.post('/biometric_device/feeds', {}, config),
  pullAll: ()            => axios.post('/biometric_device/pull_all'),
  updateFeeds: (payload) => axios.post('/biometric_device/feeds/update', payload),
  copyNow: ()            => axios.post('/biometric_device/feeds/copy_now'),
  fetchBioBridge: (id, payload) => axios.post(`/biometric_device/fetch_bio_bridge/${id}`, payload),
};

export default biometricDeviceApi;
