import { parseDateValue, daysBetween } from './recruitmentMetrics';

// Recruitment KPI 4 — Standard Time To Fill by position rank (days).
// Top Management has no HR standard; it uses the Managerial one.
export const TIME_TO_FILL_STANDARDS = [
  { rank: 'Rank & File', short: 'RF', days: 25 },
  { rank: 'Supervisory', short: 'SUP', days: 45 },
  { rank: 'Managerial', short: 'MGR', days: 60 },
  { rank: 'Top Management', short: 'TOP', days: 60 },
];
const STANDARD_BY_RANK = Object.fromEntries(TIME_TO_FILL_STANDARDS.map((s) => [s.rank, s]));
export const NO_RANK = 'No rank';

const avg = (total, count) => (count ? Math.round((total / count) * 10) / 10 : null);

// Time to Fill = Σ days each position stayed vacant (MRF Date Approved → Date
// Hired) ÷ No. of positions filled, for positions filled (hired) within the
// period. One hire = one position filled (a line can have several). Hires
// dated before approval are skipped (counted in `skipped`). dateRange:
// { from, to } 'YYYY-MM-DD' or '' (open-ended). filters: the dashboard's
// { branch, position } — matched by name (case-insensitive) to the MRF's
// branch and the line's position; the applicant-only filters (source,
// stage, gender) don't apply to MRFs.
const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export function computeTimeToFill(mrfList, dateRange = {}, filters = {}) {
  const from = dateRange.from ? new Date(`${dateRange.from}T00:00:00`) : null;
  const to = dateRange.to ? new Date(`${dateRange.to}T23:59:59`) : null;
  const rows = [];
  let skipped = 0;

  (mrfList || []).forEach((mrf) => {
    const approved = parseDateValue(mrf.date_approved);
    if (!approved) return;
    if (filters.branch && !sameName(mrf.branch?.name, filters.branch)) return;
    (mrf.details || []).forEach((d) => (d.hires || []).forEach((hire) => {
      if (filters.position && !sameName(d.position?.name, filters.position)) return;
      const hired = parseDateValue(hire.date_hired);
      if (!hired || (from && hired < from) || (to && hired > to)) return;
      const days = daysBetween(approved, hired);
      if (days === null) { skipped += 1; return; }
      const rank = d.position?.rank?.name || NO_RANK;
      const standard = STANDARD_BY_RANK[rank]?.days ?? null;
      rows.push({
        key: hire.id ?? `${mrf.id}-${d.id}-${hire.date_hired}`, mrf: mrf.mrf_number, branch: mrf.branch?.name || '—', position: d.position?.name || 'Unknown', rank, standard,
        approved, hired, days, withinStandard: standard === null ? null : days <= standard,
      });
    }));
  });

  const totalDays = rows.reduce((s, r) => s + r.days, 0);
  const withStandard = rows.filter((r) => r.withinStandard !== null);
  const within = withStandard.filter((r) => r.withinStandard).length;

  const byRank = [...TIME_TO_FILL_STANDARDS.map((s) => s.rank), NO_RANK]
    .map((rank) => {
      const rs = rows.filter((r) => r.rank === rank);
      const ok = rs.filter((r) => r.withinStandard).length;
      const days = rs.reduce((s, r) => s + r.days, 0);
      return {
        rank, standard: STANDARD_BY_RANK[rank]?.days ?? null, filled: rs.length, totalDays: days, average: avg(days, rs.length),
        within: ok, withinPct: rs.length && STANDARD_BY_RANK[rank] ? Math.round((ok / rs.length) * 1000) / 10 : null,
      };
    })
    .filter((r) => r.filled || r.rank !== NO_RANK);

  const byPosition = Object.values(rows.reduce((acc, r) => {
    const g = (acc[r.position] = acc[r.position] || { position: r.position, rank: r.rank, standard: r.standard, filled: 0, totalDays: 0 });
    g.filled += 1; g.totalDays += r.days;
    return acc;
  }, {})).map((g) => ({ ...g, average: avg(g.totalDays, g.filled) })).sort((a, b) => b.average - a.average);

  const byMonth = Object.values(rows.reduce((acc, r) => {
    const key = `${r.hired.getFullYear()}-${String(r.hired.getMonth() + 1).padStart(2, '0')}`;
    const g = (acc[key] = acc[key] || { key, filled: 0, totalDays: 0 });
    g.filled += 1; g.totalDays += r.days;
    return acc;
  }, {})).map((g) => ({ ...g, average: avg(g.totalDays, g.filled) })).sort((a, b) => a.key.localeCompare(b.key));

  return {
    rows, skipped, totalDays, filled: rows.length, average: avg(totalDays, rows.length),
    within, withStandard: withStandard.length, withinPct: withStandard.length ? Math.round((within / withStandard.length) * 1000) / 10 : null,
    byRank, byPosition, byMonth,
  };
}
