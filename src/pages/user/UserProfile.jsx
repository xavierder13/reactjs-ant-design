import { useState, useEffect } from 'react';
import { 
  Form,
  Input,
  Button,
  Card,
  Typography,
  Divider,
  message
} from 'antd';
import axiosInstance from '../../api/axiosInstance';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const UserProfile = () => {
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
        confirm_passowrd: passwordChanged ? values.confirmPassword : ''
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
        My Profile
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
          <Button onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
        </Form.Item>

      </Form>
    </Card>
  );
};

export default UserProfile;