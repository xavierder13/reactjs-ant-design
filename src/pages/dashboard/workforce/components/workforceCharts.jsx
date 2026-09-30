import { Typography, Tooltip as AntTooltip } from 'antd';
import {
  Chart as ChartJS, BarElement, LineElement, PointElement, CategoryScale, LinearScale,
  Legend, Tooltip, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { SERIES, GREEN, NEUTRAL, GRID, LINE, fmt, endLabelsPlugin, baseScales, lineScales } from '../../chartTheme';

ChartJS.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip, Filler);

const { Text } = Typography;

const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

// One-hue bar chart (magnitude by category). Horizontal for many / long
// labels; height grows with the row count so the axis band never clips.
// `colorOf(row)` overrides the color per row (e.g. by separation type).
export function CountBarChart({ rows, horizontal = true, label = 'Employees', color = SERIES[0], colorOf }) {
  const height = horizontal ? Math.max(160, rows.length * 26 + 40) : 240;
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels: rows.map((r) => r.label),
          datasets: [{
            label,
            data: rows.map((r) => r.count),
            backgroundColor: rows.map((r) => (/^(Unassigned|Unknown|Not specified)$/.test(r.label) ? NEUTRAL : (colorOf?.(r) || color))),
            borderRadius: 4,
            borderSkipped: 'start',
            maxBarThickness: 18,
          }],
        }}
        options={{
          indexAxis: horizontal ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: horizontal ? { right: 44 } : { top: 18 } },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${fmt(c.raw)} ${label.toLowerCase()}` } } },
          scales: baseScales(horizontal),
        }}
        plugins={[endLabelsPlugin]}
      />
    </div>
  );
}

// Part-to-whole as one horizontal 100% bar (not a pie): segments in fixed
// entity order with a 2px surface gap, and a legend that writes out each
// count and share. `order` pins colors to entities; `colors` swaps in the
// caller's palette.
export function ShareBar({ rows, order, colors = SERIES }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.count]));
  const known = order.filter((l) => byLabel[l]);
  const rest = rows.filter((r) => !order.includes(r.label) && r.count);
  const segments = [
    ...known.map((l, i) => ({ label: l, count: byLabel[l], color: colors[i % colors.length] })),
    ...rest.map((r) => ({ label: r.label, count: r.count, color: NEUTRAL })),
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, height: 14, borderRadius: 4, overflow: 'hidden', background: GRID }}>
        {segments.map((s) => (
          <AntTooltip key={s.label} title={`${s.label}: ${fmt(s.count)} (${pct(s.count, total)}%)`}>
            <div style={{ width: `${pct(s.count, total)}%`, minWidth: 3, background: s.color }} />
          </AntTooltip>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 16, rowGap: 4, marginTop: 8 }}>
        {segments.map((s) => (
          <span key={s.label} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: s.color, marginRight: 6 }} />
            <Text>{s.label}</Text>{' '}
            <Text type='secondary'>{fmt(s.count)} · {pct(s.count, total)}%</Text>
          </span>
        ))}
      </div>
    </div>
  );
}

// Hires vs separations per month — two series, one axis, legend on.
export function MovementBarChart({ months }) {
  return (
    <div style={{ height: 260 }}>
      <Bar
        data={{
          labels: months.map((m) => m.label),
          datasets: [
            { label: 'Hires', data: months.map((m) => m.hires), backgroundColor: GREEN, borderRadius: 4, borderSkipped: 'start', maxBarThickness: 14 },
            { label: 'Separations', data: months.map((m) => m.separations), backgroundColor: SERIES[1], borderRadius: 4, borderSkipped: 'start', maxBarThickness: 14 },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } } },
          scales: baseScales(false),
        }}
      />
    </div>
  );
}

// Single-series trend line (headcount, turnover %) with a crosshair tooltip.
export function TrendLineChart({ months, field, label, suffix = '', color = SERIES[0] }) {
  return (
    <div style={{ height: 220 }}>
      <Line
        data={{
          labels: months.map((m) => m.label),
          datasets: [{
            label,
            data: months.map((m) => m[field]),
            borderColor: color,
            backgroundColor: color,
            ...LINE,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${label}: ${fmt(c.raw)}${suffix}` } } },
          scales: lineScales(suffix),
        }}
      />
    </div>
  );
}

// Counts per month for one or more series of the same unit (one axis;
// legend only when there are two or more series).
export function MonthlyCountChart({ months, series }) {
  return (
    <div style={{ height: 240 }}>
      <Bar
        data={{
          labels: months.map((m) => m.label),
          datasets: series.map((s, i) => ({
            label: s.label, data: months.map((m) => m[s.field]), backgroundColor: SERIES[i],
            borderRadius: 4, borderSkipped: 'start', maxBarThickness: 16,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          layout: { padding: { top: 18 } },
          plugins: {
            legend: { display: series.length > 1, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
          },
          scales: baseScales(false),
        }}
        plugins={series.length === 1 ? [endLabelsPlugin] : []}
      />
    </div>
  );
}
