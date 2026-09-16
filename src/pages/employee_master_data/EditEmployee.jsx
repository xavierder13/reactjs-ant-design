import { useLocation, useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import EmployeeForm from './components/EmployeeForm';

// There is no single-employee "show/{id}" endpoint on vueportal's
// employee_master_data API (only index/store/update/delete) — this page
// depends on being opened from the list (EmployeeMasterData.jsx passes the
// row via `navigate(path, { state: { employee } })`). A direct link or a
// page refresh loses that state, so it falls back to sending the user back
// to the list rather than guessing at a fetch. See the
// `employee-master-data` skill for the decision and how to revisit it
// (e.g. if a `show/{id}` endpoint is ever added backend-side).
const EditEmployee = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const employee = state?.employee;

  if (!employee) {
    return (
      <Result
        status="info"
        title="Open this employee from the list to edit them"
        subTitle="This page needs the employee record passed from the list — it can't be reached directly or after a refresh yet."
        extra={<Button type="primary" onClick={() => navigate('/employees')}>Back to List</Button>}
      />
    );
  }

  return <EmployeeForm mode="edit" initialData={employee} />;
};

export default EditEmployee;
