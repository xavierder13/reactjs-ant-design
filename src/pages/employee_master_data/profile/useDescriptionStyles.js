import { theme } from "antd";

// Spread onto <Descriptions>: label above value, label muted and small,
// value in the regular text color with medium weight.
export default function useDescriptionStyles() {
  const { token } = theme.useToken();
  return {
    layout: "vertical",
    size: "small",
    colon: false,
    styles: {
      label: { color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.4, paddingBottom: 0 },
      content: { color: token.colorText, fontWeight: 500, lineHeight: 1.4, paddingBottom: 8 },
    },
  };
}
