import { Tabs, Tag, Button, Anchor, Select, Grid, Typography, Badge, theme } from 'antd';
import { FilterOutlined, CalendarOutlined } from '@ant-design/icons';

const { Text } = Typography;

// A tabbed dashboard's sticky bar (Recruitment and Workforce Dashboards):
// tabs (icon, label, optional live count), a Filters button with the
// active-filter count, the period and the filters in effect (each
// removable), and — in a tab with `jumpMin` or more sections — jump links to
// its sections (pill-styled AntD Anchor on md+, a "Jump to…" select on
// phones; `.rd-jump` in index.css).
//   chips: [{ key, label, value }] — the filters in effect
//   period: text for the date tag, or null to hide it
//   getContainer: the scrolling element (MainLayout's Content)
//   offset: this bar's height, so a section lands just below it
export default function DashboardNav({
  tabs, activeTab, onTabChange, sections, chips = [], period, emptyText, onClearFilter, onShowFilters,
  getContainer, offset, onJump, jumpMin = 4,
}) {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const showJump = sections.length >= jumpMin;

  // Icon, label, and an optional count chip styled like the green "records
  // loaded" tag (AntD success colors). The active tab is AntD's default
  // (green label + ink bar).
  const tabLabel = (t) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {t.icon}
      <span>{t.label}</span>
      {t.badge != null && (
        <span
          style={{
            fontSize: 11, fontWeight: 600, lineHeight: '18px', minWidth: 22, padding: '0 7px', borderRadius: 9, textAlign: 'center',
            color: token.colorSuccess, background: token.colorSuccessBg,
          }}
        >
          {t.badge.toLocaleString()}
        </span>
      )}
    </span>
  );

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        size={screens.md ? 'large' : 'middle'}
        items={tabs.map((t) => ({ key: t.key, label: tabLabel(t) }))}
        tabBarStyle={{ marginBottom: 0 }}
        tabBarExtraContent={{
          right: (
            <Badge count={chips.length} size='small' offset={[-4, 2]}>
              <Button icon={<FilterOutlined />} onClick={onShowFilters} size='small' style={{ marginLeft: 12 }}>
                {screens.sm ? 'Filters' : null}
              </Button>
            </Badge>
          ),
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '8px 0' }}>
        {period && <Tag icon={<CalendarOutlined />} variant='filled' style={{ marginInlineEnd: 0, background: token.colorFillTertiary }}>{period}</Tag>}
        {chips.length === 0
          ? <Text type='secondary' style={{ fontSize: 12 }}>{emptyText}</Text>
          : chips.map((c) => (
            <Tag
              key={c.key}
              color='green'
              closable
              onClose={(e) => { e.preventDefault(); onClearFilter(c.key); }}
              style={{ marginInlineEnd: 0 }}
            >
              <Text type='secondary' style={{ fontSize: 11 }}>{c.label}:</Text> {c.value}
            </Tag>
          ))}
      </div>

      {showJump && (screens.md ? (
        <div style={{ paddingBottom: 10 }}>
          <Anchor
            key={activeTab}
            className='rd-jump'
            direction='horizontal'
            affix={false}
            replace
            getContainer={getContainer}
            targetOffset={offset}
            items={sections.map((s) => ({ key: s.id, href: `#${s.id}`, title: s.title }))}
          />
        </div>
      ) : (
        <Select
          size='small'
          placeholder='Jump to section…'
          value={null}
          style={{ width: '100%', marginBottom: 8 }}
          options={sections.map((s) => ({ label: s.title, value: s.id }))}
          onChange={onJump}
        />
      ))}
    </div>
  );
}
