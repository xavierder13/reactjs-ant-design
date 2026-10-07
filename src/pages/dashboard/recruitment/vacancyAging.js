import { buildMrfPositions, startOfDay } from './hiringEfficiency';
import { TIME_TO_FILL_STANDARDS } from './timeToFill';

const STANDARD_BY_RANK = Object.fromEntries(TIME_TO_FILL_STANDARDS.map((s) => [s.rank, s.days]));

export const AGING_BUCKETS = [
  { label: '0–15 days', max: 15 },
  { label: '16–30 days', max: 30 },
  { label: '31–45 days', max: 45 },
  { label: '46–60 days', max: 60 },
  { label: '61–90 days', max: 90 },
  { label: 'Over 90 days', max: Infinity },
];

// Recruitment KPI 6 — Aging of Vacancies: No. of days an MRF position is open,
// counted from its Date Approved, for every approved position still open as
// of the end of the dashboard's date range (today by default) — the MRF
// report's Aging, per position. Compared with the Standard Time To Fill for
// the position's rank (RF 25 / SUP 45 / MGR 60). Branch / Position filters as
// Time to Fill; the range's start doesn't apply (a snapshot as of its end).
export function computeVacancyAging(mrfList, dateRange = {}, filters = {}, today = new Date()) {
  const asOf = startOfDay(dateRange.to ? new Date(`${dateRange.to}T00:00:00`) : today);
  const { positions, skipped } = buildMrfPositions(mrfList, filters);

  const open = positions
    .filter((p) => p.approved <= asOf && (!p.closed || p.closed > asOf))
    .map((p) => {
      const days = Math.round((asOf - p.approved) / 86400000);
      const standard = STANDARD_BY_RANK[p.rank] ?? null;
      return { ...p, days, standard, overStandard: standard === null ? null : days > standard };
    })
    .sort((a, b) => b.days - a.days);

  const total = open.reduce((s, p) => s + p.days, 0);
  return {
    asOf, skipped, open,
    count: open.length,
    average: open.length ? Math.round((total / open.length) * 10) / 10 : null,
    oldest: open[0] || null,
    overStandard: open.filter((p) => p.overStandard).length,
    noRank: open.filter((p) => p.standard === null).length,
    buckets: AGING_BUCKETS.map((b, i) => ({
      label: b.label,
      count: open.filter((p) => p.days <= b.max && (i === 0 || p.days > AGING_BUCKETS[i - 1].max)).length,
    })),
  };
}
