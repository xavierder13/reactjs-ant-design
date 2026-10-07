import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const GAP = 8; // space between the sticky bar and a section it scrolls to

// State for a tabbed dashboard (DashboardTabLayout): the active tab in the URL
// (?tab=, so refresh / Back / a shared link keep it), the sticky bar's height
// and stuck state, and scrolling to a section — even one on another tab
// (changeTab(key, sectionId)). Used by DashboardTabLayout, which owns it.
export default function useDashboardTabs(tabs) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = tabs.find((t) => t.key === searchParams.get('tab')) || tabs[0];
  const navRef = useRef(null);
  const sentinelRef = useRef(null);
  const [navHeight, setNavHeight] = useState(96);
  const [navStuck, setNavStuck] = useState(false);
  const [pendingSection, setPendingSection] = useState(null);

  // MainLayout's Content is the scrolling element.
  const container = () => sentinelRef.current?.closest('.ant-layout-content') || window;

  // Shadow under the bar only while it's stuck (its sentinel scrolled away).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setNavStuck(!entry.isIntersecting), {
      root: sentinel.closest('.ant-layout-content'), rootMargin: '-24px 0px 0px 0px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  });

  useEffect(() => {
    const el = navRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => setNavHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  });

  // Scroll so `el` sits just below the sticky bar.
  const scrollToElement = (el) => {
    const box = container();
    if (!el) return;
    if (box === window) { el.scrollIntoView({ behavior: 'smooth' }); return; }
    const top = box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - navHeight - GAP;
    box.scrollTo({ top, behavior: 'smooth' });
  };

  // A section requested on another tab: scroll once that tab has rendered.
  useEffect(() => {
    if (!pendingSection) return undefined;
    const timer = setTimeout(() => {
      scrollToElement(document.getElementById(pendingSection));
      setPendingSection(null);
    }, 50);
    return () => clearTimeout(timer);
  });

  const changeTab = (key, sectionId) => {
    setSearchParams((params) => { params.set('tab', key); return params; }, { replace: true });
    setPendingSection(sectionId || null);
    if (!sectionId) {
      // Back to the tab's top, without jumping above the bar if it isn't stuck yet.
      const box = container();
      const barTop = sentinelRef.current?.offsetTop ?? 0;
      if (box !== window && box.scrollTop > barTop) box.scrollTo({ top: barTop });
    }
  };

  return {
    activeTab, changeTab, scrollToElement, container,
    navRef, sentinelRef, navHeight, navStuck, offset: navHeight + GAP,
  };
}
