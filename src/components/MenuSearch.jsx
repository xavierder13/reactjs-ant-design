// src/components/MenuSearch.jsx
// App-wide menu search: type part of a page's name (or its section, e.g.
// "leave", "setup branches") and pick it to open the page. `items` are the
// sidebar entries the user can see, flattened by MainLayout — so the search
// never offers a page the menu hides. Ctrl+K / ⌘K focuses it.

import * as React from 'react';
import { AutoComplete, ConfigProvider, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

const MAX_RESULTS = 12;

// light-green highlight for the hovered / keyboard-active result — scoped to
// this search, not every Select in the app
const SEARCH_THEME = {
  components: {
    Select: {
      optionActiveBg: '#d9f7be',
      optionSelectedBg: '#d9f7be',
    },
  },
};

// every word typed must appear in the entry's section path or title
const matches = (item, words) => {
  const haystack = [...item.path, item.title].join(' ').toLowerCase();
  return words.every((w) => haystack.includes(w));
};

const MenuSearch = ({ items, onPick, style, placeholder = 'Search menu…', autoFocus = false, popupWidth = 320 }) => {
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const options = React.useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return items
      .filter((item) => matches(item, words))
      .slice(0, MAX_RESULTS)
      .map((item) => ({
        value: item.key,
        label: (
          <div style={{ lineHeight: 1.3, padding: '2px 0' }}>
            <div style={{ fontSize: 13 }}>{item.title}</div>
            {item.path.length > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>{item.path.join(' › ')}</Text>
            )}
          </div>
        ),
      }));
  }, [items, query]);

  const handleSelect = (key) => {
    const item = items.find((i) => i.key === key);
    setQuery('');
    inputRef.current?.blur();
    if (item) onPick(item);
  };

  return (
    <ConfigProvider theme={SEARCH_THEME}>
      <AutoComplete
        ref={inputRef}
        value={query}
        onChange={setQuery}
        onSelect={handleSelect}
        options={options}
        notFoundContent={query.trim() ? 'No matching page' : null}
        popupMatchSelectWidth={popupWidth}
        autoFocus={autoFocus}
        allowClear
        prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
        placeholder={placeholder}
        aria-label="Search menu"
        style={style}
      />
    </ConfigProvider>
  );
};

export default MenuSearch;
