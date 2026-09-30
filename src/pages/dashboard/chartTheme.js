// Shared bar-chart look for the Workforce and Recruitment dashboards, so the
// same kind of chart reads the same on both pages.

// Lightens a #rrggbb color to how it looks at `alpha` opacity on the white
// surface, as a solid hex (so it can still take a hex alpha suffix).
export const soften = (hex, alpha = 0.65) => `#${[1, 3, 5]
  .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * alpha + 255 * (1 - alpha)).toString(16).padStart(2, '0'))
  .join('')}`;

// Categorical palette (blue, orange, aqua, yellow), assigned by entity in a
// fixed order, never by rank. Blue is the Recruitment Dashboard's bar blue
// (Age Group Distribution's rgba(22,119,255,0.65)); orange is #eb6834 at the
// same 65%, as are aqua and yellow. All four sit below 3:1 on the surface, so every chart writes its
// values out.
export const BLUE = soften('#1677ff');     // #68a7ff
export const ORANGE = soften('#eb6834');   // #f29d7b
// Hires — the Recruitment Dashboard's hired green, lightened the same way.
export const GREEN = soften('#389e0d');    // #7ec062
export const SERIES = [BLUE, ORANGE, soften('#1baf7a'), soften('#eda100')];
export const NEUTRAL = '#b8b7b1';       // "Unassigned" / "Not specified"

export const INK_SECONDARY = '#52514e';
export const GRID = '#ecebe7';

export const fmt = (n) => n.toLocaleString();
const MAX_LABEL = 28;
export const shorten = (label) => (label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label);

// Bar dataset styling (rounded end, flat base).
export const BAR = { borderRadius: 4, borderSkipped: 'start' };

// Legend for charts with two or more series.
export const LEGEND = { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } };

// Draws each bar's value just past its end — one label per bar, so no
// value depends on hovering.
export const endLabelsPlugin = {
  id: 'endLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const horizontal = chart.options.indexAxis === 'y';
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.fillStyle = INK_SECONDARY;
    chart.data.datasets.forEach((ds, di) => {
      chart.getDatasetMeta(di).data.forEach((bar, i) => {
        const value = ds.data[i];
        if (!value) return;
        if (horizontal) {
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(fmt(value), bar.x + 6, bar.y);
        } else {
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(fmt(value), bar.x, bar.y - 4);
        }
      });
    });
    ctx.restore();
  },
};

export const baseScales = (horizontal, stacked = false) => ({
  x: horizontal
    ? { stacked, beginAtZero: true, grid: { color: GRID }, border: { display: false }, ticks: { color: INK_SECONDARY, font: { size: 11 }, precision: 0 } }
    : { stacked, grid: { display: false }, ticks: { color: INK_SECONDARY, font: { size: 11 } } },
  // long category names are shortened on the axis; the tooltip keeps the full name
  y: horizontal
    ? { stacked, grid: { display: false }, ticks: { color: INK_SECONDARY, font: { size: 11 }, autoSkip: false, callback(value) { return shorten(this.getLabelForValue(value)); } } }
    : { stacked, beginAtZero: true, grid: { color: GRID }, border: { display: false }, ticks: { color: INK_SECONDARY, font: { size: 11 }, precision: 0 } },
});

// Stacked bar segments: rounded, with a 2px surface gap between segments
// (as the 100% share bar).
export const STACKED_BAR = { borderRadius: 4, borderSkipped: false, borderWidth: 1, borderColor: '#fff' };

// Dark ink on light fills, white on dark ones (#rrggbb[aa] or rgba(), alpha
// blended over the white surface).
export const textOn = (color) => {
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  const rgba = /rgba?\(([^)]+)\)/.exec(color);
  let [r, g, b, a] = [0, 0, 0, 1];
  if (hex) {
    [r, g, b] = [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
    a = hex[2] ? parseInt(hex[2], 16) / 255 : 1;
  } else if (rgba) {
    [r, g, b, a = 1] = rgba[1].split(',').map(Number);
  }
  const lum = [r, g, b].map((c) => c * a + 255 * (1 - a));
  return (0.299 * lum[0] + 0.587 * lum[1] + 0.114 * lum[2]) / 255 > 0.6 ? '#1f1f1d' : '#fff';
};

// Writes each stacked segment's value inside it, in a color readable on the
// segment; skipped when the segment is too small to hold it.
export const segmentLabelsPlugin = {
  id: 'segmentLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const horizontal = chart.options.indexAxis === 'y';
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((bar, i) => {
        const value = ds.data[i];
        const { x, y, base } = bar.getProps(['x', 'y', 'base'], true);
        const size = Math.abs((horizontal ? x : y) - base);
        if (!value || size < 18) return;
        ctx.fillStyle = textOn(ds.backgroundColor);
        ctx.fillText(fmt(value), horizontal ? (x + base) / 2 : x, horizontal ? y : (y + base) / 2);
      });
    });
    ctx.restore();
  },
};

// Trend lines: 2px, small points, gentle curve, no area fill.
export const LINE = { borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: 0.3 };

// `counts`: whole-number series that should start at zero.
export const lineScales = (suffix = '', counts = false) => ({
  x: { grid: { display: false }, ticks: { color: INK_SECONDARY, font: { size: 11 } } },
  y: {
    beginAtZero: counts, grid: { color: GRID }, border: { display: false },
    ticks: { color: INK_SECONDARY, font: { size: 11 }, ...(counts && { precision: 0 }), callback: (v) => `${fmt(v)}${suffix}` },
  },
});
