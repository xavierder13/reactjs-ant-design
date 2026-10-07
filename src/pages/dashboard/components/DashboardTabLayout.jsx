import { Typography } from 'antd';
import DashboardNav from './DashboardNav';
import useDashboardTabs from './useDashboardTabs';
import RecruitmentSectionLabel from '../recruitment/components/SectionLabel';

const { Title, Text } = Typography;
const GREEN = '#389e0d';

// The tabbed body of a dashboard: the sticky bar (DashboardNav, `top: -24`
// inside MainLayout's scrolling Content), the active tab's intro (light
// green), and only the active tab's sections (`renderSection(id)`; a
// section's `extra` is shown at the right of its label). Owns the tab state
// (useDashboardTabs); `renderSection(id, { changeTab })` can open another
// tab's section, e.g. a scorecard tile.
//   tabs: [{ key, label, icon, description, badge?, sections: [{ id, title, extra? }] }]
//   nav: DashboardNav props (chips, period, emptyText, onClearFilter, onShowFilters, jumpMin)
//   SectionLabel: the page's own section heading (takes `extra`)
export default function DashboardTabLayout({ tabs, nav, renderSection, SectionLabel = RecruitmentSectionLabel }) {
  const { activeTab, changeTab, scrollToElement, container, navRef, sentinelRef, navStuck, offset } = useDashboardTabs(tabs);
  return (
    <>
      <div ref={sentinelRef} />
      <div
        ref={navRef}
        style={{
          position: 'sticky', top: -24, zIndex: 20, background: '#fff', margin: '0 -24px 16px', padding: '0 24px',
          borderBottom: '1px solid #f0f0f0', transition: 'box-shadow 0.2s',
          boxShadow: navStuck ? '0 6px 12px -8px rgba(0, 0, 0, 0.18)' : 'none',
        }}
      >
        <DashboardNav
          {...nav}
          tabs={tabs}
          activeTab={activeTab.key}
          onTabChange={(key) => changeTab(key)}
          sections={activeTab.sections}
          getContainer={container}
          offset={offset}
          onJump={(id) => scrollToElement(document.getElementById(id))}
        />
      </div>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', borderRadius: 8,
          background: '#f6ffed', borderLeft: `4px solid ${GREEN}`,
        }}
      >
        <span style={{ fontSize: 20, color: GREEN, display: 'inline-flex' }}>{activeTab.icon}</span>
        <div>
          <Title level={5} style={{ margin: 0, color: GREEN }}>{activeTab.label}</Title>
          <Text type='secondary' style={{ fontSize: 13 }}>{activeTab.description}</Text>
        </div>
      </div>

      {activeTab.sections.map((section) => (
        <section key={section.id} id={section.id} style={{ scrollMarginTop: offset, marginBottom: 8 }}>
          <SectionLabel extra={section.extra}>{section.title}</SectionLabel>
          {renderSection(section.id, { changeTab })}
        </section>
      ))}
    </>
  );
}
