import { Tabs, Grid } from "antd";
import "./employeeTabs.css";

// Second-level tabs inside an Employee Master Data tab (Personal Data,
// Performance Management, Disciplinary). Compact card tabs by default;
// `vertical` (for long lists like Performance's 7 sub-tabs) turns them into
// a side menu from the `md` breakpoint up, falling back to card tabs on
// phones where a side menu would crush the content. Pass the usual Tabs
// props (items with `icon`, activeKey/onChange or defaultActiveKey).
export default function SubTabs({ vertical = false, ...props }) {
  const screens = Grid.useBreakpoint();
  const side = vertical && screens.md;

  return (
    <Tabs
      size="small"
      className="emd-subtabs"
      type={side ? "line" : "card"}
      tabPlacement={side ? "start" : "top"}
      styles={side
        ? { header: { minWidth: 220 }, content: { paddingTop: 4 } }
        : { header: { marginBottom: 16 } }}
      {...props}
    />
  );
}
