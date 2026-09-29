import employeeApi from "../../../services/employee/employeeApi";
import EmployeeSegmentList from "./EmployeeSegmentList";

// vueportal EmployeeForRegularization.vue — active Probationary employees
// employed 150+ days (Sales Specialists excluded). Export uses the page's own
// endpoint with the list's current search/branch filters.
const exportConfig = {
  request: employeeApi.exportForRegularization,
  filename: "Employee_For_Regularization.xls",
};

export default function ForRegularization() {
  return (
    <EmployeeSegmentList
      title="For Regularization"
      fetchPage={employeeApi.getForRegularization}
      exportConfig={exportConfig}
    />
  );
}
