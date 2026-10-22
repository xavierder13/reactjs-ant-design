import { Button, Space, Typography, theme } from "antd";
import { CheckCircleFilled, CloseOutlined } from "@ant-design/icons";

// The bar above the employee table while rows are selected: the count and
// Clear selection on the left, the bulk actions (`children`) on the right.
// Wraps under the count on narrow screens.
const SelectionBar = ({ count, onClear, children }) => {
  const { token } = theme.useToken();

  return (
    <div
      role="region"
      aria-label="Selected employees"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 16,
        padding: "8px 12px",
        background: token.colorPrimaryBg,
        border: `1px solid ${token.colorPrimaryBorder}`,
        borderRadius: token.borderRadiusLG,
      }}
    >
      <Space size={8} wrap>
        <CheckCircleFilled style={{ color: token.colorPrimary, fontSize: 16 }} />
        <Typography.Text>
          <Typography.Text strong>{count}</Typography.Text> employee{count === 1 ? "" : "s"} selected
        </Typography.Text>
        <Button type="link" size="small" icon={<CloseOutlined />} onClick={onClear} style={{ paddingInline: 4 }}>
          Clear selection
        </Button>
      </Space>
      {children && <Space size={8} wrap>{children}</Space>}
    </div>
  );
};

export default SelectionBar;
