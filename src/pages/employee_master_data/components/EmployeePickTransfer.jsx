import { useEffect, useState } from 'react';
import { Transfer, Input, Space } from 'antd';
import employeeOptionApi from '../../../services/employee/employeeOptionApi';
import EmployeeTransferItem from '../../../components/EmployeeTransferItem';

const MAX_PAGES = 50; // option_list pages loaded for one branch / position / search

// Several employees picked with a two-list picker (like Group Shift
// Allocation): the left list loads the branch / position chosen above, or a
// search; the right list is the picked ones (kept when the filters change).
// value / onChange: employee ids. `status` (All | Active | Inactive) limits
// the list.
export default function EmployeePickTransfer({ value = [], onChange, branchId, positionId, status = 'All' }) {
  const [search, setSearch] = useState('');
  const [list, setList] = useState([]);
  const [known, setKnown] = useState({}); // id → item, so picked ones keep their labels
  const [loading, setLoading] = useState(false);
  const needsFilter = !branchId && !positionId && !search;

  useEffect(() => {
    if (needsFilter) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const fetch = status === 'Active' ? employeeOptionApi.getActive : employeeOptionApi.getAll;
        let items = [];
        for (let page = 1; page <= MAX_PAGES; page += 1) {
          const { data } = await fetch({
            search, page,
            ...(branchId ? { branch_id: branchId } : {}),
            ...(positionId ? { position_id: positionId } : {}),
          });
          items = items.concat(data.employees);
          if (!data.next_page_url || cancelled) break;
        }
        if (cancelled) return;
        const rows = items
          .filter((e) => status !== 'Inactive' || !e.active)
          .map((e) => ({
            key: e.id,
            title: `${e.employee_code} - ${e.full_name}`,
            description: `${e.position_name || 'No position'}${e.branch_name ? ` · ${e.branch_name}` : ''}${e.active ? '' : ' · Inactive'}`,
          }));
        setList(rows);
        setKnown((k) => ({ ...k, ...Object.fromEntries(rows.map((r) => [r.key, r])) }));
      } catch {
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [needsFilter, branchId, positionId, search, status]);

  const shown = needsFilter ? [] : list;
  const shownKeys = new Set(shown.map((r) => r.key));
  const dataSource = [...value.filter((id) => !shownKeys.has(id)).map((id) => known[id] || { key: id, title: `#${id}`, description: '' }), ...shown];

  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        <Input.Search placeholder='Search code or name' allowClear onSearch={(v) => setSearch(v.trim())} style={{ width: 240 }} />
      </Space>
      <Transfer
        dataSource={dataSource}
        targetKeys={value}
        onChange={(keys) => onChange?.(keys)}
        titles={['Employees', 'Selected']}
        showSearch
        filterOption={(input, item) => `${item.title} ${item.description}`.toLowerCase().includes(input.toLowerCase())}
        className='employee-transfer'
        render={(item) => <EmployeeTransferItem item={item} />}
        styles={{ section: { width: 'calc(50% - 20px)', height: 340 } }}
        locale={{ notFoundContent: [needsFilter ? 'Pick a branch or position above, or search, to list employees.' : (loading ? 'Loading…' : 'No employees'), 'None selected yet'] }}
      />
    </div>
  );
}
