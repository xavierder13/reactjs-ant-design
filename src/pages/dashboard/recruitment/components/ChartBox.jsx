import { Doughnut, Bar, Line } from 'react-chartjs-2';
import '../chartSetup';

// Fixed-height wrapper so a chart never collapses or overflows its card.
export default function ChartBox({ type, data, options, height = 240, plugins }) {
  if (!data) return null;
  const ChartComp = type === 'doughnut' ? Doughnut : type === 'line' ? Line : Bar;
  return (
    <div style={{ height }}>
      <ChartComp data={data} options={{ ...options, responsive: true, maintainAspectRatio: false }} plugins={plugins} />
    </div>
  );
}
