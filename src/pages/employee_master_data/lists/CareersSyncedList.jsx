import { Tag } from "antd";

import employeeApi from "../../../services/employee/employeeApi";
import { EMPLOYEE_COLUMNS } from "../components/employeeColumns";
import EmployeeSegmentList from "./EmployeeSegmentList";

// Employees synced from the careers portal (New Hired → Sync) that still carry
// the placeholder employee code 'careers-<applicant id>' — the main list's
// rows (index() + careers_synced), so View/Edit/Delete/Add all work the same.
// A row drops off once HR gives the employee their real code; until then HR
// checks the Employment Type and the agency tag here too.

// The main list's defaults plus Date Employed and Employment Type.
const DEFAULT_COLUMNS = EMPLOYEE_COLUMNS.filter((c) => [
  "branch.name", "employee_code", "last_name", "first_name", "middle_name",
  "position.name", "date_employed", "employment_type", "active",
].includes(c.value));

// Always shown (outside the picker, so it never reaches the backend search):
// the employment source of the latest Branch Assignment & Positions row.
// Synced hires start with no rows, so "No assignment" means not tagged yet.
const latestAssignment = (rows = []) => [...rows].sort((a, b) => (
  String(a.date_assigned).localeCompare(String(b.date_assigned)) || a.id - b.id
)).at(-1);

const AGENCY_TAG_COLUMN = {
  title: "Employment Source",
  dataIndex: "branch_assignment_positions",
  value: "branch_assignment_positions",
  render: (rows) => {
    const latest = latestAssignment(rows);
    if (!latest) return <Tag>No assignment</Tag>;
    return latest.employment_source === "agency"
      ? <Tag color="orange">Agency{latest.agency_name ? ` · ${latest.agency_name}` : ""}</Tag>
      : <Tag color="green">Direct</Tag>;
  },
};

export default function CareersSyncedList() {
  return (
    <EmployeeSegmentList
      title="Synced from Careers"
      fetchPage={employeeApi.getCareersSynced}
      positionFilter
      showCreate
      defaultColumns={DEFAULT_COLUMNS}
      extraColumns={[AGENCY_TAG_COLUMN]}
    />
  );
}
