import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import EmployeeForm from './components/EmployeeForm';
import useLatestEmployee from '../../hooks/useLatestEmployee';

// There is no single-employee "show/{id}" endpoint on vueportal's
// employee_master_data API, so useLatestEmployee re-reads this employee
// through the list endpoint on every open (incl. a refresh, a direct link,
// or returning here after an immediate save) instead of trusting the row
// the list passed in router state, which goes stale.
const EditEmployee = () => {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee, isLoading } = useLatestEmployee(id, state?.employee);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
  }

  if (!employee) {
    return (
      <Result
        status="info"
        title="Employee not found"
        subTitle="This employee couldn't be loaded. Open them again from the list."
        extra={<Button type="primary" onClick={() => navigate('/employees')}>Back to List</Button>}
      />
    );
  }

  return <EmployeeForm key={employee.id} mode="edit" initialData={employee} />;
};

export default EditEmployee;
