// Charts the HRIS modules look up by name — deleting or renaming one stops
// that module's approvals, so the pages don't offer it.
export const SYSTEM_CHARTS = [
  'Manpower Request', 'MRF - Replacement', 'MRF - Additional', 'MRF - New Position',
  'Leave Application', 'Manual Time Entry',
];

export const isSystemChart = (chart) => SYSTEM_CHARTS.includes(chart?.name);

export const levelsOf = (chart) => [...(chart?.approver_per_level || [])]
  .sort((a, b) => a.level - b.level)
  .filter((l, i, all) => all.findIndex((x) => x.level === l.level) === i);

export const approversAt = (chart, level) => (chart?.access_chart_user_maps || [])
  .filter((m) => Number(m.access_level) === Number(level));

export const userLabel = (u) => (u ? `${u.name}${u.email ? ` (${u.email})` : ''}` : '—');
