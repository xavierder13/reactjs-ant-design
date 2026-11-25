import { useMemo } from "react";
import useTableColumns from "../../../hooks/useTableColumns";

const plainColumn = (h) => ({ title: h.title, dataIndex: h.dataIndex, render: h.render });

// The employee lists' columns through hooks/useTableColumns: every header
// in the ⚙ Columns chooser (`defaultHeaders` ticked until the user picks),
// dragged / ↑↓ to reorder, kept in this browser. Which ones are ticked is
// also the request's `table_headers` (it shapes the backend search — see
// the employee-master-data skill), so:
//   selectedHeaders — the ticked headers in their defined order; a new
//                     array only when the ticked set changes (a reorder
//                     doesn't re-fetch)
//   orderedHeaders  — the ticked headers in the user's order (mobile cards)
//   columns         — the table's columns, in order, headers draggable
// `toColumn(header)` makes a header's table column (e.g. with a sorter);
// `extraColumns` always show (not sent, not hideable); `maxShown` caps the
// ticked headers (the backend's limit).
export default function useEmployeeColumns(tableKey, headers, defaultHeaders, { toColumn = plainColumn, extraColumns = [], maxShown } = {}) {
  const defaults = defaultHeaders.map((h) => h.value);
  const columns = [
    ...headers.map((h) => ({ ...toColumn(h), key: h.value, defaultHidden: !defaults.includes(h.value) })),
    ...extraColumns.map((h) => ({ ...toColumn(h), key: `extra:${h.value ?? h.dataIndex}`, hideable: false })),
  ];
  const { columns: shownColumns, chooser } = useTableColumns(tableKey, columns, { maxShown });

  const shownKeys = shownColumns.map((c) => c.key);
  const byKey = new Map([
    ...headers.map((h) => [h.value, h]),
    ...extraColumns.map((h) => [`extra:${h.value ?? h.dataIndex}`, h]),
  ]);
  const orderedHeaders = shownKeys.map((k) => byKey.get(k)).filter(Boolean);
  const selection = headers.filter((h) => shownKeys.includes(h.value)).map((h) => h.value).join("|");
  const selectedHeaders = useMemo(() => {
    const keys = selection.split("|");
    return headers.filter((h) => keys.includes(h.value));
  }, [headers, selection]);

  return { columns: shownColumns, selectedHeaders, orderedHeaders, chooser };
}
