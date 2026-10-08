import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Drawer, Dropdown, Empty, Grid, Typography, Tooltip, theme } from "antd";
import {
  BellOutlined, ReloadOutlined, FileDoneOutlined, AuditOutlined, UserAddOutlined, TeamOutlined,
  CommentOutlined, FormOutlined, SafetyOutlined, ScheduleOutlined, ExceptionOutlined, AlertOutlined,
  CalendarOutlined, SafetyCertificateOutlined, FieldTimeOutlined, LinkOutlined, RightOutlined, CheckCircleOutlined, TrophyOutlined, UserDeleteOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import notificationApi from "../services/notification/notificationApi";

const { Text } = Typography;

// How often the count refreshes while the app is open (no live push).
const REFRESH_MS = 5 * 60 * 1000;
const GROUP_ORDER = ["For approval", "Recruitment", "Employee relations", "Recommended"];

// One icon per NotificationService item key; unknown keys fall back to the bell.
const ICONS = {
  mrf_approval: <FileDoneOutlined />,
  kpi_approval: <AuditOutlined />,
  new_hired: <UserAddOutlined />,
  applied_today: <TeamOutlined />,
  initial_interview: <CommentOutlined />,
  iq_test: <FormOutlined />,
  bi: <SafetyOutlined />,
  final_interview: <CommentOutlined />,
  orientation: <ScheduleOutlined />,
  open_nte: <ExceptionOutlined />,
  open_disciplinary: <AlertOutlined />,
  regularization_interview_today: <CalendarOutlined />,
  to_regularize: <TrophyOutlined />,
  to_deactivate: <UserDeleteOutlined />,
  for_regularization: <SafetyCertificateOutlined />,
  mrf_overdue: <FieldTimeOutlined />,
  referral_codes: <LinkOutlined />,
};

// The header bell: the user's to-dos as counts, grouped; each row opens the
// list it counts. Action-based — rows drop off once the work is done, so
// there is no read/unread state. Refreshes on load, every REFRESH_MS, and on
// navigation (an action elsewhere may have cleared an item).
export default function NotificationBell() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [summary, setSummary] = useState({ total: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isPhone = screens.md === false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationApi.getSummary();
      if (data?.success) {
        setSummary({ total: data.total || 0, items: data.items || [] });
        setUpdatedAt(dayjs());
        setFailed(false);
      }
    } catch (error) {
      // The bell is secondary — keep the last counts, don't interrupt the page.
      console.error("[NotificationBell] load error:", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refresh = async () => { await load(); };
    refresh();
  }, [load, pathname]);

  useEffect(() => {
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const groups = GROUP_ORDER
    .map((group) => {
      const items = summary.items.filter((i) => i.group === group);
      return { group, items, count: items.reduce((sum, i) => sum + i.count, 0) };
    })
    .filter((g) => g.items.length);
  const urgent = summary.items.filter((i) => i.severity === "warning").reduce((sum, i) => sum + i.count, 0);

  const tone = (severity) => (severity === "warning"
    ? { color: token.colorWarning, background: token.colorWarningBg }
    : { color: token.colorPrimary, background: token.colorPrimaryBg });

  const panel = (
    <div
      style={isPhone ? { width: "100%", background: token.colorBgElevated } : {
        width: 380, maxWidth: "calc(100vw - 24px)", background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowSecondary, overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${token.colorSplit}` }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>Notifications</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {summary.total
                ? `${summary.total.toLocaleString()} to do${urgent ? ` · ${urgent.toLocaleString()} need action` : ""}`
                : "Nothing pending"}
            </Text>
          </div>
        </div>
        <Tooltip title={updatedAt ? `Updated ${updatedAt.format("h:mm A")}` : "Refresh"}>
          <Button type="text" size="small" icon={<ReloadOutlined />} loading={loading} onClick={load} aria-label="Refresh notifications" />
        </Tooltip>
      </div>

      <div style={{ maxHeight: 460, overflowY: "auto", padding: "4px 0" }}>
        {groups.length === 0 ? (
          <Empty
            image={<CheckCircleOutlined style={{ fontSize: 40, color: token.colorSuccess }} />}
            styles={{ image: { height: 44 } }}
            description={failed ? "Couldn't load notifications. Try refreshing." : "You're all caught up"}
            style={{ padding: "24px 0" }}
          />
        ) : groups.map(({ group, items, count }) => (
          <div key={group} style={{ padding: "6px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 16px" }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>{group}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{count.toLocaleString()}</Text>
            </div>
            {items.map((item) => {
              const { color, background } = tone(item.severity);
              return (
                <div
                  key={item.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => go(item.path)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(item.path); } }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = token.controlItemBgHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", cursor: "pointer", transition: "background 0.15s" }}
                >
                  <span
                    style={{
                      flex: "none", width: 32, height: 32, borderRadius: 8, display: "inline-flex",
                      alignItems: "center", justifyContent: "center", fontSize: 15, color, background,
                    }}
                  >
                    {ICONS[item.key] || <BellOutlined />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ display: "block" }} ellipsis>{item.label}</Text>
                    {item.description && <Text type="secondary" style={{ display: "block", fontSize: 12 }} ellipsis={{ tooltip: item.description }}>{item.description}</Text>}
                  </span>
                  <span style={{ flex: "none", minWidth: 28, padding: "0 8px", borderRadius: 11, lineHeight: "22px", textAlign: "center", fontSize: 12, fontWeight: 600, color, background }}>
                    {item.count > 999 ? "999+" : item.count.toLocaleString()}
                  </span>
                  <RightOutlined style={{ flex: "none", fontSize: 10, color: token.colorTextQuaternary }} />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ padding: "8px 16px", borderTop: `1px solid ${token.colorSplit}`, background: token.colorFillQuaternary }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Items clear on their own once the task is done.{updatedAt ? ` Updated ${updatedAt.format("h:mm A")}.` : ""}
        </Text>
      </div>
    </div>
  );

  const bellButton = (
      <Badge count={summary.total} size="small" overflowCount={99} offset={[-2, 5]}>
        <Button
          type="text"
          aria-label={`Notifications${summary.total ? ` (${summary.total})` : ""}`}
          icon={<BellOutlined style={{ color: "#389e0d", fontSize: 16 }} />}
          style={{
            background: "#f6ffed",
            border: "0.5px solid #d9f7be",
            borderRadius: 6,
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      </Badge>
  );

  // Phones: a full-width drawer from the top — a dropdown anchored at the
  // bell runs off the left edge there.
  if (isPhone) {
    return (
      <>
        <span onClick={() => setOpen(true)}>{bellButton}</span>
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          placement="top"
          size="auto"
          closable={false}
          styles={{ body: { padding: 0 }, header: { display: "none" }, section: { maxHeight: "80vh" } }}
        >
          {panel}
        </Drawer>
      </>
    );
  }

  return (
    <Dropdown popupRender={() => panel} trigger={["click"]} placement="bottomRight" open={open} onOpenChange={setOpen}>
      {bellButton}
    </Dropdown>
  );
}
