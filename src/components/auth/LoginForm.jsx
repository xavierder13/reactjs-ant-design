// src/components/auth/LoginForm.jsx

import { useState } from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from '../../api/axiosInstance'
import useAuth from '../../hooks/useAuth'

const { Title } = Typography

const LoginForm = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth, setTokens } = useAuth()

  const onFinish = async (values) => {
    try {
      setLoading(true)

      const { data } = await axios.post('/auth/login', {
        email:    values.email,
        password: values.password,
      })

      console.log(data);
      

      setTokens(data.access_token, data.refresh_token);
      setAuth(
        data.user,
        data.user_roles,        
        data.user_permissions  
      );

      message.success('Login successful!')
      navigate('/')

    } catch (error) {
      message.error(error.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
        Sign In
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Enter a valid email' },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Enter your email"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Password is required' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter your password"
            size="large"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            block
          >
            Sign In
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default LoginForm