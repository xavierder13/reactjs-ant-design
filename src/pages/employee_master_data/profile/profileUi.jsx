import { Card, theme } from "antd";

// Shared look for the profile's sections (see also useDescriptionStyles.js): a card whose title carries a small
// icon badge in the theme's primary tint, and Descriptions with muted labels
// above bold values. Colors come from the theme tokens, so they follow
// App.jsx's colorPrimary.

export function IconBadge({ icon, size = 28 }) {
  const { token } = theme.useToken();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: 8,
        background: token.colorPrimaryBg,
        color: token.colorPrimary,
        fontSize: Math.round(size / 2),
      }}
    >
      {icon}
    </span>
  );
}

export function SectionCard({ icon, title, extra, children, style }) {
  return (
    <Card
      size="small"
      title={(
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <IconBadge icon={icon} />
          <span>{title}</span>
        </span>
      )}
      extra={extra}
      style={{ height: "100%", borderRadius: 12, ...style }}
      styles={{ header: { padding: "10px 16px", minHeight: 52 }, body: { padding: "12px 16px 4px" } }}
    >
      {children}
    </Card>
  );
}
