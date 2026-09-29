import dayjs from 'dayjs';

// Display format for dates in every table/list view.
export const DISPLAY_DATE_FORMAT = 'MM/DD/YYYY';

// Formats an API date ('YYYY-MM-DD' or a full timestamp) for display.
// Empty values and MySQL's zero date ('0000-00-00') show `fallback`; anything
// dayjs can't parse is shown unchanged rather than as "Invalid Date".
// Use it through an arrow in AntD columns — `render: (v) => formatDate(v)` —
// since `render` also passes (record, index), which would land in `fallback`.
export const formatDate = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '' || String(value).startsWith('0000-00-00')) {
    return fallback;
  }
  const date = dayjs(value);
  return date.isValid() ? date.format(DISPLAY_DATE_FORMAT) : String(value);
};
