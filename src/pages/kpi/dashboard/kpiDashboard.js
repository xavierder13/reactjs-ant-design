// KPI Dashboard figures, from the Consolidated Report rows
// (GET /kpi/reports/consolidated — approved evaluations only, scoped to what
// the viewer may see). Everything is based on the evaluation's final grade
// (`final_score`, 0–100). Pure functions — no React.

// The KPI rating scale (same bands as the evaluation print form).
export const RATING_BANDS = [
  { label: 'Effective', min: 98, color: '#237804' },
  { label: 'Competent', min: 90, color: '#52c41a' },
  { label: 'Satisfactory', min: 85, color: '#1677ff' },
  { label: 'Average', min: 80, color: '#faad14' },
  { label: 'Needs Improvement', min: 75, color: '#fa8c16' },
  { label: 'Failed', min: -Infinity, color: '#f5222d' },
];

export const bandOf = (grade) => (grade == null ? null : RATING_BANDS.find((b) => grade >= b.min));

const round = (v) => (v == null ? null : Math.round(v * 100) / 100);
const average = (values) => (values.length ? round(values.reduce((s, v) => s + v, 0) / values.length) : null);

// rows → filtered rows. filters: { positionIds: [], branch, type: 'all'|'supervisor'|'self' }
export function filterRows(rows, filters = {}) {
  return (rows || []).filter((r) => r.final_score != null
    && (!filters.positionIds?.length || filters.positionIds.includes(r.position_id))
    && (!filters.branch || r.branch === filters.branch)
    && (!filters.type || filters.type === 'all' || r.evaluation_type === filters.type));
}

// One entry per employee + position: the average of their final grades in
// the period (an employee can have several approved evaluations — monthly).
export function employeeScores(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const key = `${r.employee_code || r.employee_name}|${r.position_id}`;
    const e = map.get(key) || {
      key, employee_code: r.employee_code, employee_name: r.employee_name, branch: r.branch || 'Unassigned',
      position_id: r.position_id, position: r.position || 'Unknown', grades: [], job: [], behavior: [], demerit: [], latest: null,
    };
    e.grades.push(r.final_score);
    e.job.push(r.job_score ?? 0);
    e.behavior.push(r.behavior_score ?? 0);
    e.demerit.push(r.demerit ?? 0);
    if (!e.latest || (r.period_end || '') > e.latest) e.latest = r.period_end;
    map.set(key, e);
  });
  return [...map.values()].map((e) => ({
    ...e, evaluations: e.grades.length, final: average(e.grades), job: average(e.job), behavior: average(e.behavior), demerit: average(e.demerit),
  }));
}

// Employees of one position ranked by final grade (ties share a rank).
export function rankPosition(scores, positionId) {
  const list = scores.filter((s) => s.position_id === positionId).sort((a, b) => b.final - a.final || a.employee_name.localeCompare(b.employee_name));
  let rank = 0;
  return list.map((s, i) => {
    if (i === 0 || s.final !== list[i - 1].final) rank = i + 1;
    return { ...s, rank };
  });
}

// Average final grade per group ('branch' | 'position'), over employees'
// averages (each employee counts once, however many evaluations they have).
export function averageBy(scores, field) {
  const groups = new Map();
  scores.forEach((s) => {
    const g = groups.get(s[field]) || { label: s[field], employees: 0, evaluations: 0, grades: [] };
    g.employees += 1;
    g.evaluations += s.evaluations;
    g.grades.push(s.final);
    groups.set(s[field], g);
  });
  return [...groups.values()].map((g) => ({
    label: g.label, employees: g.employees, evaluations: g.evaluations,
    average: average(g.grades), highest: Math.max(...g.grades), lowest: Math.min(...g.grades),
  })).sort((a, b) => b.average - a.average);
}

export function summarize(rows) {
  const scores = employeeScores(rows);
  const finals = scores.map((s) => s.final);
  const top = [...scores].sort((a, b) => b.final - a.final)[0] || null;
  const bottom = [...scores].sort((a, b) => a.final - b.final)[0] || null;
  return {
    evaluations: rows.length,
    employees: scores.length,
    average: average(finals),
    top, bottom,
    passing: scores.filter((s) => s.final >= 75).length,
    distribution: RATING_BANDS.map((b) => ({ ...b, count: scores.filter((s) => bandOf(s.final) === b).length })),
    scores,
  };
}
