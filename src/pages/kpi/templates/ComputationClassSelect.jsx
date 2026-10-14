import { Select } from 'antd';

// Computation Class picker for a template / demerit item row: the auto-grade
// classes vueportal has (GET kpi/computation-classes — classes under
// app/Services/KpiComputation, grouped by position folder). Empty = graded by
// hand. A saved path with no class any more stays visible, marked.
const ComputationClassSelect = ({ value, onChange, classes = [], loading = false }) => {
  const groups = classes.reduce((acc, c) => {
    (acc[c.group] = acc[c.group] || []).push({ value: c.value, label: c.name, title: c.value });
    return acc;
  }, {});
  const options = Object.entries(groups).map(([label, opts]) => ({ label, options: opts }));
  if (value && !loading && !classes.some((c) => c.value === value)) {
    options.unshift({ label: 'Not found', options: [{ value, label: `${value} (class not found)`, title: value }] });
  }

  return (
    <Select
      size='small'
      allowClear
      showSearch={{ optionFilterProp: 'label' }}
      placeholder='Manual entry'
      loading={loading}
      value={value || undefined}
      onChange={(v) => onChange(v || '')}
      options={options}
      popupMatchSelectWidth={false}
      style={{ width: 200 }}
    />
  );
};

export default ComputationClassSelect;
