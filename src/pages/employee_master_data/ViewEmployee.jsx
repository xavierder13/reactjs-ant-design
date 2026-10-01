import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Result, Button, Spin, Space } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import EmployeeProfile from './profile/EmployeeProfile';
import useLatestEmployee from '../../hooks/useLatestEmployee';
import useAuth from '../../hooks/useAuth';

// /employees/:id — the employee's profile (shared EmployeeProfile, HR
// view). Loads the current record via useLatestEmployee (see
// EditEmployee.jsx).
const ViewEmployee = () => {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
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

  const canEdit = hasRole('Administrator') || hasPermission('employee-master-data-edit');

  return (
    <EmployeeProfile
      key={employee.id}
      employee={employee}
      view="hr"
      extra={(
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/employees')}>Back to List</Button>
          {canEdit && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/employees/${employee.id}/edit`, { state: { employee } })}
            >
              Edit
            </Button>
          )}
        </Space>
      )}
    />
  );
};

export default ViewEmployee;
