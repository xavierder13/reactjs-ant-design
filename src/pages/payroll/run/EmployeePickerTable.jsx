import { useMemo, useState } from 'react';
import { Table, Input, Select, Space, Button, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { tablePagination } from '../../../utils/tablePagination';

// Pick employees for a payroll (Generate Payroll → Selected employees,
// Generate Selected): a searchable, filterable table with checkboxes.
// Controlled `value` / `onChange` (employee ids) so it works inside a
// Form.Item. `candidates` is the cutoff_candidates / candidates list
// ({ id, employee_code, full_name, branch, position, in_run, eligible,
// approved }); null while loading. Approved (posted) payslips can't be
// ticked. A filter or search never drops a ticked employee — the count
// shows everyone ticked, and "Ticked only" lists them. `busy` (a generate
// running) locks every control and shows the table loading.
const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'ticked', label: 'Ticked only' },
  { value: 'in_run', label: 'In payroll' },
  { value: 'not_in_run', label: 'Not in payroll' },
  { value: 'not_eligible', label: 'No longer eligible' },
  { value: 'approved', label: 'Approved — locked' },
];

const matchesStatus = (c, status, ticked) => {
  switch (status) {
    case 'ticked': return ticked.has(c.id);
    case 'in_run': return c.in_run;
    case 'not_in_run': return !c.in_run && c.eligible;
    case 'not_eligible': return !c.eligible;
    case 'approved': return c.approved;
    default: return true;
  }
};

const EmployeePickerTable = ({ candidates, value = [], onChange, disabled: notReady = false, busy = false, showRunStatus = true, extra = null }) => {
  const disabled = notReady || busy;
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState(null);
  const [status, setStatus] = useState('all');

  const ticked = useMemo(() => new Set(value), [value]);
  const branches = useMemo(
    () => [...new Set((candidates || []).map((c) => c.branch).filter(Boolean))].sort().map((b) => ({ value: b, label: b })),
    [candidates],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (candidates || []).filter((c) => (
      (!q || `${c.employee_code} ${c.full_name} ${c.branch || ''} ${c.position || ''}`.toLowerCase().includes(q))
      && (!branch || c.branch === branch)
      && matchesStatus(c, status, ticked)
    ));
  }, [candidates, search, branch, status, ticked]);

  const selectable = shown.filter((c) => !c.approved);
  const tickShown = () => onChange?.([...new Set([...value, ...selectable.map((c) => c.id)])]);
  const untickShown = () => {
    const ids = new Set(shown.map((c) => c.id));
    onChange?.(value.filter((id) => !ids.has(id)));
  };

  const columns = [
    { title: 'Code', dataIndex: 'employee_code', sorter: (a, b) => String(a.employee_code).localeCompare(String(b.employee_code)) },
    { title: 'Employee', dataIndex: 'full_name', sorter: (a, b) => a.full_name.localeCompare(b.full_name) },
    { title: 'Branch', dataIndex: 'branch', render: (v) => v || '—' },
    { title: 'Position', dataIndex: 'position', render: (v) => v || '—' },
    {
      title: 'Status',
      key: 'status',
      render: (_, c) => (
        <Space size={4}>
          {c.approved && <Tag color='green'>Approved — locked</Tag>}
          {!c.eligible && <Tag color='orange'>No longer eligible</Tag>}
          {showRunStatus && !c.approved && c.eligible && (c.in_run ? <Tag>In payroll</Tag> : <Tag color='blue'>Not in payroll</Tag>)}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 8, width: '100%' }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder='Search code, name, branch, position'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
          disabled={disabled}
        />
        <Select
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          placeholder='All branches'
          options={branches}
          value={branch}
          onChange={(v) => setBranch(v ?? null)}
          style={{ width: 220 }}
          disabled={disabled}
        />
        <Select
          options={showRunStatus ? STATUS_OPTIONS : STATUS_OPTIONS.filter((o) => !['in_run', 'not_in_run'].includes(o.value))}
          value={status}
          onChange={setStatus}
          style={{ width: 170 }}
          disabled={disabled}
        />
      </Space>
      <Space wrap style={{ marginBottom: 8 }}>
        <Button size='small' disabled={disabled || !selectable.length} onClick={tickShown}>
          {`Tick shown (${selectable.length})`}
        </Button>
        <Button size='small' disabled={disabled || !shown.some((c) => ticked.has(c.id))} onClick={untickShown}>Untick shown</Button>
        {extra}
        <Button size='small' disabled={disabled || !value.length} onClick={() => onChange?.([])}>Clear all</Button>
        <Typography.Text type='secondary'>
          {`${value.length} of ${(candidates || []).length} employee${(candidates || []).length === 1 ? '' : 's'} ticked`}
        </Typography.Text>
      </Space>
      <Table
        rowKey='id'
        size='small'
        loading={busy || (!candidates && !notReady)}
        dataSource={shown}
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={tablePagination(10)}
        rowSelection={{
          selectedRowKeys: value,
          preserveSelectedRowKeys: true,
          onChange: (keys) => onChange?.(keys),
          getCheckboxProps: (c) => ({ disabled: disabled || c.approved }),
        }}
        onRow={(c) => ({
          onClick: (e) => {
            if (disabled || c.approved || e.target.closest('.ant-checkbox-wrapper, .ant-table-selection-column')) return;
            onChange?.(ticked.has(c.id) ? value.filter((id) => id !== c.id) : [...value, c.id]);
          },
          style: { cursor: disabled || c.approved ? 'default' : 'pointer' },
        })}
        locale={{ emptyText: notReady ? 'Choose the cut-off first' : 'No employee matches' }}
      />
    </div>
  );
};

export default EmployeePickerTable;
