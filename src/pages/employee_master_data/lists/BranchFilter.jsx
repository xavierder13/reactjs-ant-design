import { Select } from "antd";
import useBranches from "../../../hooks/useBranches";

// Branch filter for the segment/queue lists. The backends filter on the
// branch *name* (`search_branch`, 'All Branches' or empty = no filter), so
// the value is the name, not the id.
export default function BranchFilter({ value, onChange, style }) {
  const { branches, isLoading } = useBranches();

  return (
    <Select
      value={value || undefined}
      onChange={(v) => onChange(v || "")}
      placeholder="All Branches"
      allowClear
      showSearch
      loading={isLoading}
      style={{ width: 200, ...style }}
      options={branches.map((b) => ({ label: b.name, value: b.name }))}
      filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
    />
  );
}
