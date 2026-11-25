// Export (.xlsx) for the Referral Codes pages — Referral Codes, Referred
// Applicants, Referred Employees. Built in the browser with SheetJS (as
// recruitmentReport.js) from the same requests the page makes, so the file
// holds what the current filters show: every page of a server-paginated
// list (`fetchAllPages`), and plain text in place of tags / links.

import * as XLSX from "xlsx";
import dayjs from "dayjs";

const CHUNK = 500;

// Every row of a Laravel-paginated list: `fetchPage(page, perPage)` → the paginator.
export const fetchAllPages = async (fetchPage) => {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const paginator = await fetchPage(page, CHUNK);
    rows.push(...(paginator?.data || []));
    if (!paginator || page >= Number(paginator.last_page || 1)) return rows;
  }
};

// `columns`: [[header, (row) => value]]
const sheetOf = (columns, rows) => {
  const data = rows.map((r) => Object.fromEntries(columns.map(([header, value]) => [header, value(r) ?? ""])));
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map(([header]) => header) });
  ws["!cols"] = columns.map(([header]) => ({
    wch: Math.min(60, Math.max(header.length, ...data.map((r) => String(r[header] ?? "").length)) + 2),
  }));
  return ws;
};

// `sheets`: [{ name, columns, rows }] → "<title> (YYYY-MM-DD).xlsx"
export const saveReferralWorkbook = (title, sheets) => {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, columns, rows }) => XLSX.utils.book_append_sheet(wb, sheetOf(columns, rows), name));
  XLSX.writeFile(wb, `${title} (${dayjs().format("YYYY-MM-DD")}).xlsx`);
};
