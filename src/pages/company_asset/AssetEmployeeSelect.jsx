import { useEffect, useState } from 'react';
import { Select } from 'antd';
import companyAssetApi from '../../services/company_asset/companyAssetApi';
import { fullName } from './companyAssetHelpers';

// Active-employee picker for assigning an asset — the module's own lookup
// (company_asset/employee_options: company-asset-create / -assign), searched
// on the server (code / first / last name), 20 at a time. `initialOption`
// labels an already-chosen employee.
const AssetEmployeeSelect = ({ value, onChange, initialOption }) => {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await companyAssetApi.employeeOptions({ search: search || undefined, items_per_page: 20 });
        if (!cancelled) setOptions(data.employees.data.map((e) => ({ value: e.id, label: `${e.employee_code} - ${fullName(e)}` })));
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  const all = initialOption && !options.some((o) => o.value === initialOption.value) ? [initialOption, ...options] : options;

  return (
    <Select
      value={value}
      onChange={onChange}
      loading={loading}
      placeholder='Search code or name'
      showSearch={{ filterOption: false, onSearch: setSearch }}
      options={all}
      notFoundContent={loading ? 'Loading…' : 'No active employee'}
      style={{ width: '100%' }}
    />
  );
};

export default AssetEmployeeSelect;
