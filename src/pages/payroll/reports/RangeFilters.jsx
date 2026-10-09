import { DatePicker, Select, Space, Radio } from 'antd';
import useCompanies from '../../../hooks/useCompanies';
import useBranches from '../../../hooks/useBranches';
import usePositions from '../../../hooks/usePositions';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { cutoffLabel } from '../payrollHelpers';
import EmployeeSelect from '../../manpower_request/request/EmployeeSelect';

// The filters of the range reports (Contribution History, Pay Sheet):
// a date range or a cut-off range (approved payrolls whose cut-off ENDS in
// it, at most one year), company / branch / position (the employee's
// current ones) and employees. Controlled: `value` / `onChange(next)`;
// defaultRangeFilters / rangeParams / useRangeCutoffs in rangeHelpers.
const RangeFilters = ({ value, onChange, cutoffs, employees = true }) => {
  const { items: companies } = useCompanies();
  const { branches } = useBranches();
  const { positionOptions } = usePositions();
  const set = (patch) => onChange({ ...value, ...patch });
  const cutoffOpts = cutoffs.map((c) => ({ value: c.id, label: cutoffLabel(c) }));
  const branchOpts = branches
    .filter((b) => !value.company_id || Number(b.company_id) === Number(value.company_id))
    .map((b) => ({ value: b.id, label: b.name }));

  return (
    <Space wrap>
      <Radio.Group
        optionType='button'
        value={value.mode}
        onChange={(e) => set({ mode: e.target.value })}
        options={[{ value: 'dates', label: 'Dates' }, { value: 'cutoffs', label: 'Cut-offs' }]}
      />
      {value.mode === 'dates' ? (
        <DatePicker.RangePicker value={value.dates} onChange={(v) => set({ dates: v })} format={DISPLAY_DATE_FORMAT} allowClear={false} />
      ) : (
        <>
          <Select style={{ width: 230 }} placeholder='From cut-off' value={value.cutoffFrom} onChange={(v) => set({ cutoffFrom: v })} options={cutoffOpts} showSearch={{ optionFilterProp: 'label' }} />
          <Select style={{ width: 230 }} placeholder='To cut-off' value={value.cutoffTo} onChange={(v) => set({ cutoffTo: v })} options={cutoffOpts} showSearch={{ optionFilterProp: 'label' }} />
        </>
      )}
      <Select
        allowClear
        style={{ width: 180 }}
        placeholder='Company'
        value={value.company_id}
        onChange={(v) => set({ company_id: v ?? null, branch_id: null })}
        options={companies.map((c) => ({ value: c.id, label: c.name }))}
        showSearch={{ optionFilterProp: 'label' }}
      />
      <Select allowClear style={{ width: 180 }} placeholder='Branch' value={value.branch_id} onChange={(v) => set({ branch_id: v ?? null })} options={branchOpts} showSearch={{ optionFilterProp: 'label' }} />
      <Select allowClear style={{ width: 180 }} placeholder='Position' value={value.position_id} onChange={(v) => set({ position_id: v ?? null })} options={positionOptions} showSearch={{ optionFilterProp: 'label' }} />
      {employees && (
        <div style={{ minWidth: 260 }}>
          <EmployeeSelect multiple value={value.employees} onChange={(v) => set({ employees: v || [] })} placeholder='All employees' />
        </div>
      )}
    </Space>
  );
};

export default RangeFilters;
