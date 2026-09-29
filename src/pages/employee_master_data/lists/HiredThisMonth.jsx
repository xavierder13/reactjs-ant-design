import dayjs from "dayjs";
import employeeApi from "../../../services/employee/employeeApi";
import EmployeeSegmentList from "./EmployeeSegmentList";

// vueportal EmployeeHiredThisMonth.vue — active employees whose Date Employed
// falls in the current month (Sales Specialists excluded).
//
// Export: vueportal opens its Employee List dialog in "for regularization"
// mode here, so it actually downloads the For Regularization list. This page
// instead pre-fills the same Employee List export with the filters that make
// up this list (Date Employed, 1st of the month → today, Active Only, no
// Sales Specialists), so the file matches what's on screen.
const exportConfig = {
  modal: {
    title: "Employees Hired This Month",
    presetValues: {
      date_field_param: "date_employed",
      document_status: "Active Only",
      date_range: [dayjs().startOf("month"), dayjs()],
    },
    extraPayload: { include_sales_specialist: false },
  },
};

export default function HiredThisMonth() {
  return (
    <EmployeeSegmentList
      title="Employees Hired This Month"
      fetchPage={employeeApi.getHiredThisMonth}
      exportConfig={exportConfig}
    />
  );
}
