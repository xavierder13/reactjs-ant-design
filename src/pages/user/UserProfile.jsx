import { useState, useEffect } from 'react';
import { 
  Form,
  Input,
  Button,
  Card,
  Typography,
  Divider,
  Alert,
  Spin,
  message
} from 'antd';
import axiosInstance from '../../api/axiosInstance';
import employeeApi from '../../services/employee/employeeApi';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import EmployeeProfile from '../employee_master_data/profile/EmployeeProfile';
import { LockOutlined } from '@ant-design/icons';

// Name + change-password form (user/update_profile).
const AccountSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if(user)
    {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
      })
    }
  }, [user, form]);

  // Clear password fields when user focuses
  // (same as Vue onFocus — removes dummy placeholder)
  const onPasswordFocus = () => {
    if(!passwordChanged)
    {
      form.setFieldsValue({ password: '', confirmPassword: '' });
    }
  };

  const onPasswordChange = () => {
    const pw = form.getFieldValue('password');
    const cpw = form.getFieldValue('confirmPassword');
    setPasswordChanged(!!(pw || cpw));
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);

      const payload = {
        name: values.name,
        password: passwordChanged ? values.password : '',
        confirm_password: passwordChanged ? values.confirmPassword : ''
      };

      const { data } = await axiosInstance.post(`/user/update_profile/${user.id}`, payload);
      
      if(data.success)
      {
        message.success('Profile updated successfully');
        setPasswordChanged(false);
      }
      else
      {
        // handle Laravel validation errors9
        const fields = Object.keys(data).map((key) => ({
          name: key === 'confirm_password' ? 'confirmPassword' : key,
          errors: Array.isArray(data[key]) ? data[key] : [data[key]],
        }));
        form.setFields(fields);
      }

    } catch (error) {
      message.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false);
    }
  };
return (
    <Card>
      <Typography.Title level={4} style={{ marginBottom: 0 }}>
        Account & Security
      </Typography.Title>
      <Divider />

      <Form
        form={form}
        layout='vertical'
        onFinish={onFinish}
        style={{ maxWidth: 400 }}
      >

        {/* Name */}
        <Form.Item
          name='name'
          label='Full Name'
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input placeholder='Enter your full name' />
        </Form.Item>

        {/* Email - readonly */}
        <Form.Item name='email' label='Email'>
          <Input readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
        </Form.Item>

        {/* Password */}
        <Form.Item
          name='password'
          label='Password'
          rules={[
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password
            placeholder='Leave blank to keep current password'
            onFocus={onPasswordFocus}
            onChange={onPasswordChange}
          />
        </Form.Item>

        {/* Confirm Password */}
        <Form.Item
          name='confirmPassword'
          label='Confirm Password'
          dependencies={['password']}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            placeholder='Confirm new password'
            onFocus={onPasswordFocus}
            onChange={onPasswordChange}
          />
        </Form.Item>

        <Divider />

        {/* Actions */}
        <Form.Item>
          <Button
            type='primary'
            htmlType='submit'
            loading={loading}
            style={{ marginRight: 8 }}
          >
            Save
          </Button>
          <Button onClick={() => navigate('/')}>
            Cancel
          </Button>
        </Form.Item>

      </Form>
    </Card>
  );
};

// /user/profile — when the account is linked to an employee record
// (users.employee_id), shows that employee's profile (shared
// EmployeeProfile, self view) with the account settings as its last tab;
// otherwise just the account settings.
const UserProfile = () => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await employeeApi.myProfile();
        setEmployee(data?.employee || null);
      } catch {
        // fall back to account settings only
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
  }

  if (employee) {
    return (
      <EmployeeProfile
        key={employee.id}
        employee={employee}
        view='self'
        extraTabs={[{ key: 'account', label: 'Account & Security', icon: <LockOutlined />, children: <AccountSettings /> }]}
      />
    );
  }

  return (
    <>
      <Alert
        type='info'
        showIcon
        title='Your account is not linked to an employee record, so there is no employee profile to show.'
        style={{ marginBottom: 16 }}
      />
      <AccountSettings />
    </>
  );
};

export default UserProfile;