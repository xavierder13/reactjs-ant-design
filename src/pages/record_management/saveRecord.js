import handleApiError from '../../utils/handleApiError';

// The record-management controllers (Rank, Company, Promodizer Brand,
// Department, Branch, Position) answer validation failures with HTTP 200
// and a `{ field: [messages] }` bag — `success` (the message) is the only
// success signal, same as Role/User. Errors go inline on the matching form
// field (`fieldFor` maps a backend key to a form name path); the first one
// is also toasted, in case its field isn't visible (another tab, a filtered
// row). Never throws — callers can set/clear their saving flag around it.
const saveRecord = async ({ request, form, message, onSaved, fieldFor = (key) => key }) => {
  try {
    const { data } = await request();
    if (data.success) {
      message.success(data.success);
      onSaved();
      return;
    }
    // A field can come back with no message at all (seen: a duplicate
    // department name → `{ department: [] }`) — still flag it.
    const entries = Object.entries(data).map(([key, errors]) => {
      const messages = [].concat(errors).filter(Boolean);
      return [key, messages.length ? messages : ['Invalid value — it may already exist.']];
    });
    form.setFields(entries.map(([key, errors]) => ({ name: fieldFor(key), errors })));
    if (entries.length) message.error(entries[0][1][0]);
  } catch (error) {
    handleApiError(error, message);
  }
};

export default saveRecord;
