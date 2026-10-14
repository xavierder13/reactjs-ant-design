import { Select } from 'antd';
import usePayrollCompanies from '../../../hooks/usePayrollCompanies';

// The employer a government report is for (the payslips' company) —
// cleared = all companies. Controlled: `value` (company id | null) /
// `onChange(id | null)`.
const CompanySelect = ({ value, onChange, style }) => {
  const { items, isLoading } = usePayrollCompanies();

  return (
    <Select
      allowClear
      showSearch={{ optionFilterProp: 'label' }}
      placeholder='All companies'
      loading={isLoading}
      value={value ?? undefined}
      onChange={(v) => onChange(v ?? null)}
      options={items.map((c) => ({ value: c.id, label: c.name }))}
      style={{ width: 260, maxWidth: '100%', ...style }}
    />
  );
};

export default CompanySelect;
