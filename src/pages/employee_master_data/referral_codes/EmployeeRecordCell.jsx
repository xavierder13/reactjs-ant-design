import { Typography } from "antd";
import RecordLink from "../../../components/RecordLink";
import { matchesStage } from "../../recruitment/applicants/applicantStatus";

// "Employee Record" cell for a referred applicant: once the New Hired sync
// put them in Employee Master Data, their employee code opening the profile
// (Back returns to `returnTo`); a hired applicant not synced yet says so.
export default function EmployeeRecordCell({ applicant, canOpen, returnTo }) {
  if (applicant.employee_id) {
    return (
      <RecordLink
        to={canOpen ? `/employees/${applicant.employee_id}` : undefined}
        state={{ returnTo }}
        title="Open employee record"
      >
        {applicant.employee_code}
      </RecordLink>
    );
  }
  return matchesStage(applicant, "Hired") ? <Typography.Text type="secondary">Not synced yet</Typography.Text> : "-";
}
