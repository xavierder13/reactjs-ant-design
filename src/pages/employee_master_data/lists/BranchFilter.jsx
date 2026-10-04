import { Select } from "antd";
import useEmployeeFormOptions from "../../../hooks/useEmployeeFormOptions";

// Branch filter for the segment/queue lists. The backends filter on the
// branch *name* (`search_branch`, 'All Branches' or empty = no filter), so
// the value is the name, not the id.
export default function BranchFilter({ value, onChange, style }) {
  // Module-gated options (/employee_master_data/create) — /branch/index
  // needs branch-list, which HR roles don't have.
  const { branchOptions, isLoading } = useEmployeeFormOptions();

  return (
    <Select
      value={value || undefined}
      onChange={(v) => onChange(v || "")}
      placeholder="All Branches"
      allowClear
      showSearch
      loading={isLoading}
      style={{ width: 200, ...style }}
      options={branchOptions.map((b) => ({ label: b.label, value: b.label }))}
      filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
    />
  );
}
