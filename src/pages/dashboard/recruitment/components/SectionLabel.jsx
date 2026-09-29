export default function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, color: '#aaa', letterSpacing: 1.5, textTransform: 'uppercase',
      borderBottom: '1px solid #e8e8e8', paddingBottom: 6, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}
