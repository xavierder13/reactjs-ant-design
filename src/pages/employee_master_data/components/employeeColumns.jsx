import { Tag } from "antd";
import { formatDate } from "../../../utils/formatDate";
import { isActiveValue } from "../../../utils/employeeStatus";

// Employee Master Data list columns — shared by the main list and the
// segment lists (Hired This Month, For Regularization), which all read
// rows from the backend's getEmployees() base query. `value` is sent as
// `table_headers` and drives the backend search — see the
// "$table_fields Whitelist Trap" in the employee-master-data skill before
// adding one.
export const EMPLOYEE_COLUMNS = [
  {
    title: "Branch",
    dataIndex: "branch",
    value: "branch.name",
    sorter: true,
    render: (branch) => branch?.name || "-"
  },
  {
    title: "Company",
    dataIndex: "branch",
    value: "branch.company.name",
    sorter: true,
    render: (branch) => branch?.company?.name || "-"
  },
  { title: "Emp. Code", dataIndex: "employee_code", value: "employee_code" },
  { title: "Job Title Code", dataIndex: "job_title_code", value: "job_title_code" },
  { title: "Lastname", dataIndex: "last_name", value: "last_name" },
  { title: "Firstname", dataIndex: "first_name", value: "first_name" },
  { title: "Middlename", dataIndex: "middle_name", value: "middle_name" },
  { title: "Birthday", dataIndex: "dob", value: "dob", render: (v) => formatDate(v) },
  { title: "Address", dataIndex: "address", value: "address" },
  { title: "Contact #", dataIndex: "contact", value: "contact" },
  { title: "Email", dataIndex: "email", value: "email" },
  {
    title: "Job Description",
    dataIndex: "position",
    value: "position.name",
    render: (position) => position?.name || "-"
  },
  {
    title: "Promodizer Brand",
    dataIndex: "promodizer_brand",
    value: "promodizer_brand.brand",
    // Was previously a broken column: dataIndex was the literal dotted
    // string "promodizer_brand.brand" (AntD Table does not split a string
    // dataIndex on "." — only an array form nests), so it never resolved
    // to real data. Fixed to match every other nested-relation column in
    // this list (Branch/Company/Department/Division): dataIndex is the
    // top-level relation key, render drills into it. Real bug found and
    // fixed 2026-09-15.
    render: (promodizerBrand) => promodizerBrand?.brand || "-"
  },
  {
    title: "Rank",
    dataIndex: "position",
    value: "position.rank.name",
    render: (position) => position?.rank?.name || "-",
  },
  {
    title: "Department",
    dataIndex: "department",
    value: "department.name",
    render: (department) => department?.name || "-"
  },
  {
    title: "Division",
    dataIndex: "department",
    value: "department.division.name",
    render: (department) => department?.division?.name || "-"
  },
  { title: "Date Employed", dataIndex: "date_employed", value: "date_employed", render: (v) => formatDate(v) },
  { title: "Gender", dataIndex: "gender", value: "gender" },
  { title: "Civil Status", dataIndex: "civil_status", value: "civil_status" },
  { title: "TIN #", dataIndex: "tin_no", value: "tin_no" },
  { title: "Pag-IBIG #", dataIndex: "pagibig_no", value: "pagibig_no" },
  { title: "PhilHealth #", dataIndex: "philhealth_no", value: "philhealth_no" },
  { title: "SSS #", dataIndex: "sss_no", value: "sss_no" },
  { title: "Educ. Attainment", dataIndex: "educ_attain", value: "educ_attain" },
  { title: "School Attended", dataIndex: "school_attended", value: "school_attended" },
  { title: "Course", dataIndex: "course", value: "course" },
  // "Length of Service" (Vue's next column here) is deliberately NOT
  // included — it's a computed SQL alias on the backend
  // (TIMESTAMPDIFF(...) AS length_of_service in getEmployees()), not a
  // real column, and isn't in EmployeeMasterDataController's $table_fields
  // search whitelist. Selecting it would throw the same "Unknown column"
  // error Promodizer Brand did before that fix — needs a backend whitelist
  // entry mapping it to a valid SQL reference before it's safe to add
  // here. See the employee-master-data skill's Roadmap.
  { title: "Employment Type", dataIndex: "employment_type", value: "employment_type" },
  {
    title: "Status",
    dataIndex: "active",
    value: "active",
    // Same colors as the View/Edit Employee card header tag (EmployeeForm.jsx).
    render: (active) => (
      <Tag color={isActiveValue(active) ? "success" : "default"}>{isActiveValue(active) ? "Active" : "Inactive"}</Tag>
    ),
  },
];
// Kept in EMPLOYEE_COLUMNS order (Status is last there), matching the order
// ColumnSelector produces when the user changes the selection.
const DEFAULT_COLUMN_VALUES = [
  "branch.name",
  "employee_code",
  "job_title_code",
  "last_name",
  "first_name",
  "middle_name",
  "position.name",
  "active",
];
export const DEFAULT_EMPLOYEE_COLUMNS = EMPLOYEE_COLUMNS.filter((c) => DEFAULT_COLUMN_VALUES.includes(c.value));
