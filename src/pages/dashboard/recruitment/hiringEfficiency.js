import { parseDateValue } from './recruitmentMetrics';

const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);

// Recruitment KPI 5 — Hiring Efficiency (%) = No. of vacancies closed within
// the month ÷ Total # of open positions within the month.
//
// Each Approved MRF line opens `quantity` positions on its Date Approved; its
// valid hires (Date Hired on/after approval, earliest first) close them one by
// one, so a line of 3 with 1 hire still has 2 open. A position is open within
// a month when it was approved by the month's end and not closed before the
// month started (open at the start + newly approved). Hires dated before the
// approval are ignored (counted in `skipped`). Follows the dashboard's date
// range (the months shown; the current month is month-to-date) and its
// Branch / Position filters, matched by name.
// Approved MRF lines as individual positions: each line opens `quantity`
// positions on its Date Approved; its valid hires (Date Hired on/after
// approval, earliest first) close them one by one. Hires dated before the
// approval are ignored (`skipped`). Branch / Position filters match by name.
// Shared by Hiring Efficiency and Aging of Vacancies.
export function buildMrfPositions(mrfList, filters = {}) {
  const positions = [];
  let skipped = 0;

  (mrfList || []).forEach((mrf) => {
    if (mrf.status !== 'Approved') return;
    const approved = parseDateValue(mrf.date_approved);
    if (!approved) return;
    if (filters.branch && !sameName(mrf.branch?.name, filters.branch)) return;
    (mrf.details || []).forEach((d) => {
      if (filters.position && !sameName(d.position?.name, filters.position)) return;
      const hires = (d.hires || [])
        .map((h) => parseDateValue(h.date_hired))
        .filter(Boolean)
        .sort((a, b) => a - b);
      const valid = hires.filter((h) => startOfDay(h) >= startOfDay(approved));
      skipped += hires.length - valid.length;
      const quantity = Math.max(Number(d.quantity) || 1, 1);
      for (let i = 0; i < quantity; i += 1) {
        positions.push({
          key: `${mrf.id}-${d.id}-${i}`, mrf: mrf.mrf_number, branch: mrf.branch?.name || '—', position: d.position?.name || 'Unknown',
          rank: d.position?.rank?.name || null, approved: startOfDay(approved), closed: valid[i] ? startOfDay(valid[i]) : null,
        });
      }
    });
  });

  return { positions, skipped };
}

export function computeHiringEfficiency(mrfList, dateRange = {}, filters = {}, today = new Date()) {
  const { positions, skipped } = buildMrfPositions(mrfList, filters);

  const end = startOfDay(dateRange.to ? new Date(`${dateRange.to}T00:00:00`) : today);
  const firstApproval = positions.reduce((min, p) => (!min || p.approved < min ? p.approved : min), null);
  const start = dateRange.from ? new Date(`${dateRange.from}T00:00:00`) : firstApproval || end;

  const months = [];
  for (let m = new Date(start.getFullYear(), start.getMonth(), 1); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const monthStart = m < start ? start : m;
    const monthEndRaw = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    const monthEnd = monthEndRaw > end ? end : monthEndRaw;
    const atStart = positions.filter((p) => p.approved < monthStart && (!p.closed || p.closed >= monthStart)).length;
    const opened = positions.filter((p) => p.approved >= monthStart && p.approved <= monthEnd).length;
    const closed = positions.filter((p) => p.closed && p.closed >= monthStart && p.closed <= monthEnd).length;
    const open = atStart + opened;
    months.push({
      key: monthKey(m), atStart, opened, open, closed,
      stillOpen: open - closed, rate: pct(closed, open), toDate: monthEndRaw > end,
    });
  }

  // The whole period: positions open at any point in it, and those closed in it.
  const periodStart = months.length ? start : end;
  const openInPeriod = positions.filter((p) => p.approved <= end && (!p.closed || p.closed >= periodStart)).length;
  const closedInPeriod = positions.filter((p) => p.closed && p.closed >= periodStart && p.closed <= end).length;
  const openNow = positions.filter((p) => p.approved <= end && (!p.closed || p.closed > end));

  return {
    months, skipped,
    open: openInPeriod, closed: closedInPeriod, rate: pct(closedInPeriod, openInPeriod),
    stillOpen: openNow.length,
  };
}
