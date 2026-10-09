// Prints a document (payslip, BIR 2316, final pay statement) from its own
// window: the app's global stylesheet never applies, so no page-scoped
// @media print rules are needed (see CLAUDE.md "Printing"). `body` is HTML.
const BASE_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #111; margin: 0; }
  h1 { font-size: 15pt; margin: 0 0 2px; } h2 { font-size: 11.5pt; margin: 14px 0 6px; border-bottom: 1px solid #999; padding-bottom: 2px; }
  .muted { color: #555; font-size: 9pt; } .right { text-align: right; } .strong { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; } td, th { padding: 3px 6px; vertical-align: top; }
  table.grid td, table.grid th { border: 1px solid #bbb; } table.grid th { background: #eee; text-align: left; }
  tr.total td { border-top: 2px solid #333; font-weight: bold; }
  .cols { display: flex; gap: 18px; } .cols > div { flex: 1; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a4d0f; padding-bottom: 8px; margin-bottom: 10px; }
  .box { border: 1px solid #999; padding: 8px 10px; margin: 8px 0; }
  .sign { margin-top: 36px; display: flex; gap: 40px; } .sign div { flex: 1; border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 9pt; }
`;

export const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default function printDocument(title, body) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return false; // popup blocked
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${BASE_CSS}</style></head><body>${body}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
