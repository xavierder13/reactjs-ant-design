// Uppercase section heading with an optional right-hand note.
export default function SectionLabel({ children, extra }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      borderBottom: '1px solid #e8e8e8', paddingBottom: 6, margin: '24px 0 12px',
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#8c8c8c', letterSpacing: 1.5, textTransform: 'uppercase' }}>{children}</span>
      {extra}
    </div>
  );
}
