import { Space, Tag, Typography } from "antd";

import employeeApi from "../../../services/employee/employeeApi";
import { formatDate } from "../../../utils/formatDate";
import { EMPLOYEE_COLUMNS, DEFAULT_EMPLOYEE_COLUMNS } from "../components/employeeColumns";
import EmployeeSegmentList from "./EmployeeSegmentList";

// vueportal EmployeeForRegularization.vue — active Probationary employees
// employed 150+ days (Sales Specialists excluded), minus those who failed the
// regularization interview (forRegularizationQuery()). Export uses the page's
// own endpoint with the list's current search/branch/position filters.
const exportConfig = {
  request: employeeApi.exportForRegularization,
  filename: "Employee_For_Regularization.xls",
};

// Every row is active, so Status is swapped for Date Employed by default.
const DATE_EMPLOYED = EMPLOYEE_COLUMNS.find((c) => c.value === "date_employed");
const DEFAULT_COLUMNS = DEFAULT_EMPLOYEE_COLUMNS.map((c) => (c.value === "active" ? DATE_EMPLOYED : c));

// Always shown. Failed interviews are excluded server-side, so a row is
// either Passed (regularized automatically once due) or not interviewed yet.
const INTERVIEW_COLUMN = {
  title: "Interview",
  dataIndex: "regularization_interview_status",
  value: "regularization_interview_status",
  render: (status, record) => (status === "Passed" ? (
    <Space size={4}>
      <Tag color="success">Passed</Tag>
      {record?.regularization_interview_date && (
        <Typography.Text type="secondary">{formatDate(record.regularization_interview_date)}</Typography.Text>
      )}
    </Space>
  ) : (
    <Tag>Not yet interviewed</Tag>
  )),
};

export default function ForRegularization() {
  return (
    <EmployeeSegmentList
      title="For Regularization"
      fetchPage={employeeApi.getForRegularization}
      exportConfig={exportConfig}
      positionFilter
      defaultColumns={DEFAULT_COLUMNS}
      extraColumns={[INTERVIEW_COLUMN]}
    />
  );
}
