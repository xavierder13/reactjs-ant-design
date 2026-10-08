// Shared Table pagination: a records-per-page selector and the record count
// on every paged table. Client-side tables must use `defaultPageSize` — a
// fixed `pageSize` prop overrides AntD's internal state, so the selector
// would show but never change the page size. Server-paginated tables keep
// their own current/pageSize/onChange and spread the display parts.
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const showRecordRange = (total, [from, to]) => `${from}-${to} of ${total} records`;

export const tablePagination = (defaultPageSize = 10, extra = {}) => ({
  defaultPageSize,
  showSizeChanger: true,
  pageSizeOptions: [...new Set([defaultPageSize, ...PAGE_SIZE_OPTIONS])].sort((a, b) => a - b),
  showTotal: showRecordRange,
  ...extra,
});
