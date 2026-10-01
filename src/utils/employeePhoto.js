// URL of an employee's profile picture, or null when they have none.
//
// vueportal serves it from a public *web* route (routes/web.php,
// `GET /employee_master_data/get_profile_picture/{id}`), not under /api —
// so it's the API base URL with its trailing `/api` dropped. `version`
// busts the browser cache after an upload replaces the picture (the URL
// itself doesn't change).
const backendOrigin = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');

export const employeePhotoUrl = (person, version) => {
  if (!person?.id || !person.profile_file_name) return null;
  const v = version ?? person.profile_file_name;
  return `${backendOrigin}/employee_master_data/get_profile_picture/${person.id}?v=${encodeURIComponent(v)}`;
};

// "Juan Dela Cruz" → "JD", for the avatar fallback.
export const initials = (name = '') => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');
