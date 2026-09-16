import { useLocation, useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import EmployeeForm from './components/EmployeeForm';

// See EditEmployee.jsx for why this depends on router state instead of
// fetching by id — vueportal has no single-employee "show/{id}" endpoint.
const ViewEmployee = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const employee = state?.employee;

  if (!employee) {
    return (
      <Result
        status="info"
        title="Open this employee from the list to view them"
        subTitle="This page needs the employee record passed from the list — it can't be reached directly or after a refresh yet."
        extra={<Button type="primary" onClick={() => navigate('/employees')}>Back to List</Button>}
      />
    );
  }

  return <EmployeeForm mode="view" initialData={employee} />;
};

export default ViewEmployee;
