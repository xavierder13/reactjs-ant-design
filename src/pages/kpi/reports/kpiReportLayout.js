// KPI Consolidated Report layout — pure functions turning the
// /kpi/reports/consolidated response + the user's choices into tables.
// Shared by the page and the Excel export so both always match.
//
// Choices:
//   mode      'summary'  one row per position (averages)
//             'detailed' one table per position, one row per evaluation
//   sections  { job, behavior, demerit }: 'hide' | 'total' | 'breakdown'

export const SECTIONS = [
  { key: 'job',      label: 'Job Performance' },
  { key: 'behavior', label: 'Work Personality / Behavior' },
  { key: 'demerit',  label: 'Demerit' },
];

export const DEFAULT_SECTIONS = { job: 'total', behavior: 'total', demerit: 'total' };

const average = (values) => {
  const filled = values.filter((v) => v !== null && v !== undefined);
  return filled.length ? filled.reduce((sum, v) => sum + v, 0) / filled.length : null;
};

// Display format per column type
export const formatValue = (value, format) => {
  if (value === null || value === undefined || value === '') return '';
  if (format === 'pct')    return `${Number(value).toFixed(2)}%`;
  if (format === 'num')    return Number(value).toFixed(2);
  if (format === 'rating') return Number(value).toFixed(1);
  return value;
};

// Rows narrowed by the page's position / branch filters.
export const filterRows = (rows, { positionIds = [], branch = null } = {}) =>
  rows.filter((r) =>
    (!positionIds.length || positionIds.includes(r.position_id)) &&
    (!branch || r.branch === branch)
  );

// ── Detailed ────────────────────────────────────────────────────────────────

const detailColumns = (position, criteria, sections) => [
  { key: 'employee_code', title: 'Code',     value: (r) => r.employee_code },
  { key: 'employee_name', title: 'Employee', value: (r) => r.employee_name },
  { key: 'branch',        title: 'Branch',   value: (r) => r.branch },
  { key: 'period',        title: 'Period',   value: (r) => `${r.period_start} – ${r.period_end}` },

  ...(sections.job === 'breakdown'
    ? position.components.map((c) => ({
      key: `c_${c.code}`, title: `${c.code} – ${c.name}`, format: 'pct', numeric: true,
      value: (r) => r.components?.[c.code]?.grade ?? null,
    }))
    : []),
  ...(sections.job !== 'hide'
    ? [{ key: 'job', title: 'Job Performance', format: 'pct', numeric: true, total: true, value: (r) => r.job_score }]
    : []),

  ...(sections.behavior === 'breakdown'
    ? criteria.map((c) => ({
      key: `b_${c.id}`, title: c.name, format: 'rating', numeric: true,
      value: (r) => r.ratings?.[c.id] ?? null,
    }))
    : []),
  ...(sections.behavior !== 'hide'
    ? [{ key: 'behavior', title: 'Work Personality / Behavior', format: 'num', numeric: true, total: true, value: (r) => r.behavior_score }]
    : []),

  ...(sections.demerit === 'breakdown'
    ? position.demerits.map((d) => ({
      key: `d_${d.code}`, title: `${d.code} – ${d.name}`, format: 'pct', numeric: true,
      value: (r) => r.demerits?.[d.code] ?? null,
    }))
    : []),
  ...(sections.demerit !== 'hide' && position.demerits.length
    ? [{ key: 'demerit', title: 'Demerit', format: 'pct', numeric: true, total: true, value: (r) => r.demerit }]
    : []),

  { key: 'final', title: 'Final Grade', format: 'pct', numeric: true, total: true, strong: true, value: (r) => r.final_score },
];

// One group per position that has rows: { position, columns, rows, average }
export const buildDetailed = (data, rows, sections) =>
  data.positions
    .map((position) => {
      const positionRows = rows.filter((r) => r.position_id === position.id);
      if (!positionRows.length) return null;

      const columns = detailColumns(position, data.criteria, sections);
      const averageRow = Object.fromEntries(columns.map((col) => [
        col.key,
        col.numeric ? average(positionRows.map(col.value)) : null,
      ]));

      return { position, columns, rows: positionRows, average: averageRow };
    })
    .filter(Boolean);

// ── Summary ─────────────────────────────────────────────────────────────────

export const summaryColumns = (criteria, sections) => [
  { key: 'position',  title: 'Position',  value: (s) => s.position.name },
  { key: 'evaluated', title: 'Evaluated', value: (s) => s.count },
  ...(sections.job !== 'hide'
    ? [{ key: 'job', title: 'Avg Job Performance', format: 'pct', numeric: true, value: (s) => s.job }]
    : []),
  ...(sections.behavior === 'breakdown'
    ? criteria.map((c) => ({
      key: `b_${c.id}`, title: c.name, format: 'rating', numeric: true, value: (s) => s.criteria[c.id] ?? null,
    }))
    : []),
  ...(sections.behavior !== 'hide'
    ? [{ key: 'behavior', title: 'Avg Work Personality / Behavior', format: 'num', numeric: true, value: (s) => s.behavior }]
    : []),
  ...(sections.demerit !== 'hide'
    ? [{ key: 'demerit', title: 'Avg Demerit', format: 'pct', numeric: true, value: (s) => s.demerit }]
    : []),
  { key: 'final',   title: 'Avg Final Grade', format: 'pct', numeric: true, strong: true, value: (s) => s.final },
  { key: 'highest', title: 'Highest',         format: 'pct', numeric: true, value: (s) => s.highest },
  { key: 'lowest',  title: 'Lowest',          format: 'pct', numeric: true, value: (s) => s.lowest },
];

// One entry per position with rows. Job / demerit breakdowns differ by
// position, so they come as lists (componentAverages / demeritAverages)
// rather than columns.
export const buildSummary = (data, rows) =>
  data.positions
    .map((position) => {
      const positionRows = rows.filter((r) => r.position_id === position.id);
      if (!positionRows.length) return null;

      const finals = positionRows.map((r) => r.final_score).filter((v) => v !== null);

      return {
        key:      position.id,
        position,
        count:    positionRows.length,
        job:      average(positionRows.map((r) => r.job_score)),
        behavior: average(positionRows.map((r) => r.behavior_score)),
        demerit:  position.demerits.length ? average(positionRows.map((r) => r.demerit)) : null,
        final:    average(finals),
        highest:  finals.length ? Math.max(...finals) : null,
        lowest:   finals.length ? Math.min(...finals) : null,
        criteria: Object.fromEntries(data.criteria.map((c) => [
          c.id, average(positionRows.map((r) => r.ratings?.[c.id] ?? null)),
        ])),
        componentAverages: position.components.map((c) => ({
          code: c.code, name: c.name,
          grade: average(positionRows.map((r) => r.components?.[c.code]?.grade ?? null)),
        })),
        demeritAverages: position.demerits.map((d) => ({
          code: d.code, name: d.name,
          deduction: average(positionRows.map((r) => r.demerits?.[d.code] ?? null)),
        })),
      };
    })
    .filter(Boolean);
