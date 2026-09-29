// Chart.js registration + shared options/colors for the Recruitment Dashboard
// components (vueportal dashboard/components/*.vue equivalents).
import {
  Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Legend, Filler, Tooltip,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Legend, Filler, Tooltip);

export const PRIMARY_GREEN = '#389e0d';
export const STAGE_COLORS = ['#1677ff', '#FB8C00', '#9C27B0', '#009688', '#CDDC39', '#00BCD4', '#607D8B', '#4CAF50'];
export const CHART_COLORS = ['#389e0d', '#1677ff', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96', '#2f54eb', '#a0d911', '#52c41a'];
// PipelineStageCards.vue vuetifyColor → hex
export const STAGE_COLOR_MAP = {
  'Screening': '#FB8C00', 'Initial Interview': '#9C27B0', 'Exam': '#009688',
  'B.I & Basic Req': '#CDDC39', 'Final Interview': '#00BCD4', 'Orientation': '#607D8B', 'Hired': '#4CAF50',
};

export const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
    y: { ticks: { color: '#888', font: { size: 10 } } },
  },
};

export const CHART_OPTS_LEGEND = {
  ...CHART_OPTS,
  plugins: { ...CHART_OPTS.plugins, legend: { display: true, labels: { font: { size: 11 }, boxWidth: 10, padding: 12 } } },
};

export const CHART_OPTS_STACKED = {
  ...CHART_OPTS,
  plugins: { ...CHART_OPTS.plugins, legend: { display: true, labels: { font: { size: 10 }, boxWidth: 9, padding: 8 } } },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
    y: { stacked: true, ticks: { color: '#888', font: { size: 10 } } },
  },
};

export const DOUGHNUT_OPTS = (cutout) => ({
  responsive: true, maintainAspectRatio: false, cutout,
  plugins: { legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 9, padding: 6 } } },
});

export const getRankColor = (rank) => (rank === 1 ? '#faad14' : rank === 2 ? '#1677ff' : rank === 3 ? '#722ed1' : '#888');

export const conversionColor = (current, previous, pct) => {
  const rate = pct(current, previous);
  if (rate >= 70) return 'success';
  if (rate >= 40) return 'warning';
  return 'error';
};
